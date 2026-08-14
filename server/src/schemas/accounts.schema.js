import { z } from "zod";
import { id, idParam, optionalText, requiredText } from "./common.js";

const type = z.enum(["source", "cash", "receivable", "liability"], {
	errorMap: () => ({
		message: "El tipo debe ser source, cash, receivable o liability",
	}),
});

const amount = z.coerce.number({
	invalid_type_error: "Debe ser un número",
});

export const listAccountsSchema = {
	query: z.object({ type: type.optional() }),
};

export const accountIdSchema = { params: idParam("id") };

export const createAccountSchema = {
	body: z.object({
		name: requiredText(100, "El nombre"),
		description: optionalText(255),
		type,
	}),
};

export const updateAccountSchema = {
	params: idParam("id"),
	body: z
		.object({
			name: requiredText(100, "El nombre").optional(),
			description: optionalText(255),
			type: type.optional(),
		})
		.refine(
			data => Object.keys(data).length > 0,
			"Envía al menos un campo para actualizar",
		),
};

export const deleteAccountSchema = {
	params: idParam("id"),
	query: z.object({
		force: z
			.enum(["true", "false"])
			.default("false")
			.transform(value => value === "true"),
	}),
};

export const reconcileSchema = {
	params: idParam("id"),
	body: z.object({
		// Puede ser negativo: una tarjeta de crédito con deuda tiene saldo
		// negativo y es información, no un error
		realBalance: amount,
		date: z
			.string()
			.datetime({ offset: true, message: "Debe ser una fecha ISO con zona horaria" })
			.optional(),
		sourceAccountId: id.optional(),
	}),
};
