import movimientosController from "../../controllers/movimientos.controller.js";
import { authMiddleware } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
	createMovimientoSchema,
	dateRangeSchema,
	movimientoIdSchema,
	movimientosByCuentaSchema,
	updateMovimientoSchema,
} from "../../schemas/movimientos.schema.js";
import express from "express";

const router = express.Router();

// Todas las rutas de movimientos requieren autenticación
router
	// Las rutas con prefijo literal van antes que /:cuentaId para que no las capture
	.get(
		"/search/date-range",
		authMiddleware,
		validate(dateRangeSchema),
		movimientosController.getMovimientosByDateRange,
	)
	.get(
		"/byid/:id",
		authMiddleware,
		validate(movimientoIdSchema),
		movimientosController.getMovimiento,
	)
	.get(
		"/:cuentaId",
		authMiddleware,
		validate(movimientosByCuentaSchema),
		movimientosController.getMovimientos,
	)
	.post(
		"/:cuentaId",
		authMiddleware,
		validate(createMovimientoSchema),
		movimientosController.createMovimiento,
	)
	.put(
		"/:id",
		authMiddleware,
		validate(updateMovimientoSchema),
		movimientosController.updateMovimiento,
	)
	.delete(
		"/:id",
		authMiddleware,
		validate(movimientoIdSchema),
		movimientosController.deleteMovimiento,
	);

export default router;
