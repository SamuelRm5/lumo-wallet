import { apiRequest } from "./client";

// docs/APP_MOVIL.md §4.4 y §4.5. La Fase 3 agrega createOperation y el resto
// de la forma del formulario; esto es lo mínimo para la vista previa de
// pendientes en Inicio y para que Movimientos (Fase 4) no vuelva a definirlo.

export type OperationKind = "income" | "expense" | "transfer" | "adjustment";
export type OperationStatus = "pending" | "confirmed";

export type OperationEntry = {
	accountId: number;
	amount: number;
	accountName: string;
};

export type Operation = {
	id: number;
	kind: OperationKind;
	amount: number;
	date: string;
	description: string | null;
	status: OperationStatus;
	origin: "manual" | "legacy" | "recurring" | "reconciliation";
	category: { id: number; name: string; icon: string; color: string | null } | null;
	// Las operaciones legacy traen un solo asiento: no asumir longitud 2
	// (docs/APP_MOVIL.md §4.5).
	entries: OperationEntry[];
};

export type ListOperationsParams = {
	accountId?: number;
	kind?: OperationKind;
	categoryId?: number;
	status?: OperationStatus;
	from?: string;
	to?: string;
	search?: string;
	limit?: number;
	cursor?: string;
};

export function listOperations(params: ListOperationsParams = {}) {
	const query = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined) query.set(key, String(value));
	}
	const suffix = query.toString();
	return apiRequest<{ data: Operation[]; meta: { nextCursor: string | null; hasMore: boolean } }>(
		`/operations${suffix ? `?${suffix}` : ""}`,
	);
}

// Los campos exigidos varían según `kind` (docs/APP_MOVIL.md §4.4):
// income → toAccountId · expense → fromAccountId
// transfer → fromAccountId + toAccountId, sin categoría ni fuente
// adjustment → accountId + direction + description
export type CreateOperationInput = {
	kind: OperationKind;
	amount: number;
	date: string;
	description?: string;
	categoryId?: number;
	sourceAccountId?: number;
	fromAccountId?: number;
	toAccountId?: number;
	accountId?: number;
	direction?: "in" | "out";
};

export function createOperation(data: CreateOperationInput, idempotencyKey: string) {
	return apiRequest<Operation>("/operations", {
		method: "POST",
		body: data,
		headers: { "Idempotency-Key": idempotencyKey },
	});
}

export function updateOperation(id: number, data: Partial<CreateOperationInput>) {
	return apiRequest<Operation>(`/operations/${id}`, { method: "PUT", body: data });
}

export function deleteOperation(id: number) {
	return apiRequest<void>(`/operations/${id}`, { method: "DELETE" });
}

export function confirmOperation(id: number, amount?: number) {
	return apiRequest<Operation>(`/operations/${id}/confirm`, {
		method: "POST",
		body: amount !== undefined ? { amount } : undefined,
	});
}
