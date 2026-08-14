import categoriesController from "../../controllers/categories.controller.js";
import { authMiddleware } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
	categoryIdSchema,
	createCategorySchema,
	listCategoriesSchema,
	updateCategorySchema,
} from "../../schemas/categories.schema.js";
import express from "express";

const router = express.Router();

router.use(authMiddleware);

router
	.get("/", validate(listCategoriesSchema), categoriesController.list)
	.post("/", validate(createCategorySchema), categoriesController.create)
	.put("/:id", validate(updateCategorySchema), categoriesController.update)
	.delete("/:id", validate(categoryIdSchema), categoriesController.remove);

export default router;
