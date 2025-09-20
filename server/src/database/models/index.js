import dotenv from "dotenv";
import Sequelize from "sequelize";
import { applyAssociations } from "../associations/associations.js";

// Cargar variables de entorno
dotenv.config();

const sequelize = new Sequelize(
	process.env.DB_NAME,
	process.env.DB_USER,
	process.env.DB_PASSWORD,
	{
		host: process.env.DB_HOST,
		dialect: process.env.DB_DIALECT,
		port: parseInt(process.env.DB_PORT, 10),
		define: {
			timestamps: false,
		},
		logging: process.env.NODE_ENV === "production" ? false : console.log,
		pool: {
			max: 10,
			min: 0,
			acquire: 30000,
			idle: 10000,
		},
	},
);

const loadModels = async () => {
	const { default: Usuarios } = await import("../models/Usuarios.js");
	const { default: Cuentas } = await import("../models/Cuentas.js");
	const { default: Movimientos } = await import("../models/Movimientos.js");

	const models = {
		Usuarios: Usuarios(sequelize),
		Cuentas: Cuentas(sequelize),
		Movimientos: Movimientos(sequelize),
	};

	applyAssociations(models);

	return {
		sequelize,
		...models,
	};
};

export default loadModels;
