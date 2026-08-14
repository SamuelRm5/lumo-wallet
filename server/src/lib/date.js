import { DateTime } from "luxon";
import env from "../config/env.js";

const ZONE = env.APP_TIMEZONE;

// Acepta Date, milisegundos o cadena ISO y devuelve un DateTime en la zona de
// la aplicación. Null si la entrada no es una fecha válida
const toDateTime = input => {
	if (input instanceof Date) {
		return DateTime.fromJSDate(input, { zone: ZONE });
	}
	if (typeof input === "number") {
		return DateTime.fromMillis(input, { zone: ZONE });
	}
	if (typeof input === "string") {
		const parsed = DateTime.fromISO(input, { zone: ZONE });
		return parsed.isValid ? parsed : null;
	}
	return null;
};

export const parseISO = input => {
	const parsed = toDateTime(input);
	return parsed?.isValid ? parsed.toJSDate() : null;
};

/**
 * Inicio del día en la zona de la aplicación.
 * new Date("2025-01-01") es medianoche UTC, que en Bogotá son las 19:00 del
 * día anterior: por eso los rangos se construyen aquí y no con el constructor
 */
export const startOfDay = input => {
	const parsed = toDateTime(input);
	return parsed?.isValid ? parsed.startOf("day").toJSDate() : null;
};

// Fin del día inclusivo. Sin esto un movimiento de las 10 de la mañana del
// último día del rango queda fuera de la búsqueda
export const endOfDay = input => {
	const parsed = toDateTime(input);
	return parsed?.isValid ? parsed.endOf("day").toJSDate() : null;
};

export const now = () => DateTime.now().setZone(ZONE).toJSDate();

export const timezone = ZONE;
