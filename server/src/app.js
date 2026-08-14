import {
	v1AuthRoutes,
	v1CuentasRoutes,
	v1MovimientosRoutes,
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
	app.use("/api/v1/cuentas", v1CuentasRoutes);
	app.use("/api/v1/movimientos", v1MovimientosRoutes);

	app.use(notFoundHandler);
	app.use(errorHandler);

	return app;
};

export default createApp;
