// El código es lo que el cliente interpreta; el mensaje es texto en español
// para el usuario final
export const ERROR_CODES = {
	VALIDATION_ERROR: 400,
	UNAUTHENTICATED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	CONFLICT: 409,
	RATE_LIMITED: 429,
	INTERNAL: 500,
};

export class AppError extends Error {
	constructor(code, message, { details = [], cause } = {}) {
		super(message);
		this.name = "AppError";
		this.code = code;
		this.status = ERROR_CODES[code] ?? 500;
		this.details = details;
		if (cause) this.cause = cause;
	}
}

export const validationError = (message, details) =>
	new AppError("VALIDATION_ERROR", message, { details });

export const unauthenticated = message =>
	new AppError("UNAUTHENTICATED", message);

export const forbidden = message => new AppError("FORBIDDEN", message);

export const notFound = message => new AppError("NOT_FOUND", message);

export const conflict = message => new AppError("CONFLICT", message);

// Envuelve un error inesperado conservando el original para el log, sin que
// llegue nada de él al cliente
export const internal = (message, cause) =>
	new AppError("INTERNAL", message, { cause });
