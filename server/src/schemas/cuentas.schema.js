import { z } from "zod";
import { idParam, optionalText, requiredText } from "./common.js";

// Los nombres siguen en español porque el esquema de base todavía lo está;
// pasan a source, cash, receivable y liability en la Fase 3
const tipo = z.enum(["normal", "deuda", "fuente"], {
	errorMap: () => ({ message: "El tipo debe ser normal, deuda o fuente" }),
});

export const cuentaIdSchema = { params: idParam("id") };

export const cuentasByTipoSchema = { params: z.object({ tipo }) };

export const createCuentaSchema = {
	body: z.object({
		nombre: requiredText(100, "El nombre"),
		descripcion: optionalText(255),
		tipo,
	}),
};

export const updateCuentaSchema = {
	params: idParam("id"),
	body: z
		.object({
			nombre: requiredText(100, "El nombre").optional(),
			descripcion: optionalText(255),
			tipo: tipo.optional(),
		})
		.refine(
			data => Object.keys(data).length > 0,
			"Envía al menos un campo para actualizar",
		),
};
