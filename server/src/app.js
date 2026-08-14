import {
	v1AuthRoutes,
	v1AccountsRoutes,
	v1CategoriesRoutes,
	v1DevicesRoutes,
	v1OperationsRoutes,
	v1RecurringRoutes,
	v1SummaryRoutes,
	v1SyncRoutes,
} from "./v1/routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { clientVersion } from "./middleware/clientVersion.js";
import express, { json } from "express";
import compression from "compression";
import helmet from "helmet";
import cors from "cors";
import env from "./config/env.js";

// Construye la aplicación sin arrancarla, para poder montarla en tests
const createApp = () => {
	const app = express();

	// El ETag fuerte se calcula sobre el cuerpo completo: el cliente móvil pide
	// cuentas, categorías y resumen en cada arranque y casi nunca cambian, así
	// que la respuesta habitual a esas tres es un 304 sin cuerpo
	app.set("etag", "strong");

	app.use(helmet());
	app.use(cors({ origin: env.CORS_ORIGIN, optionsSuccessStatus: 200 }));
	app.use(compression());
	app.use(json());
	app.use(requestLogger);
	app.use(clientVersion);

	app.get("/api/health", (req, res) => {
		res.status(200).json({ status: "ok" });
	});

	app.use("/api/v1/auth", v1AuthRoutes);
	app.use("/api/v1/accounts", v1AccountsRoutes);
	app.use("/api/v1/categories", v1CategoriesRoutes);
	app.use("/api/v1/operations", v1OperationsRoutes);
	app.use("/api/v1/recurring-rules", v1RecurringRoutes);
	app.use("/api/v1/summary", v1SummaryRoutes);
	app.use("/api/v1/devices", v1DevicesRoutes);
	app.use("/api/v1/sync", v1SyncRoutes);

	app.use(notFoundHandler);
	app.use(errorHandler);

	return app;
};

export default createApp;
