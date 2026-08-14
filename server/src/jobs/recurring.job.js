import cron from "node-cron";
import env from "../config/env.js";
import { runDueRules } from "../services/recurring.service.js";
import { notifyUser, processPendingReceipts } from "../services/push.service.js";
import { logger } from "../middleware/requestLogger.js";
import { toNumber } from "../lib/serialize.js";

const money = amount =>
	new Intl.NumberFormat("es-CO", {
		style: "currency",
		currency: env.APP_CURRENCY,
		maximumFractionDigits: 0,
	}).format(toNumber(amount));

// En automático la operación ya está registrada y solo se informa; en
// recordatorio hay algo que hacer, y el texto lo dice
const notification = (rule, operation) =>
	rule.mode === "auto"
		? {
				title: rule.name,
				body: `Se registró ${money(operation.amount)} automáticamente`,
				data: { operationId: operation.id, action: "view" },
			}
		: {
				title: rule.name,
				body: `Confirma ${money(operation.amount)}: revisa el monto antes de aceptarlo`,
				data: { operationId: operation.id, action: "confirm" },
			};

export const runOnce = async () => {
	const summary = await runDueRules({
		onGenerated: (rule, operation) =>
			notifyUser(rule.userId, notification(rule, operation)),
	});

	logger.info(summary, "Reglas recurrentes procesadas");

	return summary;
};

/**
 * El job vive aquí y no en app.js: montar la aplicación en un test no puede
 * arrancar temporizadores ni escribir operaciones.
 */
export const scheduleRecurringJob = () => {
	if (!env.RECURRING_JOB_ENABLED) {
		logger.warn("El job de recurrentes está desactivado por configuración");
		return null;
	}

	const tarea = cron.schedule(
		env.RECURRING_JOB_CRON,
		async () => {
			try {
				await runOnce();
			} catch (error) {
				logger.error({ err: error }, "Fallo el job de recurrentes");
			}
		},
		{ timezone: env.APP_TIMEZONE },
	);

	// Los recibos de Expo tardan minutos en estar disponibles, así que se
	// consultan aparte del envío
	const recibos = cron.schedule(
		"15 * * * *",
		async () => {
			try {
				await processPendingReceipts();
			} catch (error) {
				logger.error({ err: error }, "Fallo la revisión de recibos de Expo");
			}
		},
		{ timezone: env.APP_TIMEZONE },
	);

	logger.info(
		{ cron: env.RECURRING_JOB_CRON, timezone: env.APP_TIMEZONE },
		"Job de recurrentes programado",
	);

	return { tarea, recibos };
};
