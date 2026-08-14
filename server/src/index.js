import env from "./config/env.js";
import { logger } from "./middleware/requestLogger.js";
import loadModels from "./database/models/index.js";
import createApp from "./app.js";

const { sequelize } = await loadModels();

// sync() crea las tablas que falten pero no aplica cambios sobre las que ya
// existen
try {
	await sequelize.sync();
	logger.info("Esquema de base de datos sincronizado");
} catch (error) {
	logger.fatal({ err: error }, "No se pudo conectar a la base de datos");
	process.exit(1);
}

const server = createApp().listen(env.PORT, () => {
	logger.info(`Servidor escuchando en el puerto ${env.PORT}`);
});

const shutdown = signal => {
	logger.info(`${signal} recibido, cerrando`);
	server.close(async () => {
		await sequelize.close();
		process.exit(0);
	});
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
