import accountsController from "../../controllers/accounts.controller.js";
import { authMiddleware } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
	accountIdSchema,
	createAccountSchema,
	deleteAccountSchema,
	listAccountsSchema,
	reconcileSchema,
	updateAccountSchema,
} from "../../schemas/accounts.schema.js";
import express from "express";

const router = express.Router();

router.use(authMiddleware);

router
	.get("/", validate(listAccountsSchema), accountsController.list)
	.post("/", validate(createAccountSchema), accountsController.create)
	.get("/:id", validate(accountIdSchema), accountsController.getById)
	.put("/:id", validate(updateAccountSchema), accountsController.update)
	.delete("/:id", validate(deleteAccountSchema), accountsController.remove)
	.post(
		"/:id/reconcile",
		validate(reconcileSchema),
		accountsController.reconcile,
	);

export default router;
