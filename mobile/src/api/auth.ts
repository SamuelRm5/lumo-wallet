import { apiRequest } from "./client";

// docs/APP_MOVIL.md §4.1. Formas de request/response tomadas de
// server/src/schemas/auth.schema.js y server/src/services/auth.service.js.

export type SessionUser = { id: number; name: string; email: string };

export type AuthSession = {
	accessToken: string;
	refreshToken: string;
	expiresIn: number;
	user: SessionUser;
};

export function login(email: string, password: string) {
	return apiRequest<AuthSession>("/auth/login", {
		method: "POST",
		body: { email, password },
		skipAuthRetry: true,
	});
}

// El refresh token es de un solo uso: rota en cada llamada (docs/APP_MOVIL.md §3).
export function refresh(refreshToken: string) {
	return apiRequest<AuthSession>("/auth/refresh", {
		method: "POST",
		body: { refreshToken },
		skipAuthRetry: true,
	});
}

export function logout(refreshToken: string) {
	return apiRequest<void>("/auth/logout", {
		method: "POST",
		body: { refreshToken },
		skipAuthRetry: true,
	});
}

export function getMe() {
	return apiRequest<SessionUser & { createdAt: string }>("/auth/me");
}

export function updateMe(data: { name?: string; email?: string }) {
	return apiRequest<SessionUser>("/auth/me", { method: "PUT", body: data });
}

// Cierra todas las sesiones del usuario en el servidor, incluida la actual: la
// UI debe volver a /login después de un cambio exitoso (docs/APP_MOVIL.md §4.1).
export function changePassword(data: { currentPassword: string; newPassword: string }) {
	return apiRequest<{ message: string }>("/auth/password", { method: "PUT", body: data });
}
