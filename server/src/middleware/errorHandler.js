import { AppError, ERROR_CODES } from "../lib/errors.js";

export const notFoundHandler = (req, res, next) => {
	next(
		new AppError("NOT_FOUND", `La ruta ${req.method} ${req.path} no existe`),
	);
};

// El cuarto argumento es obligatorio: Express reconoce el handler de error por
// su aridad, no por el nombre
export const errorHandler = (error, req, res, next) => {
	const isKnown = error instanceof AppError;
	const code = isKnown ? error.code : "INTERNAL";
	const status = ERROR_CODES[code] ?? 500;

	// De un error inesperado no sale nada al cliente: el mensaje real puede
	// contener nombres de tabla o fragmentos de consulta
	const message =
		isKnown && status < 500
			? error.message
			: "Ocurrió un error interno. Intenta de nuevo";

	const log = req.log ?? console;
	const entry = { err: error.cause ?? error, code };
	if (status >= 500) log.error(entry, error.message);
	else log.warn(entry, error.message);

	res.status(status).json({
		error: {
			code,
			message,
			details: isKnown ? error.details : [],
			requestId: req.id,
		},
	});
};
