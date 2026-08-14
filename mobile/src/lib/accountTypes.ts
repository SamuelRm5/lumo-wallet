import type { AccountType } from "@/api/accounts";

// Etiquetas de usuario exactas de docs/APP_MOVIL.md §4.3. Ojo con el par
// receivable/liability: receivable es plata que te deben, no que debes
// (docs/LOGICA_NEGOCIO.md §3).
export const accountTypeLabel: Record<AccountType, string> = {
	source: "Fuente",
	cash: "Depósito",
	receivable: "Por cobrar",
	liability: "Deuda",
};

export const accountTypeOrder: AccountType[] = ["source", "cash", "receivable", "liability"];
