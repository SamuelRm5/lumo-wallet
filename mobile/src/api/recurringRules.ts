import { apiRequest } from "./client";

// docs/APP_MOVIL.md §4.7. Formas tomadas de server/src/schemas/recurring.schema.js
// y server/prisma/schema.prisma (model RecurringRule).

export type RuleKind = "income" | "expense" | "transfer";
export type RuleFrequency = "weekly" | "biweekly" | "monthly" | "yearly";
export type RuleMode = "auto" | "reminder";

export type RecurringRule = {
	id: number;
	name: string;
	kind: RuleKind;
	amount: number;
	categoryId: number | null;
	sourceAccountId: number | null;
	fromAccountId: number | null;
	toAccountId: number | null;
	frequency: RuleFrequency;
	// Excluyentes: las semanales llevan dayOfWeek, las mensuales y anuales
	// dayOfMonth. El servidor rechaza la que no corresponde a la frecuencia.
	dayOfMonth: number | null;
	// Convención ISO de Luxon en el servidor (recurring.service.js usa
	// `fecha.weekday`): 1 es lunes y 7 es domingo.
	dayOfWeek: number | null;
	startDate: string;
	endDate: string | null;
	// Lo calcula el servidor. La app solo lo muestra, nunca lo deriva de
	// frequency/dayOfMonth (docs/APP_MOVIL.md §4.7).
	nextRunAt: string | null;
	mode: RuleMode;
};

export type RecurringRuleInput = {
	name: string;
	kind: RuleKind;
	amount: number;
	categoryId?: number;
	sourceAccountId?: number;
	fromAccountId?: number;
	toAccountId?: number;
	frequency: RuleFrequency;
	dayOfMonth?: number;
	dayOfWeek?: number;
	// Sin hora: "2026-01-31" (docs/APP_MOVIL.md §4.7).
	startDate: string;
	endDate?: string;
	mode: RuleMode;
};

export function listRecurringRules() {
	return apiRequest<{ data: RecurringRule[] }>("/recurring-rules");
}

export function createRecurringRule(data: RecurringRuleInput) {
	return apiRequest<RecurringRule>("/recurring-rules", { method: "POST", body: data });
}

// Editar una regla no reescribe las operaciones ya generadas: solo cambia lo que
// se generará de aquí en adelante (docs/APP_MOVIL.md §4.7).
export function updateRecurringRule(id: number, data: Partial<RecurringRuleInput>) {
	return apiRequest<RecurringRule>(`/recurring-rules/${id}`, { method: "PUT", body: data });
}

export function deleteRecurringRule(id: number) {
	return apiRequest<void>(`/recurring-rules/${id}`, { method: "DELETE" });
}
