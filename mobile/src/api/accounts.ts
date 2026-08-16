import { apiRequest } from "./client";
import { getWithETagCache } from "./cached";

// docs/APP_MOVIL.md §4.3. Formas tomadas de server/src/schemas/accounts.schema.js
// y server/src/services/accounts.service.js.

export type AccountType = "source" | "cash" | "receivable" | "liability";

export type Account = {
	id: number;
	name: string;
	description: string | null;
	type: AccountType;
	currency: string;
	balance: number;
	lastReconciledAt: string | null;
	createdAt: string;
};

// Con ETag: la petición se hace siempre, pero el servidor responde 304 si nada
// cambió y se reusa el último cuerpo guardado (docs/APP_MOVIL.md §4.2).
export function listAccounts(type?: AccountType) {
	return getWithETagCache<{ data: Account[] }>(`/accounts${type ? `?type=${type}` : ""}`);
}

export function getAccount(id: number) {
	return apiRequest<Account>(`/accounts/${id}`);
}

export function createAccount(data: { name: string; description?: string; type: AccountType }) {
	return apiRequest<Account>("/accounts", { method: "POST", body: data });
}

export function updateAccount(id: number, data: { name?: string; description?: string; type?: AccountType }) {
	return apiRequest<Account>(`/accounts/${id}`, { method: "PUT", body: data });
}

// `force` confirma el borrado de una cuenta con saldo distinto de cero, tras un
// primer intento que devolvió 409 (docs/APP_MOVIL.md §4.3).
export function deleteAccount(id: number, force = false) {
	return apiRequest<void>(`/accounts/${id}${force ? "?force=true" : ""}`, { method: "DELETE" });
}

export type ReconcileResult = {
	accountId: number;
	calculatedBalance: number;
	realBalance: number;
	difference: number;
	lastReconciledAt: string;
	operation: unknown | null;
};

export function reconcileAccount(id: number, data: { realBalance: number; date?: string; sourceAccountId?: number }) {
	return apiRequest<ReconcileResult>(`/accounts/${id}/reconcile`, { method: "POST", body: data });
}
