import { apiRequest } from "./client";

// docs/APP_MOVIL.md §4.10. Forma tomada de server/src/services/sync.service.js.

export type SyncAccount = {
	id: number;
	name: string;
	description: string | null;
	type: string;
	currency: string;
	lastReconciledAt: string | null;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
};

export type SyncCategory = {
	id: number;
	name: string;
	icon: string | null;
	color: string | null;
	kind: string;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
};

export type SyncOperation = {
	id: number;
	kind: string;
	amount: number;
	categoryId: number | null;
	date: string;
	description: string | null;
	status: string;
	origin: string;
	recurringRuleId: number | null;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	entries: { accountId: number; amount: number }[];
};

// `deleted` son solo identificadores: el cliente ya tiene el resto y lo único
// que necesita es quitarlos. Es la razón de ser de este endpoint; ningún otro
// reporta borrados (docs/APP_MOVIL.md §4.10).
export type SyncDelta<T> = { updated: T[]; deleted: number[] };

export type SyncResponse = {
	// Hora del servidor tomada antes de consultar. Es la marca que se guarda
	// para la próxima llamada: nunca el reloj del dispositivo, que puede estar
	// desajustado.
	serverTime: string;
	since: string | null;
	accounts: SyncDelta<SyncAccount>;
	categories: SyncDelta<SyncCategory>;
	operations: SyncDelta<SyncOperation>;
};

// `since` ausente significa sincronización completa: la primera trae el
// histórico entero.
export function getSync(since?: string | null) {
	return apiRequest<SyncResponse>(`/sync${since ? `?since=${encodeURIComponent(since)}` : ""}`);
}
