import { getWithETagCache } from "./cached";
import type { AccountType } from "./accounts";

// docs/APP_MOVIL.md §4.2. Forma tomada de server/src/services/balances.service.js.
export type Summary = {
	currency: string;
	byType: Record<AccountType, number>;
	accounts: {
		id: number;
		name: string;
		type: AccountType;
		balance: number;
		lastReconciledAt: string | null;
	}[];
	discrepancy: number;
};

// Con ETag: el servidor responde 304 si nada cambió y se reusa el último cuerpo
// guardado, en vez de volver a bajar el resumen entero en cada arranque.
export function getSummary() {
	return getWithETagCache<Summary>("/summary");
}
