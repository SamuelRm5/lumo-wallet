import syncController from "../../controllers/sync.controller.js";
import { authMiddleware } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { syncSchema } from "../../schemas/sync.schema.js";
import express from "express";

const router = express.Router();

router.use(authMiddleware);

router.get("/", validate(syncSchema), syncController.get);

export default router;
