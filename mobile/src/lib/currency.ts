// Montos: enteros en COP, sin decimales en la práctica (docs/APP_MOVIL.md §3).
const formatter = new Intl.NumberFormat("es-CO", {
	style: "currency",
	currency: "COP",
	maximumFractionDigits: 0,
});

export function formatCurrency(amount: number): string {
	return formatter.format(amount);
}
