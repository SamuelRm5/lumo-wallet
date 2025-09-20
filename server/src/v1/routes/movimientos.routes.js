import movimientosController from "../../controllers/movimientos.controller.js";
import { authMiddleware } from "../../middleware/auth.js";
import express from "express";

const router = express.Router();

// Todas las rutas de movimientos requieren autenticación
router
	// 📅 NUEVA: Búsqueda por rango de fechas (debe ir ANTES de /:cuentaId para evitar conflictos)
	.get(
		"/search/date-range",
		authMiddleware,
		movimientosController.getMovimientosByDateRange,
	)
	.get("/:cuentaId", authMiddleware, movimientosController.getMovimientos)
	.get("/byid/:id", authMiddleware, movimientosController.getMovimiento)
	.post("/:cuentaId", authMiddleware, movimientosController.createMovimiento)
	.put("/:id", authMiddleware, movimientosController.updateMovimiento)
	.delete("/:id", authMiddleware, movimientosController.deleteMovimiento);

export default router;
