import devicesController from "../../controllers/devices.controller.js";
import { authMiddleware } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
	deviceIdSchema,
	registerDeviceSchema,
} from "../../schemas/devices.schema.js";
import express from "express";

const router = express.Router();

router.use(authMiddleware);

router
	.get("/", devicesController.list)
	.post("/", validate(registerDeviceSchema), devicesController.register)
	.delete("/:id", validate(deviceIdSchema), devicesController.remove);

export default router;
