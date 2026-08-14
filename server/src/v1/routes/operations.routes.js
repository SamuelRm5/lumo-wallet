import operationsController from "../../controllers/operations.controller.js";
import { authMiddleware } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
	confirmOperationSchema,
	createOperationSchema,
	listOperationsSchema,
	operationIdSchema,
	statsSchema,
	updateOperationSchema,
} from "../../schemas/operations.schema.js";
import express from "express";

const router = express.Router();

router.use(authMiddleware);

router
	// Antes que /:id, o la ruta paramétrica se lleva "stats"
	.get("/stats", validate(statsSchema), operationsController.stats)
	.get("/", validate(listOperationsSchema), operationsController.list)
	.post("/", validate(createOperationSchema), operationsController.create)
	.get("/:id", validate(operationIdSchema), operationsController.getById)
	.put("/:id", validate(updateOperationSchema), operationsController.update)
	.delete("/:id", validate(operationIdSchema), operationsController.remove)
	.post(
		"/:id/confirm",
		validate(confirmOperationSchema),
		operationsController.confirm,
	);

export default router;
