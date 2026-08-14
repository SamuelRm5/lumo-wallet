import recurringController from "../../controllers/recurring.controller.js";
import { authMiddleware } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
	createRuleSchema,
	ruleIdSchema,
	updateRuleSchema,
} from "../../schemas/recurring.schema.js";
import express from "express";

const router = express.Router();

router.use(authMiddleware);

router
	.get("/", recurringController.list)
	.post("/", validate(createRuleSchema), recurringController.create)
	.put("/:id", validate(updateRuleSchema), recurringController.update)
	.delete("/:id", validate(ruleIdSchema), recurringController.remove);

export default router;
