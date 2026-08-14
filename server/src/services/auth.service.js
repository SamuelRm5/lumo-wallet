import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import env from "../config/env.js";
import { unauthenticated } from "../lib/errors.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * El refresh token es opaco y solo se guarda su hash. Si alguien lee la tabla,
 * no obtiene nada con lo que autenticarse.
 */
const hash = token => createHash("sha256").update(token).digest("hex");

const parseTtlSeconds = ttl => {
	const match = /^(\d+)([smhd])$/.exec(ttl);
	if (!match) return 900;
	const [, value, unit] = match;
	const factor = { s: 1, m: 60, h: 3600, d: 86400 }[unit];
	return Number(value) * factor;
};

export const accessTokenTtlSeconds = parseTtlSeconds(env.ACCESS_TOKEN_TTL);

const signAccessToken = user =>
	jwt.sign({ userId: user.id, email: user.email }, env.JWT_SECRET, {
		expiresIn: env.ACCESS_TOKEN_TTL,
	});

export const issueSession = async (user, { deviceId = null } = {}) => {
	const refreshToken = randomBytes(48).toString("base64url");

	await prisma.refreshToken.create({
		data: {
			userId: user.id,
			tokenHash: hash(refreshToken),
			deviceId,
			expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS),
		},
	});

	return {
		accessToken: signAccessToken(user),
		refreshToken,
		expiresIn: accessTokenTtlSeconds,
		user: { id: user.id, name: user.name, email: user.email },
	};
};

export const revokeAllForUser = userId =>
	prisma.refreshToken.updateMany({
		where: { userId, revokedAt: null },
		data: { revokedAt: new Date() },
	});

/**
 * Rota el refresh token: el anterior queda revocado y se entrega uno nuevo.
 *
 * Si llega uno **ya revocado** se revocan todos los del usuario. Es la señal de
 * que alguien está usando un token que ya se consumió, es decir que fue robado,
 * y cerrar todas las sesiones es la única respuesta segura.
 */
export const rotateSession = async token => {
	const stored = await prisma.refreshToken.findFirst({
		where: { tokenHash: hash(token) },
		include: { user: true },
	});

	if (!stored) throw unauthenticated("El refresh token no es válido");

	if (stored.revokedAt) {
		await revokeAllForUser(stored.userId);
		throw unauthenticated(
			"Este refresh token ya se había usado. Se cerraron todas las sesiones por seguridad",
		);
	}

	if (stored.expiresAt < new Date()) {
		throw unauthenticated("El refresh token expiró");
	}

	if (stored.user.status !== "active") {
		throw unauthenticated("Usuario no válido");
	}

	await prisma.refreshToken.update({
		where: { id: stored.id },
		data: { revokedAt: new Date() },
	});

	return issueSession(stored.user, { deviceId: stored.deviceId });
};

export const revokeSession = async token => {
	await prisma.refreshToken.updateMany({
		where: { tokenHash: hash(token), revokedAt: null },
		data: { revokedAt: new Date() },
	});
};
