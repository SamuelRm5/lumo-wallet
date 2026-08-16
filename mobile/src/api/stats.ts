import { apiRequest } from "./client";

// docs/APP_MOVIL.md §4.8. Forma tomada de operationStats en
// server/src/services/operations.service.js.
//
// Vive aparte de api/operations.ts a propósito: el servidor ya excluye los
// asientos duplicados, las transferencias y separa los ajustes, y la app tiene
// prohibido recalcular nada de esto sumando la lista de operaciones (si lo
// hace, todas las cifras salen al doble). Separar los módulos deja esa regla
// comprobable con un grep en vez de por revisión.

export type CategoryTotal = {
	// Nulo es el grupo "Sin categoría", que el servidor ya nombra así.
	categoryId: number | null;
	name: string;
	kind: "income" | "expense";
	total: number;
};

export type MonthTotal = {
	// "2026-01"
	month: string;
	income: number;
	expense: number;
	adjustments: number;
};

export type OperationStats = {
	from: string;
	to: string;
	income: number;
	expense: number;
	// Plata que no se sabe dónde quedó, detectada al conciliar. Va en su propia
	// línea ("Sin identificar"), nunca sumada a los gastos.
	adjustments: number;
	net: number;
	byCategory: CategoryTotal[];
	byMonth: MonthTotal[];
};

// `from` y `to` son obligatorios aquí, a diferencia de GET /operations
// (statsSchema en server/src/schemas/operations.schema.js). Formato YYYY-MM-DD.
export function getOperationStats(from: string, to: string) {
	return apiRequest<OperationStats>(`/operations/stats?from=${from}&to=${to}`);
}
