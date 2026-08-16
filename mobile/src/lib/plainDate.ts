// Las reglas recurrentes usan fechas sin hora ("2026-01-31", docs/APP_MOVIL.md
// §4.7). El servidor las guarda en columnas DATE y las devuelve como ISO de
// medianoche UTC, así que se recortan en vez de pasarlas por `new Date()`: en
// America/Bogota (UTC-5) construir un Date con esa cadena y leerlo en local
// devuelve el día anterior.

export function toPlainDate(iso: string): string {
	return iso.slice(0, 10);
}

export function todayPlainDate(): string {
	const now = new Date();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${now.getFullYear()}-${month}-${day}`;
}

// "2026-01-31" a "31/1/2026", sin pasar por Date para no correr el día.
export function formatPlainDate(value: string): string {
	const [year, month, day] = toPlainDate(value).split("-");
	return `${Number(day)}/${Number(month)}/${year}`;
}

// Primer y último día del año en curso, el rango por defecto de Reportes.
export function currentYearRange(): { from: string; to: string } {
	const year = new Date().getFullYear();
	return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export function monthRange(offsetMonths = 0): { from: string; to: string } {
	const now = new Date();
	const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
	const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
	const iso = (d: Date) =>
		`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
	return { from: iso(start), to: iso(end) };
}

// "2026-01" a "enero 2026", para las filas de byMonth.
const MONTH_NAMES = [
	"enero",
	"febrero",
	"marzo",
	"abril",
	"mayo",
	"junio",
	"julio",
	"agosto",
	"septiembre",
	"octubre",
	"noviembre",
	"diciembre",
];

export function formatMonthKey(key: string): string {
	const [year, month] = key.split("-");
	return `${MONTH_NAMES[Number(month) - 1] ?? month} ${year}`;
}
