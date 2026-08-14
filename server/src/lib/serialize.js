import { Prisma } from "@prisma/client";

const isDecimal = value => value instanceof Prisma.Decimal;

export const toNumber = value => (isDecimal(value) ? value.toNumber() : value);

/**
 * Convierte los Decimal de Prisma a número antes de que el objeto llegue a
 * res.json(). Un Decimal serializado tal cual sale como {s,e,d} y rompe al
 * cliente en silencio, sin error en el servidor.
 * Las fechas se dejan intactas: res.json() ya las emite en ISO.
 */
export const serialize = value => {
	if (isDecimal(value)) return value.toNumber();
	if (value instanceof Date || value === null) return value;
	if (Array.isArray(value)) return value.map(serialize);
	if (typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [key, serialize(item)]),
		);
	}
	return value;
};
