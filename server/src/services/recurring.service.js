import { DateTime } from "luxon";
import prisma from "../config/prisma.js";
import env from "../config/env.js";
import { createOperation } from "./operations.service.js";
import { logger } from "../middleware/requestLogger.js";
import { notFound, validationError } from "../lib/errors.js";
import { fromPlainDate, plainDate, today } from "../lib/date.js";

const STEP = {
	weekly: { weeks: 1 },
	biweekly: { weeks: 2 },
	monthly: { months: 1 },
	yearly: { years: 1 },
};

/**
 * Siguiente ocurrencia igual o posterior a `desde`. En las mensuales el día se
 * recorta al último del mes: una regla del 31 cae el 28 en febrero, no se
 * desborda a marzo.
 */
export const nextOccurrence = (rule, desde) => {
	const inicio = plainDate(rule.startDate).startOf("day");
	const limite = plainDate(desde).startOf("day");

	let fecha = inicio;
	if (rule.frequency === "monthly" || rule.frequency === "yearly") {
		if (rule.dayOfMonth) {
			fecha = fecha.set({ day: Math.min(rule.dayOfMonth, fecha.daysInMonth) });
			if (fecha < inicio) fecha = fecha.plus(STEP[rule.frequency]);
		}
	} else if (rule.dayOfWeek) {
		const delta = (rule.dayOfWeek - fecha.weekday + 7) % 7;
		fecha = fecha.plus({ days: delta });
	}

	let guardia = 0;
	while (fecha < limite && guardia < 1000) {
		fecha = fecha.plus(STEP[rule.frequency]);
		if (rule.dayOfMonth && STEP[rule.frequency].months) {
			fecha = fecha.set({ day: Math.min(rule.dayOfMonth, fecha.daysInMonth) });
		}
		guardia += 1;
	}

	if (rule.endDate && fecha > plainDate(rule.endDate)) return null;

	return fecha.toJSDate();
};

const validateAccounts = async (userId, input) => {
	const ids = [input.sourceAccountId, input.fromAccountId, input.toAccountId].filter(
		id => id !== undefined && id !== null,
	);

	if (ids.length > 0) {
		const found = await prisma.account.count({
			where: { id: { in: [...new Set(ids)] }, userId },
		});
		if (found !== new Set(ids).size) {
			throw notFound("Alguna de las cuentas no existe o no es tuya");
		}
	}

	if (input.categoryId) {
		const category = await prisma.category.findFirst({
			where: { id: input.categoryId, userId },
		});
		if (!category) throw notFound("La categoría no existe o no es tuya");
	}

	// Las mismas formas que una operación: una transferencia no toca la fuente
	if (input.kind === "transfer" && input.sourceAccountId) {
		throw validationError("Una transferencia recurrente no lleva cuenta fuente");
	}
};

export const listRules = userId =>
	prisma.recurringRule.findMany({
		where: { userId },
		orderBy: [{ nextRunAt: "asc" }, { name: "asc" }],
	});

// Las columnas de fecha son DATE: llegan como texto y hay que convertirlas
const withDates = input => ({
	...input,
	...(input.startDate !== undefined && { startDate: new Date(input.startDate) }),
	...(input.endDate !== undefined && {
		endDate: input.endDate ? new Date(input.endDate) : null,
	}),
});

export const createRule = async (userId, input) => {
	await validateAccounts(userId, input);

	const data = { ...withDates(input), userId };
	data.nextRunAt = nextOccurrence(data, today());

	return prisma.recurringRule.create({ data });
};

export const updateRule = async (userId, id, input) => {
	const existing = await prisma.recurringRule.findFirst({ where: { id, userId } });
	if (!existing) throw notFound("La regla no existe o no es tuya");

	await validateAccounts(userId, { ...existing, ...input });

	const merged = { ...existing, ...withDates(input) };

	// Editar la regla no reescribe las operaciones ya generadas, solo cambia
	// lo que se generará de aquí en adelante
	return prisma.recurringRule.update({
		where: { id },
		data: {
			...withDates(input),
			nextRunAt: nextOccurrence(merged, today()),
		},
	});
};

export const deleteRule = async (userId, id) => {
	const existing = await prisma.recurringRule.findFirst({ where: { id, userId } });
	if (!existing) throw notFound("La regla no existe o no es tuya");

	await prisma.recurringRule.update({
		where: { id },
		data: { deletedAt: new Date() },
	});
};

/**
 * La operación que corresponde a una ocurrencia. En modo recordatorio queda
 * pendiente y no mueve saldos hasta que el usuario la confirma con el monto
 * definitivo; en modo automático se registra confirmada.
 */
const occurrenceInput = (rule, scheduled) => ({
	kind: rule.kind,
	amount: rule.amount,
	categoryId: rule.categoryId ?? undefined,
	sourceAccountId: rule.sourceAccountId ?? undefined,
	fromAccountId: rule.fromAccountId ?? undefined,
	toAccountId: rule.toAccountId ?? undefined,
	date: fromPlainDate(scheduled),
	description: rule.name,
	status: rule.mode === "auto" ? "confirmed" : "pending",
	origin: "recurring",
	recurringRuleId: rule.id,
	scheduledDate: scheduled,
});

const generateOccurrence = async (rule, scheduled) => {
	try {
		return await createOperation(rule.userId, occurrenceInput(rule, scheduled));
	} catch (error) {
		// El índice único [recurringRuleId, scheduledDate] es lo que hace que el
		// job se pueda repetir. Comprobar antes con un findFirst deja una carrera
		// entre la comprobación y la escritura
		if (error?.code === "P2002") return null;
		throw error;
	}
};

const dayAfter = date => plainDate(date).plus({ days: 1 }).toJSDate();

/**
 * Recorre las reglas vencidas y genera lo que falte hasta hoy. Si el servidor
 * estuvo caído se recuperan todas las ocurrencias atrasadas, no solo la última,
 * con un tope por regla para que una fecha de inicio antigua no produzca cientos
 * de operaciones de golpe.
 *
 * Lo que quede por encima del tope no se pierde: `nextRunAt` se deja apuntando a
 * la primera ocurrencia sin generar y la siguiente ejecución continúa por ahí.
 */
export const runDueRules = async ({
	reference = new Date(),
	maxCatchUp = env.RECURRING_MAX_CATCHUP,
	onGenerated,
} = {}) => {
	const limit = today(reference);

	const rules = await prisma.recurringRule.findMany({
		where: { nextRunAt: { not: null, lte: limit } },
	});

	const summary = { rules: rules.length, created: 0, skipped: 0, failed: 0 };

	for (const rule of rules) {
		let scheduled = rule.nextRunAt;
		let generadas = 0;

		try {
			while (scheduled && scheduled <= limit && generadas < maxCatchUp) {
				const operation = await generateOccurrence(rule, scheduled);

				if (operation) {
					summary.created += 1;
					await onGenerated?.(rule, operation);
				} else {
					summary.skipped += 1;
				}

				generadas += 1;
				scheduled = nextOccurrence(rule, dayAfter(scheduled));
			}

			await prisma.recurringRule.update({
				where: { id: rule.id },
				data: { nextRunAt: scheduled },
			});
		} catch (error) {
			// Una regla con una cuenta borrada no puede detener a las demás:
			// se deja su nextRunAt intacto para reintentarla mañana
			summary.failed += 1;
			logger.error(
				{ err: error, ruleId: rule.id, userId: rule.userId },
				"No se pudo generar la ocurrencia de una regla recurrente",
			);
		}
	}

	return summary;
};
