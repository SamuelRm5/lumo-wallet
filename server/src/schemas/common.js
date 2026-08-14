import { z } from "zod";

const HOURS_24_MS = 24 * 60 * 60 * 1000;

export const id = z.coerce
	.number({ invalid_type_error: "Debe ser un número entero" })
	.int("Debe ser un número entero")
	.positive("Debe ser mayor que cero");

export const idParam = name => z.object({ [name]: id });

export const page = z.coerce
	.number()
	.int("La página debe ser un número entero")
	.min(1, "La página empieza en 1")
	.default(1);

export const optionalText = max =>
	z
		.string()
		.max(max, `No puede superar los ${max} caracteres`)
		.nullable()
		.optional();

export const requiredText = (max, label) =>
	z
		.string({ required_error: `${label} es obligatorio` })
		.trim()
		.min(1, `${label} no puede estar vacío`)
		.max(max, `${label} no puede superar los ${max} caracteres`);

/**
 * Fecha ISO que no puede estar más de 24 horas en el futuro. La manda el
 * cliente y puede venir de un reloj desajustado; sin este tope se puede grabar
 * un movimiento en el año 3000.
 */
export const pastOrPresentDate = z
	.string()
	.datetime({ offset: true, message: "Debe ser una fecha ISO con zona horaria" })
	.refine(
		value => new Date(value).getTime() <= Date.now() + HOURS_24_MS,
		"La fecha no puede estar a más de 24 horas en el futuro",
	);

// Fecha sin hora, para los rangos de búsqueda
export const dateOnly = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: 2025-01-01");
