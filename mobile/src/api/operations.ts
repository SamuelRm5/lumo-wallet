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
