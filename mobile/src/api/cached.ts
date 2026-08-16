import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiRequestWithETag } from "./client";
import { getStoredETag, setStoredETag } from "@/store/syncStorage";

// GET con ETag para el arranque (docs/APP_MOVIL.md §4.2 y mobile/plans/FASE-6.md
// paso 5). Guardar solo el ETag no alcanza: un 304 no trae cuerpo, así que sin
// el último cuerpo guardado no habría nada que mostrar y habría que volver a
// pedirlo, que es justo lo que el ETag venía a evitar.

const BODY_PREFIX = "lumo_body:";

export async function getWithETagCache<T>(path: string): Promise<T> {
	const etag = await getStoredETag(path);
	const result = await apiRequestWithETag<T>(path, etag);

	if (result.notModified) {
		const cached = await AsyncStorage.getItem(BODY_PREFIX + path);
		if (cached) return JSON.parse(cached) as T;

		// Hay ETag guardado pero no cuerpo (se limpió a medias, o cambió la forma
		// de la caché). Se vuelve a pedir sin condicional para no devolver vacío.
		const fresh = await apiRequestWithETag<T>(path, null);
		if (fresh.data !== null) await store(path, fresh.data, fresh.etag);
		return fresh.data as T;
	}

	await store(path, result.data, result.etag);
	return result.data as T;
}

async function store(path: string, data: unknown, etag: string | null) {
	await AsyncStorage.setItem(BODY_PREFIX + path, JSON.stringify(data));
	if (etag) await setStoredETag(path, etag);
}
