import env from "../config/env.js";
import { upgradeRequired } from "../lib/errors.js";

const parse = value => {
	const parts = String(value).trim().split(".");
	if (parts.length === 0 || parts.length > 3) return null;

	const numbers = parts.map(part => Number.parseInt(part, 10));
	return numbers.some(Number.isNaN) ? null : numbers;
};

const isOlder = (version, minimum) => {
	for (let i = 0; i < 3; i += 1) {
		const a = version[i] ?? 0;
		const b = minimum[i] ?? 0;
		if (a !== b) return a < b;
	}
	return false;
};

/**
 * Actualizar una app instalada no es instantáneo como recargar una web, así que
 * el corte por versión es explícito: solo se rechaza a quien declara una versión
 * anterior al mínimo. Sin cabecera no se bloquea nada, porque el cliente web y
 * cualquier herramienta de línea de comandos no la envían.
 */
export const clientVersion = (req, res, next) => {
	const declared = req.get("X-Client-Version");
	req.clientVersion = declared ?? null;

	if (!env.MIN_CLIENT_VERSION || !declared) return next();

	const version = parse(declared);
	const minimum = parse(env.MIN_CLIENT_VERSION);

	// Una cabecera con formato raro no deja a nadie fuera: se ignora
	if (!version || !minimum) return next();

	if (isOlder(version, minimum)) {
		return next(
			upgradeRequired(
				`Esta versión de la aplicación ya no es compatible. Actualiza a la ${env.MIN_CLIENT_VERSION} o superior`,
			),
		);
	}

	next();
};
