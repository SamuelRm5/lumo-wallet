import { z } from "zod";
import { id, idParam, requiredText } from "./common.js";

const kind = z.enum(["income", "expense", "transfer"], {
	errorMap: () => ({ message: "El tipo debe ser income, expense o transfer" }),
});

const frequency = z.enum(["weekly", "biweekly", "monthly", "yearly"], {
	errorMap: () => ({
		message: "La frecuencia debe ser weekly, biweekly, monthly o yearly",
	}),
});

const mode = z.enum(["auto", "reminder"], {
	errorMap: () => ({ message: "El modo debe ser auto o reminder" }),
});

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: 2026-01-31");

const shape = {
	name: requiredText(100, "El nombre"),
	kind,
	amount: z.coerce.number().positive("El monto debe ser mayor que cero"),
	categoryId: id.optional(),
	sourceAccountId: id.optional(),
	fromAccountId: id.optional(),
	toAccountId: id.optional(),
	frequency,
	dayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
	dayOfWeek: z.coerce.number().int().min(1).max(7).optional(),
	startDate: day,
	endDate: day.optional(),
	mode,
};

// Las mensuales necesitan día del mes y las semanales día de la semana; sin eso
// no hay forma de saber cuándo toca
const requireDayField = (data, ctx) => {
	const semanal = data.frequency === "weekly" || data.frequency === "biweekly";
	const campo = semanal ? "dayOfWeek" : "dayOfMonth";

	if (data[campo] === undefined) {
		ctx.addIssue({
			code: "custom",
			path: [campo],
			message: semanal
				? "Una regla semanal necesita el día de la semana"
				: "Una regla mensual o anual necesita el día del mes",
		});
	}

	if (data.endDate && data.endDate < data.startDate) {
		ctx.addIssue({
			code: "custom",
			path: ["endDate"],
			message: "La fecha de fin no puede ser anterior a la de inicio",
		});
	}
};

export const createRuleSchema = {
	body: z.object(shape).superRefine(requireDayField),
};

export const updateRuleSchema = {
	params: idParam("id"),
	body: z
		.object(
			Object.fromEntries(
				Object.entries(shape).map(([key, schema]) => [key, schema.optional()]),
			),
		)
		.refine(
			data => Object.keys(data).length > 0,
			"Envía al menos un campo para actualizar",
		),
};

export const ruleIdSchema = { params: idParam("id") };
