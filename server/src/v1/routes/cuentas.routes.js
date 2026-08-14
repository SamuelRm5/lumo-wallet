import cuentasController from "../../controllers/cuentas.controller.js";
import { authMiddleware } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
	createCuentaSchema,
	cuentaIdSchema,
	cuentasByTipoSchema,
	updateCuentaSchema,
} from "../../schemas/cuentas.schema.js";
import express from "express";

const router = express.Router();

// Todas las rutas de cuentas requieren autenticación
router
	.get("/", authMiddleware, cuentasController.getAllCuentas)
	.get(
		"/tipo/:tipo",
		authMiddleware,
		validate(cuentasByTipoSchema),
		cuentasController.getCuentasByTipo,
	)
	.get(
		"/:id",
		authMiddleware,
		validate(cuentaIdSchema),
		cuentasController.getCuentaById,
	)
	.post(
		"/",
		authMiddleware,
		validate(createCuentaSchema),
		cuentasController.createCuenta,
	)
	.put(
		"/:id",
		authMiddleware,
		validate(updateCuentaSchema),
		cuentasController.updateCuenta,
	)
	.delete(
		"/:id",
		authMiddleware,
		validate(cuentaIdSchema),
		cuentasController.deleteCuenta,
	);

export default router;
