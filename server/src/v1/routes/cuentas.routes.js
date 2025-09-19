import cuentasController from "../../controllers/cuentas.controller.js";
import { authMiddleware } from "../../middleware/auth.js";
import express from "express";

const router = express.Router();

// Todas las rutas de cuentas requieren autenticación
router
	.get("/", authMiddleware, cuentasController.getAllCuentas)
	.get("/:id", authMiddleware, cuentasController.getCuentaById)
	.get("/tipo/:tipo", authMiddleware, cuentasController.getCuentasByTipo)
	.post("/", authMiddleware, cuentasController.createCuenta)
	.put("/:id", authMiddleware, cuentasController.updateCuenta)
	.delete("/:id", authMiddleware, cuentasController.deleteCuenta);

export default router;
