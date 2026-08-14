import { randomUUID } from "node:crypto";
import pinoHttp from "pino-http";
import pino from "pino";
import env, { isProduction } from "../config/env.js";

export const logger = pino({
	level: env.LOG_LEVEL,
	// En desarrollo el log estructurado es ilegible en consola; en producción
	// es justo lo que se quiere para poder consultarlo
	transport: isProduction
		? undefined
		: { target: "pino-pretty", options: { colorize: true } },
	redact: {
		paths: [
			"req.headers.authorization",
			"req.headers.cookie",
			"req.body.password",
			"req.body.currentPassword",
			"req.body.newPassword",
		],
		remove: true,
	},
});

export const requestLogger = pinoHttp({
	logger,
	// El requestId viaja también en la respuesta de error, para poder cruzar
	// lo que vio el usuario con lo que quedó en el log
	genReqId: (req, res) => {
		const id = req.headers["x-request-id"] ?? randomUUID();
		res.setHeader("X-Request-Id", id);
		return id;
	},
	// La versión del cliente en cada línea permite atribuir un fallo a una
	// versión concreta de la app instalada
	customProps: req => ({ clientVersion: req.headers["x-client-version"] }),
	customLogLevel: (req, res, err) => {
		if (err || res.statusCode >= 500) return "error";
		if (res.statusCode >= 400) return "warn";
		return "info";
	},
});
