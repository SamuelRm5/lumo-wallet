// Portado de docs/Lumo Wallet Design System/tokens/radii.css.
// `pill` se resuelve como un número grande fijo: RN acepta cualquier borderRadius mayor
// al alto/2 y lo recorta al máximo posible, así que no hace falta el 999px literal del CSS
// ni calcular el alto real del control.

export const radius = {
	xs: 6,
	sm: 10,
	md: 14,
	lg: 18,
	xl: 24,
	"2xl": 28,
	"3xl": 36,
	pill: 999,
} as const;

// Roles
export const radiusRole = {
	card: radius.xl,
	sheet: radius["2xl"], // solo esquinas superiores: se aplica con borderTopLeftRadius/Right
	control: radius.pill,
	field: radius.md,
	chip: radius.pill,
} as const;

// Círculo perfecto (avatar, chip de icono): la mitad del lado, no un porcentaje.
export const circleRadius = (size: number) => size / 2;
