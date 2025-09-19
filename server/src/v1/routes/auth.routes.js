import authController from "../../controllers/auth.controller.js";
import { authMiddleware } from "../../middleware/auth.js";
import express from "express";

const router = express.Router();

// Rutas públicas (sin autenticación)
router.post("/register", authController.register);
router.post("/login", authController.login);

// Rutas protegidas (requieren autenticación)
router.get("/validate", authMiddleware, authController.validateToken);
router.get("/profile", authMiddleware, authController.getProfile);
router.put("/profile", authMiddleware, authController.updateProfile);

export default router;
