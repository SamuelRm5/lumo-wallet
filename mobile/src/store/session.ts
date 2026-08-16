import { create } from "zustand";

import * as authApi from "@/api/auth";
import { configureAuth } from "@/api/client";
import { clearStoredRefreshToken, getStoredRefreshToken, setStoredRefreshToken } from "./secureTokens";
import { clearSyncState } from "./syncStorage";

export type SessionUser = authApi.SessionUser;
export type SessionStatus = "checking" | "authenticated" | "unauthenticated";

type SessionState = {
	status: SessionStatus;
	accessToken: string | null;
	user: SessionUser | null;
	// Intento silencioso de sesión al arrancar la app, con el refresh token
	// guardado. Se corre una sola vez, desde el guard de app/_layout.tsx.
	bootstrap: () => Promise<void>;
	loginWithCredentials: (email: string, password: string) => Promise<void>;
	// Logout iniciado por el usuario: además de limpiar el estado local, avisa
	// al servidor para revocar el refresh token.
	logout: () => Promise<void>;
	// El servidor ya revocó la sesión (p. ej. tras cambiar la contraseña):
	// no tiene sentido volver a llamar a /auth/logout con un token que el
	// servidor ya invalidó.
	clearLocalSession: () => Promise<void>;
	refreshUser: () => Promise<void>;
};

export const useSessionStore = create<SessionState>((set, get) => ({
	status: "checking",
	accessToken: null,
	user: null,

	bootstrap: async () => {
		const token = await refreshAccessToken();
		set({ status: token ? "authenticated" : "unauthenticated" });
	},

	loginWithCredentials: async (email, password) => {
		const session = await authApi.login(email, password);
		await setStoredRefreshToken(session.refreshToken);
		set({ accessToken: session.accessToken, user: session.user, status: "authenticated" });
	},

	logout: async () => {
		const refreshToken = await getStoredRefreshToken();
		await get().clearLocalSession();
		if (refreshToken) {
			try {
				await authApi.logout(refreshToken);
			} catch {
				// La sesión ya quedó cerrada localmente. Si el servidor no se pudo
				// avisar (sin red, por ejemplo), no hay nada más que hacer desde acá.
			}
		}
	},

	clearLocalSession: async () => {
		await clearStoredRefreshToken();
		// El corte de sincronización y los ETag son de este usuario: si
		// sobrevivieran al logout, la sesión siguiente pediría un delta en vez
		// del histórico y arrancaría con datos ajenos a medias.
		await clearSyncState();
		set({ accessToken: null, user: null, status: "unauthenticated" });
	},

	refreshUser: async () => {
		const user = await authApi.getMe();
		set({ user });
	},
}));

// Fuera del store: la usa el adaptador de client.ts y bootstrap(), y no necesita
// ser estado reactivo por sí misma (el estado que importa ya vive en el store).
async function refreshAccessToken(): Promise<string | null> {
	const storedRefreshToken = await getStoredRefreshToken();
	if (!storedRefreshToken) {
		useSessionStore.setState({ status: "unauthenticated", accessToken: null, user: null });
		return null;
	}

	try {
		const session = await authApi.refresh(storedRefreshToken);
		await setStoredRefreshToken(session.refreshToken);
		useSessionStore.setState({ accessToken: session.accessToken, user: session.user, status: "authenticated" });
		return session.accessToken;
	} catch {
		// Token ausente, vencido o ya reusado (§3: reusar uno consumido cierra
		// todas las sesiones en el servidor). En cualquier caso, acá no queda
		// sesión que mantener.
		await clearStoredRefreshToken();
		useSessionStore.setState({ status: "unauthenticated", accessToken: null, user: null });
		return null;
	}
}

configureAuth({
	getAccessToken: () => useSessionStore.getState().accessToken,
	refreshAccessToken,
});
