import env from "./config/env.js";
import { logger } from "./middleware/requestLogger.js";
import prisma from "./config/prisma.js";
import createApp from "./app.js";

// El esquema lo gobiernan las migraciones de Prisma, no el arranque. Aquí solo
// se comprueba que la base responde antes de aceptar peticiones
try {
	await prisma.$connect();
	logger.info("Conexión a la base de datos establecida");
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
		await prisma.$disconnect();
		process.exit(0);
	});
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
