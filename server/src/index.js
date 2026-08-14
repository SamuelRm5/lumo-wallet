import env from "./config/env.js";
import { logger } from "./middleware/requestLogger.js";
import { runOnce, scheduleRecurringJob } from "./jobs/recurring.job.js";
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

const jobs = scheduleRecurringJob();

// Si el servidor estuvo caído, las ocurrencias atrasadas se recuperan al
// arrancar en vez de esperar a la siguiente hora programada
if (env.RECURRING_JOB_ENABLED) {
	runOnce().catch(error => {
		logger.error({ err: error }, "Fallo la puesta al día de recurrentes");
	});
}

const shutdown = signal => {
	logger.info(`${signal} recibido, cerrando`);
	Object.values(jobs ?? {}).forEach(job => job.stop());
	server.close(async () => {
		await prisma.$disconnect();
		process.exit(0);
	});
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
