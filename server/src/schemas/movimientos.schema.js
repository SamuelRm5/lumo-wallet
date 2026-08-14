import { z } from "zod";
import {
	dateOnly,
	id,
	idParam,
	optionalText,
	page,
	pastOrPresentDate,
} from "./common.js";

const tipo = z.enum(["ingreso", "egreso"], {
	errorMap: () => ({ message: "El tipo debe ser ingreso o egreso" }),
});

// El monto es estrictamente positivo: la dirección la marca el tipo, nunca el
// signo. Es el invariante de LOGICA_NEGOCIO.md
const monto = z.coerce
	.number({ invalid_type_error: "El monto debe ser un número" })
	.int("El monto no admite decimales")
	.positive("El monto debe ser mayor que cero");

export const movimientoIdSchema = { params: idParam("id") };

export const movimientosByCuentaSchema = {
	params: idParam("cuentaId"),
	query: z.object({ page }),
};

export const dateRangeSchema = {
	query: z
		.object({
			fechaInicio: dateOnly,
			fechaFin: dateOnly,
			cuentaId: id.optional(),
			tipo: tipo.optional(),
			page,
		})
		.refine(
			data => data.fechaInicio <= data.fechaFin,
			"fechaInicio no puede ser posterior a fechaFin",
		),
};

export const createMovimientoSchema = {
	params: idParam("cuentaId"),
	body: z.object({
		tipo,
		monto,
		descripcion: optionalText(255),
		createdAt: pastOrPresentDate.optional(),
	}),
};

export const updateMovimientoSchema = {
	params: idParam("id"),
	body: z
		.object({
			tipo: tipo.optional(),
			monto: monto.optional(),
			descripcion: optionalText(255),
			createdAt: pastOrPresentDate.optional(),
		})
		.refine(
			data => Object.keys(data).length > 0,
			"Envía al menos un campo para actualizar",
		),
};
