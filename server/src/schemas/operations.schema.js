import { z } from "zod";
import {
	id,
	idParam,
	optionalText,
	pastOrPresentDate,
	rangeEnd,
	rangeStart,
} from "./common.js";

const kind = z.enum(["income", "expense", "transfer", "adjustment"], {
	errorMap: () => ({
		message: "El tipo debe ser income, expense, transfer o adjustment",
	}),
});

// Siempre positivo: la dirección la marca el tipo de operación, nunca el signo
const amount = z.coerce
	.number({ invalid_type_error: "El monto debe ser un número" })
	.positive("El monto debe ser mayor que cero");

const base = {
	amount,
	date: pastOrPresentDate,
	description: optionalText(255),
	categoryId: id.optional(),
	sourceAccountId: id.optional(),
	fromAccountId: id.optional(),
	toAccountId: id.optional(),
	accountId: id.optional(),
	direction: z.enum(["in", "out"]).optional(),
};

/** Los campos que exige cada forma, de docs/BACKEND.md 7.4 */
const requireFields = (data, ctx) => {
	const exigir = (campo, mensaje) => {
		if (data[campo] === undefined || data[campo] === null) {
			ctx.addIssue({ code: "custom", path: [campo], message: mensaje });
		}
	};

	switch (data.kind) {
		case "income":
			exigir("toAccountId", "Un ingreso necesita la cuenta de destino");
			break;
		case "expense":
			exigir("fromAccountId", "Un gasto necesita la cuenta de origen");
			break;
		case "transfer":
			exigir("fromAccountId", "Una transferencia necesita la cuenta de origen");
			exigir("toAccountId", "Una transferencia necesita la cuenta de destino");
			break;
		case "adjustment":
			exigir("accountId", "Un ajuste necesita la cuenta que se ajusta");
			exigir("direction", "Un ajuste necesita saber si suma o resta");
			exigir("description", "Un ajuste necesita un motivo");
			break;
	}
};

export const createOperationSchema = {
	body: z.object({ kind, ...base }).superRefine(requireFields),
};

export const updateOperationSchema = {
	params: idParam("id"),
	body: z.object({ kind: kind.optional(), ...base }).superRefine((data, ctx) => {
		if (data.kind) requireFields(data, ctx);
	}),
};

export const operationIdSchema = { params: idParam("id") };

export const confirmOperationSchema = {
	params: idParam("id"),
	body: z.object({ amount: amount.optional() }),
};

export const listOperationsSchema = {
	query: z.object({
		accountId: id.optional(),
		kind: kind.optional(),
		categoryId: id.optional(),
		status: z.enum(["pending", "confirmed"]).optional(),
		from: rangeStart.optional(),
		to: rangeEnd.optional(),
		search: z.string().max(100).optional(),
		limit: z.coerce.number().int().min(1).max(100).default(20),
		cursor: z.string().optional(),
	}),
};

export const statsSchema = {
	query: z
		.object({
			from: rangeStart,
			to: rangeEnd,
		})
		.refine(data => data.from <= data.to, "from no puede ser posterior a to"),
};
