import Sequelize from "sequelize";
import { applyAssociations } from "../associations/associations.js";
import { logger } from "../../middleware/requestLogger.js";
import env from "../../config/env.js";

const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
	host: env.DB_HOST,
	dialect: env.DB_DIALECT,
	port: env.DB_PORT,
	define: {
		timestamps: false,
	},
	// El SQL solo se imprime pidiéndolo por LOG_LEVEL, no por el entorno
	logging: env.LOG_LEVEL === "trace" ? sql => logger.trace(sql) : false,
	pool: {
		max: 10,
		min: 0,
		acquire: 30000,
		idle: 10000,
	},
});

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
