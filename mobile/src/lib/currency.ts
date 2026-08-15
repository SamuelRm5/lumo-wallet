// Montos: enteros en COP, sin decimales en la práctica (docs/APP_MOVIL.md §3).
const formatter = new Intl.NumberFormat("es-CO", {
	style: "currency",
	currency: "COP",
	maximumFractionDigits: 0,
});

export function formatCurrency(amount: number): string {
	return formatter.format(amount);
}

// Separador de miles en vivo (mismo locale que formatCurrency, sin símbolo de
// moneda) para el campo de monto mientras el usuario escribe.
const groupFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

export function formatAmountInput(digits: string): string {
	if (!digits) return "";
	return groupFormatter.format(Number(digits));
}

// El estado del formulario guarda solo dígitos; esto limpia lo que llega del
// TextInput ya formateado (con puntos de miles) en cada tecla.
export function stripAmountInput(value: string): string {
	return value.replace(/\D/g, "");
}
