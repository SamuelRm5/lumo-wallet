import accountsController from "../../controllers/accounts.controller.js";
import { authMiddleware } from "../../middleware/auth.js";
import express from "express";

const router = express.Router();

router.get("/", authMiddleware, accountsController.summary);

export default router;
