import { apiRequest } from "./client";
import { getWithETagCache } from "./cached";

// docs/APP_MOVIL.md §4.6. Formas tomadas de server/src/schemas/categories.schema.js.

export type CategoryKind = "income" | "expense";

export type Category = {
	id: number;
	name: string;
	// Identificador semántico ("food", "salary"), no el nombre de un icono de
	// una librería concreta: el mapeo a un icono lo hace la app
	// (src/lib/categoryIcons.ts).
	icon: string | null;
	color: string | null;
	kind: CategoryKind;
};

// Con ETag, igual que cuentas y resumen (docs/APP_MOVIL.md §4.2).
export function listCategories(kind?: CategoryKind) {
	return getWithETagCache<{ data: Category[] }>(`/categories${kind ? `?kind=${kind}` : ""}`);
}

export function createCategory(data: { name: string; icon?: string | null; color?: string | null; kind: CategoryKind }) {
	return apiRequest<Category>("/categories", { method: "POST", body: data });
}

// `kind` no se puede cambiar al editar (docs/APP_MOVIL.md §4.6).
export function updateCategory(id: number, data: { name?: string; icon?: string | null; color?: string | null }) {
	return apiRequest<Category>(`/categories/${id}`, { method: "PUT", body: data });
}

// Borrado suave: las operaciones que la usaban la conservan.
export function deleteCategory(id: number) {
	return apiRequest<void>(`/categories/${id}`, { method: "DELETE" });
}
