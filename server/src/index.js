import loadModels from "./database/models/index.js";
import { v1CuentasRoutes, v1MovimientosRoutes } from "./v1/routes/index.js";
import express, { json } from "express";
import helmet from "helmet";
import dotenv from "dotenv";
import cors from "cors";
const { sequelize } = await loadModels();

dotenv.config();

const app = express();

app.use(helmet());

const corsOptions = {
	origin: process.env.CORS_ORIGIN, // Define el origen permitido
	// origin: "*",
	optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use(json());

app.use("/api/v1/cuentas", v1CuentasRoutes);
app.use("/api/v1/movimientos", v1MovimientosRoutes);

(async () => {
	try {
		/**
		 * sync({ force: true }) elimina todas las tablas y las vuelve a crear
		 * sync({ alter: true }) detecta las diferencias entre el modelo y la tabla y las aplica
		 * sync() no hace nada si la tabla ya existe
		 */
		await sequelize.sync();
		console.log("Database synchronized");
	} catch (error) {
		console.error("Unable to connect to the database:", error);
	}
})();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
