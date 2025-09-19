import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
	// Obtener token del header Authorization
	const authHeader = req.headers.authorization;
	const token =
		authHeader && authHeader.startsWith("Bearer ")
			? authHeader.slice(7)
			: null;

	if (!token) {
		return res.status(401).json({
			error: "Token de acceso requerido",
		});
	}

	try {
		// Verificar y decodificar el token
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		// Agregar userId al request para uso en controladores
		req.userId = decoded.userId;
		req.userEmail = decoded.email;

		next();
	} catch (error) {
		if (error.name === "TokenExpiredError") {
			return res.status(401).json({
				error: "Token expirado",
			});
		}

		if (error.name === "JsonWebTokenError") {
			return res.status(401).json({
				error: "Token inválido",
			});
		}

		return res.status(401).json({
			error: "Error de autenticación",
		});
	}
};

// Middleware opcional - continúa aunque no haya token
export const optionalAuthMiddleware = (req, res, next) => {
	const authHeader = req.headers.authorization;
	const token =
		authHeader && authHeader.startsWith("Bearer ")
			? authHeader.slice(7)
			: null;

	if (!token) {
		req.userId = null;
		return next();
	}

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		req.userId = decoded.userId;
		req.userEmail = decoded.email;
	} catch (error) {
		req.userId = null;
	}

	next();
};
