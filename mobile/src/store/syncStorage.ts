import AsyncStorage from "@react-native-async-storage/async-storage";

// Estado de sincronización: no es secreto, así que va en AsyncStorage y no en
// SecureStore, que queda reservado para el refresh token (docs/APP_MOVIL.md §6).

const SERVER_TIME_KEY = "lumo_sync_server_time";
const ETAG_PREFIX = "lumo_etag:";
// Los cuerpos que acompañan a cada ETag los escribe src/api/cached.ts; se
// nombran acá para poder borrarlos junto al resto al cerrar sesión.
const BODY_PREFIX = "lumo_body:";

// El corte de la última sincronización es siempre el `serverTime` que devolvió
// el servidor, nunca el reloj del dispositivo (docs/APP_MOVIL.md §4.10).
export function getStoredServerTime(): Promise<string | null> {
	return AsyncStorage.getItem(SERVER_TIME_KEY);
}

export function setStoredServerTime(serverTime: string): Promise<void> {
	return AsyncStorage.setItem(SERVER_TIME_KEY, serverTime);
}

export function getStoredETag(path: string): Promise<string | null> {
	return AsyncStorage.getItem(ETAG_PREFIX + path);
}

export function setStoredETag(path: string, etag: string): Promise<void> {
	return AsyncStorage.setItem(ETAG_PREFIX + path, etag);
}

// Al cerrar sesión no puede quedar el corte de otro usuario: la siguiente
// sincronización pediría un delta en vez del histórico completo y la app
// arrancaría con datos ajenos a medias.
export async function clearSyncState(): Promise<void> {
	const keys = await AsyncStorage.getAllKeys();
	const ours = keys.filter(
		(key) => key === SERVER_TIME_KEY || key.startsWith(ETAG_PREFIX) || key.startsWith(BODY_PREFIX),
	);
	if (ours.length > 0) await AsyncStorage.multiRemove(ours);
}
