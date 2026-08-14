import {
	v1AuthRoutes,
	v1AccountsRoutes,
	v1CategoriesRoutes,
	v1OperationsRoutes,
	v1RecurringRoutes,
	v1SummaryRoutes,
} from "./v1/routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import express, { json } from "express";
import helmet from "helmet";
import cors from "cors";
import env from "./config/env.js";

// Construye la aplicación sin arrancarla, para poder montarla en tests
const createApp = () => {
	const app = express();

	app.use(helmet());
	app.use(cors({ origin: env.CORS_ORIGIN, optionsSuccessStatus: 200 }));
	app.use(json());
	app.use(requestLogger);

	app.get("/api/health", (req, res) => {
		res.status(200).json({ status: "ok" });
	});

	app.use("/api/v1/auth", v1AuthRoutes);
	app.use("/api/v1/accounts", v1AccountsRoutes);
	app.use("/api/v1/categories", v1CategoriesRoutes);
	app.use("/api/v1/operations", v1OperationsRoutes);
	app.use("/api/v1/recurring-rules", v1RecurringRoutes);
	app.use("/api/v1/summary", v1SummaryRoutes);

	app.use(notFoundHandler);
	app.use(errorHandler);

	return app;
};

export default createApp;
