import rateLimit from "express-rate-limit";
import { AppError } from "../lib/errors.js";
import env from "../config/env.js";

// Límite en las rutas públicas de autenticación. El error sale por el handler
// global para que tenga el mismo formato que el resto
export const authLimiter = rateLimit({
	windowMs: env.RATE_LIMIT_AUTH_WINDOW_MIN * 60 * 1000,
	limit: env.RATE_LIMIT_AUTH_MAX,
	standardHeaders: "draft-7",
	legacyHeaders: false,
	handler: (req, res, next) => {
		next(
			new AppError(
				"RATE_LIMITED",
				"Demasiados intentos. Espera unos minutos e inténtalo de nuevo",
			),
		);
	},
});
