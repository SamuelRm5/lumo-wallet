import { create } from "zustand";

import { getSync, type SyncResponse } from "@/api/sync";
import { getStoredServerTime, setStoredServerTime } from "./syncStorage";

// Ciclo de sincronización incremental (docs/APP_MOVIL.md §4.10). Guarda el
// resumen del último delta para poder mostrarlo y comprobarlo; el estado de
// cada pantalla se sigue pidiendo a su endpoint, que ya devuelve lo calculado.

type SyncSummary = {
	at: string;
	since: string | null;
	accounts: { updated: number; deleted: number };
	categories: { updated: number; deleted: number };
	operations: { updated: number; deleted: number };
};

type SyncState = {
	syncing: boolean;
	lastSummary: SyncSummary | null;
	lastError: string | null;
	// Devuelve el delta crudo para quien necesite reaccionar a los borrados.
	sync: () => Promise<SyncResponse | null>;
};

const count = (delta: { updated: unknown[]; deleted: unknown[] }) => ({
	updated: delta.updated.length,
	deleted: delta.deleted.length,
});

export const useSyncStore = create<SyncState>((set, get) => ({
	syncing: false,
	lastSummary: null,
	lastError: null,

	sync: async () => {
		// Una sola sincronización a la vez: al volver del background pueden
		// dispararse dos seguidas y la segunda avanzaría el corte con un delta
		// que la primera ya está trayendo.
		if (get().syncing) return null;

		set({ syncing: true, lastError: null });
		try {
			const since = await getStoredServerTime();
			const delta = await getSync(since);

			// El corte se guarda solo si la respuesta llegó entera: si se guardara
			// antes, un fallo a media descarga dejaría un hueco que ninguna
			// sincronización posterior volvería a pedir.
			await setStoredServerTime(delta.serverTime);

			set({
				lastSummary: {
					at: delta.serverTime,
					since: delta.since,
					accounts: count(delta.accounts),
					categories: count(delta.categories),
					operations: count(delta.operations),
				},
			});
			return delta;
		} catch (error) {
			set({ lastError: error instanceof Error ? error.message : "No se pudo sincronizar" });
			return null;
		} finally {
			set({ syncing: false });
		}
	},
}));
