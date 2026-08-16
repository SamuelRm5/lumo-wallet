import { Expo } from "expo-server-sdk";
import prisma from "../config/prisma.js";
import env from "../config/env.js";
import { logger } from "../middleware/requestLogger.js";
import { notFound, validationError } from "../lib/errors.js";

// Capacidad conservada sin cliente: ninguna app registra dispositivos hoy, así
// que listDevices devuelve vacío y no se envía nada
const expo = new Expo({ accessToken: env.EXPO_ACCESS_TOKEN });

export const isEnabled = () => Boolean(env.EXPO_ACCESS_TOKEN);

/**
 * Un mismo teléfono puede pasar de un usuario a otro, y el token de Expo es
 * único por instalación: si ya existe se reasigna en vez de fallar, o el usuario
 * nuevo se queda sin notificaciones y el anterior recibe las suyas.
 */
export const registerDevice = async (userId, { expoPushToken, platform }) => {
	if (!Expo.isExpoPushToken(expoPushToken)) {
		throw validationError("El token de Expo no tiene un formato válido");
	}

	return prisma.device.upsert({
		where: { expoPushToken },
		update: { userId, platform, lastSeenAt: new Date() },
		create: { userId, expoPushToken, platform },
	});
};

export const listDevices = userId =>
	prisma.device.findMany({
		where: { userId },
		orderBy: { lastSeenAt: "desc" },
	});

export const removeDevice = async (userId, id) => {
	const { count } = await prisma.device.deleteMany({ where: { id, userId } });
	if (count === 0) throw notFound("El dispositivo no existe o no es tuyo");
};

const forgetDevices = async (tokens, motivo) => {
	if (tokens.length === 0) return;

	const { count } = await prisma.device.deleteMany({
		where: { expoPushToken: { in: [...new Set(tokens)] } },
	});

	logger.info({ count, motivo }, "Dispositivos dados de baja");
};

/**
 * Los recibos llegan minutos después del envío, así que los identificadores de
 * los tickets se guardan en memoria hasta que el job los consulta. Perderlos al
 * reiniciar solo retrasa la baja de un token muerto hasta el siguiente envío;
 * guardarlos en base pediría una tabla para un dato que vive una hora.
 */
const pendingReceipts = new Map();

export const notifyUser = async (userId, { title, body, data }) => {
	const devices = await listDevices(userId);
	if (devices.length === 0) return { sent: 0 };

	if (!isEnabled()) {
		logger.warn(
			{ userId, title },
			"EXPO_ACCESS_TOKEN no configurado: la notificación no se envía",
		);
		return { sent: 0 };
	}

	const messages = devices.map(device => ({
		to: device.expoPushToken,
		sound: "default",
		title,
		body,
		data,
	}));

	const muertos = [];
	let sent = 0;

	for (const chunk of expo.chunkPushNotifications(messages)) {
		let tickets;
		try {
			tickets = await expo.sendPushNotificationsAsync(chunk);
		} catch (error) {
			// Que falle el envío no puede tumbar la generación de la operación,
			// que ya está escrita
			logger.error({ err: error, userId }, "Fallo al enviar notificaciones");
			continue;
		}

		tickets.forEach((ticket, index) => {
			const token = chunk[index].to;

			if (ticket.status === "error") {
				if (ticket.details?.error === "DeviceNotRegistered") muertos.push(token);
				else logger.warn({ ticket, userId }, "Notificación rechazada por Expo");
				return;
			}

			sent += 1;
			if (ticket.id) pendingReceipts.set(ticket.id, token);
		});
	}

	await forgetDevices(muertos, "DeviceNotRegistered en el ticket");

	return { sent };
};

/**
 * Sin esto la tabla se llena de tokens de apps desinstaladas que fallan en cada
 * envío: Expo solo reporta DeviceNotRegistered en el recibo, no en el ticket.
 */
export const processPendingReceipts = async () => {
	if (pendingReceipts.size === 0 || !isEnabled()) return { checked: 0 };

	const enviados = new Map(pendingReceipts);
	pendingReceipts.clear();

	const ids = [...enviados.keys()];
	const muertos = [];

	for (const chunk of expo.chunkPushNotificationReceiptIds(ids)) {
		let receipts;
		try {
			receipts = await expo.getPushNotificationReceiptsAsync(chunk);
		} catch (error) {
			logger.error({ err: error }, "Fallo al consultar recibos de Expo");
			continue;
		}

		for (const [id, receipt] of Object.entries(receipts)) {
			if (receipt.status !== "error") continue;

			if (receipt.details?.error === "DeviceNotRegistered") {
				const token = enviados.get(id);
				if (token) muertos.push(token);
			} else {
				logger.warn({ receipt }, "Recibo de Expo con error");
			}
		}
	}

	await forgetDevices(muertos, "DeviceNotRegistered en el recibo");

	return { checked: ids.length };
};
