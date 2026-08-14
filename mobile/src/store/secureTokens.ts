import * as SecureStore from "expo-secure-store";

// El refresh token vive solo acá, nunca en AsyncStorage (docs/APP_MOVIL.md §3 y §6).
// El access token no se persiste: dura 15 minutos y vive en memoria, en el store de
// sesión; si la app se cierra por completo, se vuelve a pedir con este refresh token.
const REFRESH_TOKEN_KEY = "lumo_refresh_token";

export function getStoredRefreshToken(): Promise<string | null> {
	return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export function setStoredRefreshToken(token: string): Promise<void> {
	return SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export function clearStoredRefreshToken(): Promise<void> {
	return SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
