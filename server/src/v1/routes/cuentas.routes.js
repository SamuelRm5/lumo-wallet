import cuentasController from "../../controllers/cuentas.controller.js";
import express from "express";

const router = express.Router();

router
	.get("/", cuentasController.getAllCuentas)
	.get("/:id", cuentasController.getCuentaById)
	.get("/tipo/:tipo", cuentasController.getCuentasByTipo)
	.post("/", cuentasController.createCuenta)
	.put("/:id", cuentasController.updateCuenta)
	.delete("/:id", cuentasController.deleteCuenta);

export default router;
