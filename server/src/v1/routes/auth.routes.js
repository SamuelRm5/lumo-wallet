import authController from "../../controllers/auth.controller.js";
import { authMiddleware } from "../../middleware/auth.js";
import { authLimiter } from "../../middleware/rateLimit.js";
import { validate } from "../../middleware/validate.js";
import { forbidden } from "../../lib/errors.js";
import {
	changePasswordSchema,
	loginSchema,
	registerSchema,
	updateProfileSchema,
} from "../../schemas/auth.schema.js";
import env from "../../config/env.js";
import express from "express";

const router = express.Router();

const requirePublicRegistration = (req, res, next) => {
	if (!env.ALLOW_PUBLIC_REGISTRATION) {
		return next(forbidden("El registro público está deshabilitado"));
	}
	next();
};

// Rutas públicas (sin autenticación)
router.post(
	"/register",
	authLimiter,
	requirePublicRegistration,
	validate(registerSchema),
	authController.register,
);
router.post("/login", authLimiter, validate(loginSchema), authController.login);

// Rutas protegidas (requieren autenticación)
router.get("/validate", authMiddleware, authController.validateToken);
router.get("/profile", authMiddleware, authController.getProfile);
router.put(
	"/profile",
	authMiddleware,
	validate(updateProfileSchema),
	authController.updateProfile,
);
router.put(
	"/change-password",
	authMiddleware,
	validate(changePasswordSchema),
	authController.changePassword,
);

export default router;
