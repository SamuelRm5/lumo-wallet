import { Prisma } from "@prisma/client";
import prisma from "../config/prisma.js";
import { conflict, notFound, validationError } from "../lib/errors.js";
import { cursorFilter, encodeCursor } from "../lib/cursor.js";

/**
 * Los dos asientos que genera cada forma de operación, con el signo ya
 * aplicado. El cliente nunca envía asientos.
 *
 * Los dos asientos NO suman cero entre sí salvo en las transferencias: en un
 * ingreso ambos son entradas y en un gasto ambos son salidas. Lo que suma cero
 * es su contribución a la ecuación, porque las cuentas source cuentan con
 * signo invertido.
 */
const composeEntries = (input, amount) => {
	const positive = amount;
	const negative = amount.neg();

	switch (input.kind) {
		case "income":
			return [
				{ accountId: input.sourceAccountId, amount: positive },
				{ accountId: input.toAccountId, amount: positive },
			];
		case "expense":
			return [
				{ accountId: input.sourceAccountId, amount: negative },
				{ accountId: input.fromAccountId, amount: negative },
			];
		case "transfer":
			return [
				{ accountId: input.fromAccountId, amount: negative },
				{ accountId: input.toAccountId, amount: positive },
			];
		case "adjustment": {
			// direction es un campo de entrada, no una columna: dice si el
			// ajuste suma o resta y de ahí sale el signo de los dos asientos
			const signed = input.direction === "in" ? positive : negative;
			return [
				{ accountId: input.sourceAccountId, amount: signed },
				{ accountId: input.accountId, amount: signed },
			];
		}
		default:
			throw validationError(`Tipo de operación desconocido: ${input.kind}`);
	}
};

/**
 * La contribución de un asiento a la ecuación de control, invertida si la
 * cuenta es de tipo source. La operación es válida si suman cero, y se
 * verifica antes de escribir.
 */
const contribution = (entry, account) =>
	account.type === "source" ? entry.amount.neg() : entry.amount;

const assertEquationHolds = (entries, accountsById) => {
	const total = entries.reduce(
		(sum, entry) => sum.plus(contribution(entry, accountsById.get(entry.accountId))),
		new Prisma.Decimal(0),
	);

	if (!total.isZero()) {
		throw validationError(
			"La operación rompe la ecuación de control y no se puede registrar",
		);
	}
};

/** Las cuentas involucradas, verificando que sean del usuario y estén vivas */
const loadAccounts = async (db, userId, ids) => {
	const unique = [...new Set(ids.filter(id => id !== undefined && id !== null))];

	const accounts = await db.account.findMany({
		where: { id: { in: unique }, userId },
	});

	if (accounts.length !== unique.length) {
		throw notFound("Alguna de las cuentas no existe o no es tuya");
	}

	return new Map(accounts.map(account => [account.id, account]));
};

/**
 * Si el usuario tiene una sola cuenta source, no se le pregunta a cuál imputar.
 * Con varias, el campo es obligatorio.
 */
const resolveSourceAccountId = async (db, userId, provided) => {
	if (provided !== undefined && provided !== null) return provided;

	const sources = await db.account.findMany({
		where: { userId, type: "source" },
		select: { id: true },
		take: 2,
	});

	if (sources.length === 0) {
		throw validationError("No tienes ninguna cuenta de tipo fuente");
	}
	if (sources.length > 1) {
		throw validationError(
			"Tienes varias cuentas fuente: indica a cuál se imputa con sourceAccountId",
		);
	}

	return sources[0].id;
};

const NEEDS_SOURCE = new Set(["income", "expense", "adjustment"]);

/** Las validaciones de escritura de docs/BACKEND.md 6.3 */
const validate = (input, accountsById) => {
	const involved = [...new Set(
		[
			input.sourceAccountId,
			input.fromAccountId,
			input.toAccountId,
			input.accountId,
		].filter(id => id !== undefined && id !== null),
	)];

	if (involved.length !== 2) {
		throw validationError(
			"Una operación involucra exactamente dos cuentas distintas",
		);
	}

	const typeOf = id => accountsById.get(id).type;

	if (input.kind === "transfer") {
		if (typeOf(input.fromAccountId) === "source" || typeOf(input.toAccountId) === "source") {
			throw validationError(
				"Una transferencia no puede tocar una cuenta fuente: no es consumo, solo cambia la plata de lugar",
			);
		}
	}

	if (input.kind === "income" && typeOf(input.toAccountId) !== "cash") {
		throw validationError("Un ingreso solo puede entrar a un depósito");
	}

	if (input.kind === "expense") {
		const origen = typeOf(input.fromAccountId);
		if (origen !== "cash" && origen !== "liability") {
			throw validationError(
				"Un gasto solo puede salir de un depósito o de una cuenta de crédito",
			);
		}
	}

	if (input.kind === "adjustment" && !input.description?.trim()) {
		throw validationError("Un ajuste necesita un motivo");
	}

	if (NEEDS_SOURCE.has(input.kind) && typeOf(input.sourceAccountId) !== "source") {
		throw validationError("sourceAccountId debe ser una cuenta de tipo fuente");
	}
};

const validateCategory = async (db, userId, categoryId, kind) => {
	if (categoryId === undefined || categoryId === null) return null;

	if (kind === "transfer" || kind === "adjustment") {
		throw validationError(
			"Las transferencias y los ajustes no llevan categoría",
		);
	}

	const category = await db.category.findFirst({
		where: { id: categoryId, userId },
	});

	if (!category) throw notFound("La categoría no existe o no es tuya");
	if (category.kind !== kind) {
		throw validationError(
			`La categoría es de tipo ${category.kind} y la operación es de tipo ${kind}`,
		);
	}

	return category.id;
};

const OPERATION_SHAPE = {
	include: {
		category: { select: { id: true, name: true, icon: true, color: true } },
		entries: {
			select: {
				accountId: true,
				amount: true,
				account: { select: { name: true } },
			},
		},
	},
};

const present = operation => ({
	...operation,
	entries: operation.entries.map(({ account, ...entry }) => ({
		...entry,
		accountName: account.name,
	})),
});

/** Prepara y valida todo lo que hace falta para escribir, sin escribir nada */
const prepare = async (db, userId, input) => {
	const amount = new Prisma.Decimal(input.amount);

	if (amount.lessThanOrEqualTo(0)) {
		throw validationError("El monto debe ser mayor que cero");
	}

	const resolved = {
		...input,
		sourceAccountId: NEEDS_SOURCE.has(input.kind)
			? await resolveSourceAccountId(db, userId, input.sourceAccountId)
			: undefined,
	};

	const accountsById = await loadAccounts(db, userId, [
		resolved.sourceAccountId,
		resolved.fromAccountId,
		resolved.toAccountId,
		resolved.accountId,
	]);

	validate(resolved, accountsById);

	const categoryId = await validateCategory(
		db,
		userId,
		resolved.categoryId,
		resolved.kind,
	);

	const entries = composeEntries(resolved, amount);
	assertEquationHolds(entries, accountsById);

	return { amount, categoryId, entries, resolved };
};

/**
 * Escribe la operación con el cliente que se le pase, que puede ser una
 * transacción abierta por otro servicio. La conciliación lo necesita para
 * crear su ajuste y actualizar lastReconciledAt en un solo bloque.
 */
export const createOperationWith = async (db, userId, input) => {
	const { amount, categoryId, entries, resolved } = await prepare(db, userId, input);

	const operation = await db.operation.create({
		data: {
			userId,
			kind: resolved.kind,
			amount,
			categoryId,
			date: new Date(resolved.date),
			description: resolved.description ?? null,
			status: resolved.status ?? "confirmed",
			origin: resolved.origin ?? "manual",
			idempotencyKey: resolved.idempotencyKey ?? null,
			recurringRuleId: resolved.recurringRuleId ?? null,
			scheduledDate: resolved.scheduledDate ?? null,
			entries: { create: entries },
		},
		...OPERATION_SHAPE,
	});

	return present(operation);
};

// Operación y asientos se escriben juntos o no se escribe ninguno
export const createOperation = (userId, input) =>
	prisma.$transaction(tx => createOperationWith(tx, userId, input));

/**
 * Busca una operación ya creada con esa clave de idempotencia. En red móvil un
 * POST puede expirar por timeout habiéndose aplicado, y sin esto el reintento
 * del cliente duplica el gasto.
 */
export const findByIdempotencyKey = async (userId, idempotencyKey) => {
	const previa = await prisma.operation.findFirst({
		where: { userId, idempotencyKey },
		...OPERATION_SHAPE,
	});

	return previa ? present(previa) : null;
};

export const updateOperation = async (userId, id, input) => {
	const existing = await prisma.operation.findFirst({ where: { id, userId } });
	if (!existing) throw notFound("La operación no existe o no es tuya");

	const { amount, categoryId, entries, resolved } = await prepare(prisma, userId, {
		...input,
		kind: input.kind ?? existing.kind,
	});

	// Editar reemplaza los dos asientos: nunca puede quedar media operación viva
	return prisma.$transaction(async tx => {
		await tx.entry.deleteMany({ where: { operationId: id } });

		const operation = await tx.operation.update({
			where: { id },
			data: {
				kind: resolved.kind,
				amount,
				categoryId,
				date: new Date(resolved.date),
				description: resolved.description ?? null,
				entries: { create: entries },
			},
			...OPERATION_SHAPE,
		});

		return present(operation);
	});
};

export const deleteOperation = async (userId, id) => {
	const existing = await prisma.operation.findFirst({ where: { id, userId } });
	if (!existing) throw notFound("La operación no existe o no es tuya");

	await prisma.operation.update({
		where: { id },
		data: { deletedAt: new Date() },
	});
};

export const confirmOperation = async (userId, id, amount) => {
	const existing = await prisma.operation.findFirst({ where: { id, userId } });
	if (!existing) throw notFound("La operación no existe o no es tuya");
	if (existing.status === "confirmed") {
		throw conflict("La operación ya estaba confirmada");
	}

	// El monto de un recordatorio es editable al confirmarlo: para eso existe
	if (amount === undefined) {
		const operation = await prisma.operation.update({
			where: { id },
			data: { status: "confirmed" },
			...OPERATION_SHAPE,
		});
		return present(operation);
	}

	const nuevo = new Prisma.Decimal(amount);
	if (nuevo.lessThanOrEqualTo(0)) {
		throw validationError("El monto debe ser mayor que cero");
	}

	const factor = nuevo.dividedBy(existing.amount);

	return prisma.$transaction(async tx => {
		const entries = await tx.entry.findMany({ where: { operationId: id } });

		for (const entry of entries) {
			await tx.entry.update({
				where: { id: entry.id },
				data: { amount: entry.amount.times(factor) },
			});
		}

		const operation = await tx.operation.update({
			where: { id },
			data: { amount: nuevo, status: "confirmed" },
			...OPERATION_SHAPE,
		});

		return present(operation);
	});
};

export const getOperation = async (userId, id) => {
	const operation = await prisma.operation.findFirst({
		where: { id, userId },
		...OPERATION_SHAPE,
	});

	if (!operation) throw notFound("La operación no existe o no es tuya");

	return present(operation);
};

export { present, OPERATION_SHAPE };

const OPERATION_LIST_SHAPE = {
	select: {
		id: true,
		kind: true,
		amount: true,
		date: true,
		description: true,
		status: true,
		origin: true,
		category: { select: { id: true, name: true, icon: true, color: true } },
		entries: {
			select: {
				accountId: true,
				amount: true,
				account: { select: { name: true } },
			},
		},
	},
};

/**
 * Listado paginado por cursor. Con offset, insertar una operación mientras el
 * usuario hace scroll duplica o salta filas.
 */
export const listOperations = async (userId, filters) => {
	const { limit, cursor, accountId, kind, categoryId, status, from, to, search } =
		filters;

	const where = {
		userId,
		...(kind && { kind }),
		...(status && { status }),
		...(categoryId && { categoryId }),
		...(accountId && { entries: { some: { accountId } } }),
		...((from || to) && {
			date: { ...(from && { gte: from }), ...(to && { lte: to }) },
		}),
		...(search && { description: { contains: search } }),
		...(cursor && cursorFilter(cursor)),
	};

	// Se pide uno de más para saber si hay página siguiente sin contar el total
	const rows = await prisma.operation.findMany({
		where,
		orderBy: [{ date: "desc" }, { id: "desc" }],
		take: limit + 1,
		...OPERATION_LIST_SHAPE,
	});

	const hasMore = rows.length > limit;
	const data = (hasMore ? rows.slice(0, limit) : rows).map(present);
	const last = data.at(-1);

	return {
		data,
		meta: {
			nextCursor: hasMore && last ? encodeCursor(last) : null,
			hasMore,
		},
	};
};

/**
 * Agregados para los reportes. Las tres reglas de LOGICA_NEGOCIO.md 11:
 * solo asientos de cuentas que no son source, para no contar cada operación
 * dos veces; fuera las transferencias, que no son consumo; y los ajustes en
 * línea propia, que no son lo mismo que "sin categoría".
 */
export const operationStats = async (userId, { from, to }) => {
	const rows = await prisma.$queryRaw`
		SELECT o.kind AS kind,
		       o.categoryId AS categoryId,
		       c.name AS categoryName,
		       DATE_FORMAT(o.date, '%Y-%m') AS month,
		       SUM(e.amount) AS signedTotal
		FROM entries e
		JOIN operations o ON o.id = e.operationId
		JOIN accounts a ON a.id = e.accountId
		LEFT JOIN categories c ON c.id = o.categoryId
		WHERE o.userId = ${userId}
		  AND o.deletedAt IS NULL
		  AND o.status = 'confirmed'
		  AND o.kind <> 'transfer'
		  AND a.type <> 'source'
		  AND o.date >= ${from}
		  AND o.date <= ${to}
		GROUP BY o.kind, o.categoryId, c.name, month`;

	let income = 0;
	let expense = 0;
	let adjustments = 0;
	const byCategory = new Map();
	const byMonth = new Map();

	for (const row of rows) {
		const signed = Number(row.signedTotal);
		const month = byMonth.get(row.month) ?? {
			month: row.month,
			income: 0,
			expense: 0,
			adjustments: 0,
		};

		if (row.kind === "income") {
			income += signed;
			month.income += signed;
		} else if (row.kind === "expense") {
			// El asiento de la cuenta que no es source viene en negativo
			expense += -signed;
			month.expense += -signed;
		} else {
			adjustments += signed;
			month.adjustments += signed;
		}

		byMonth.set(row.month, month);

		// Los ajustes van en línea propia, fuera del desglose: no tienen
		// categoría y meterlos ahí crearía una categoría fantasma
		if (row.kind === "adjustment") continue;

		const key = `${row.kind}:${row.categoryId ?? "null"}`;
		const entry = byCategory.get(key) ?? {
			categoryId: row.categoryId,
			name: row.categoryName ?? "Sin categoría",
			kind: row.kind,
			total: 0,
		};
		entry.total += row.kind === "income" ? signed : -signed;
		byCategory.set(key, entry);
	}

	return {
		from,
		to,
		income,
		expense,
		adjustments,
		net: income - expense + adjustments,
		byCategory: [...byCategory.values()].sort((a, b) => b.total - a.total),
		byMonth: [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month)),
	};
};
