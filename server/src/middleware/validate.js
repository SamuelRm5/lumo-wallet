import { validationError } from "../lib/errors.js";

const SOURCES = ["body", "params", "query"];

/**
 * Valida las partes indicadas de la petición contra sus esquemas zod y
 * reemplaza el valor original por el ya normalizado: zod convierte los enteros
 * que llegan como cadena, de modo que el controlador nunca vuelve a hacer
 * parseInt.
 */
export const validate = schemas => (req, res, next) => {
	const details = [];

	for (const source of SOURCES) {
		const schema = schemas[source];
		if (!schema) continue;

		const result = schema.safeParse(req[source]);

		if (result.success) {
			// req.query es de solo lectura en Express 5, por eso se asigna
			// propiedad a propiedad en vez de reemplazar el objeto
			Object.assign(req[source], result.data);
			continue;
		}

		details.push(
			...result.error.issues.map(issue => ({
				path: [source, ...issue.path].join("."),
				message: issue.message,
			})),
		);
	}

	if (details.length > 0) {
		return next(validationError("Los datos enviados no son válidos", details));
	}

	next();
};
