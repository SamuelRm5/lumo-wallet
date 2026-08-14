import { DateTime } from "luxon";
import prisma from "../config/prisma.js";
import { notFound, validationError } from "../lib/errors.js";
import { timezone } from "../lib/date.js";

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
	const inicio = DateTime.fromJSDate(rule.startDate, { zone: timezone }).startOf(
		"day",
	);
	const limite = DateTime.fromJSDate(desde, { zone: timezone }).startOf("day");

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

	if (rule.endDate) {
		const fin = DateTime.fromJSDate(rule.endDate, { zone: timezone }).endOf("day");
		if (fecha > fin) return null;
	}

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
	data.nextRunAt = nextOccurrence(data, new Date());

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
			nextRunAt: nextOccurrence(merged, new Date()),
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
