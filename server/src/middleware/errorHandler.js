import { AppError, ERROR_CODES } from "../lib/errors.js";

// Códigos conocidos de Prisma. El resto cae en INTERNAL y no se detalla al
// cliente, que es donde se filtrarían nombres de tabla o de columna
const PRISMA_ERRORS = {
	P2002: {
		code: "CONFLICT",
		message: "Ya existe un registro con esos datos",
	},
	P2003: {
		code: "VALIDATION_ERROR",
		message: "El registro referenciado no existe",
	},
	P2025: {
		code: "NOT_FOUND",
		message: "El registro no existe",
	},
};

export const notFoundHandler = (req, res, next) => {
	next(
		new AppError("NOT_FOUND", `La ruta ${req.method} ${req.path} no existe`),
	);
};

const translate = error => {
	if (error instanceof AppError) return error;

	const known = PRISMA_ERRORS[error?.code];
	if (known) {
		return new AppError(known.code, known.message, { cause: error });
	}

	return new AppError("INTERNAL", "Ocurrió un error interno. Intenta de nuevo", {
		cause: error,
	});
};

// El cuarto argumento es obligatorio: Express reconoce el handler de error por
// su aridad, no por el nombre
export const errorHandler = (error, req, res, next) => {
	const appError = translate(error);
	const status = ERROR_CODES[appError.code] ?? 500;

	const log = req.log ?? console;
	const entry = { err: appError.cause ?? appError, code: appError.code };
	if (status >= 500) log.error(entry, appError.message);
	else log.warn(entry, appError.message);

	res.status(status).json({
		error: {
			code: appError.code,
			message: appError.message,
			details: appError.details,
			requestId: req.id,
		},
	});
};
