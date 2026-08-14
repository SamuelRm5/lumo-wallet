import { z } from "zod";
import { idParam, requiredText } from "./common.js";

const kind = z.enum(["income", "expense"], {
	errorMap: () => ({ message: "El tipo debe ser income o expense" }),
});

// Identificador semántico, no el nombre de un set de iconos: web y móvil usan
// librerías distintas y cada una hace su mapeo
const icon = z.string().max(60).nullable().optional();
const color = z
	.string()
	.regex(/^#[0-9a-fA-F]{6}$/, "El color debe ser hexadecimal, como #1A2B3C")
	.nullable()
	.optional();

export const listCategoriesSchema = {
	query: z.object({ kind: kind.optional() }),
};

export const createCategorySchema = {
	body: z.object({ name: requiredText(60, "El nombre"), icon, color, kind }),
};

export const updateCategorySchema = {
	params: idParam("id"),
	body: z
		.object({ name: requiredText(60, "El nombre").optional(), icon, color })
		.refine(
			data => Object.keys(data).length > 0,
			"Envía al menos un campo para actualizar",
		),
};

export const categoryIdSchema = { params: idParam("id") };
