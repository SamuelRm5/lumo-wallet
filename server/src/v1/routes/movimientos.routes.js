import movimientosController from "../../controllers/movimientos.controller.js";
import express from "express";

const router = express.Router();

router
	.get("/:cuentaId", movimientosController.getMovimientos)
	.get("/byid/:id", movimientosController.getMovimiento)
	.post("/:cuentaId", movimientosController.createMovimiento)
	.put("/:id", movimientosController.updateMovimiento)
	.delete("/:id", movimientosController.deleteMovimiento);

export default router;
