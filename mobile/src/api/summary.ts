import { apiRequest } from "./client";
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

export function getSummary() {
	return apiRequest<Summary>("/summary");
}
