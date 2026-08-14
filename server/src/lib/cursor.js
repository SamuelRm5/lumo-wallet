import { validationError } from "./errors.js";

/**
 * Cursor de paginación: base64 de `${date}|${id}`.
 * Se pagina por cursor y no por offset porque con offset, insertar una
 * operación mientras el usuario hace scroll duplica o salta filas.
 */
export const encodeCursor = ({ date, id }) =>
	Buffer.from(`${new Date(date).toISOString()}|${id}`, "utf8").toString(
		"base64url",
	);

export const decodeCursor = cursor => {
	const [date, id] = Buffer.from(cursor, "base64url")
		.toString("utf8")
		.split("|");

	const parsed = new Date(date);
	const numericId = Number(id);

	if (Number.isNaN(parsed.getTime()) || !Number.isInteger(numericId)) {
		throw validationError("El cursor no es válido");
	}

	return { date: parsed, id: numericId };
};

/**
 * Filtro para traer lo que va después del cursor con el orden
 * (date DESC, id DESC). El desempate por id es obligatorio: sin él, dos
 * operaciones del mismo instante pueden repetirse o perderse entre páginas.
 */
export const cursorFilter = ({ date, id }) => ({
	OR: [{ date: { lt: date } }, { date, id: { lt: id } }],
});
