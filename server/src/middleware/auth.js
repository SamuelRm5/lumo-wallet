import jwt from "jsonwebtoken";
import { unauthenticated } from "../lib/errors.js";
import env from "../config/env.js";

export const authMiddleware = (req, res, next) => {
	const authHeader = req.headers.authorization;
	const token =
		authHeader && authHeader.startsWith("Bearer ")
			? authHeader.slice(7)
			: null;

	if (!token) {
		return next(unauthenticated("Token de acceso requerido"));
	}

	try {
		const decoded = jwt.verify(token, env.JWT_SECRET);

		req.userId = decoded.userId;
		req.userEmail = decoded.email;

		next();
	} catch (error) {
		if (error.name === "TokenExpiredError") {
			return next(unauthenticated("Token expirado"));
		}

		if (error.name === "JsonWebTokenError") {
			return next(unauthenticated("Token inválido"));
		}

		next(unauthenticated("Error de autenticación"));
	}
};
