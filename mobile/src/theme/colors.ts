// Portado de docs/Lumo Wallet Design System/tokens/colors.css.
// Se descartan los tokens de redes de pago (--network-visa, --network-mc-*):
// Lumo no tiene tarjetas físicas ni virtuales (ver mobile/plans/FASE-0.md, Desviaciones).
//
// El design system solo define paleta clara: no hay bloque `dark` en colors.css.
// `colors.dark` es un alias de `colors.light` hasta que exista una paleta oscura real;
// no se inventa una aquí.

export const palette = {
	green: {
		50: "#ECFAF2",
		100: "#D3F3E2",
		200: "#A9E7C6",
		300: "#71D5A4",
		400: "#3CBE83",
		500: "#17A268",
		600: "#0E8455",
		700: "#0C6944",
		800: "#0B5238",
		900: "#093F2C",
		950: "#04231A",
	},
	neutral: {
		0: "#FFFFFF",
		25: "#FAFBFA",
		50: "#F4F6F5",
		100: "#ECEFEE",
		200: "#DFE3E1",
		300: "#C6CDCA",
		400: "#9BA5A1",
		500: "#6F7C77",
		600: "#55605C",
		700: "#3D4643",
		800: "#262D2B",
		900: "#131917",
		950: "#0A0E0D",
	},
	citrus: { 100: "#FFF3D1", 300: "#FFDC82", 500: "#FFC53D", 700: "#B8820A" },
	coral: { 100: "#FDE7E2", 300: "#F4A895", 500: "#E4573D", 700: "#A6321D" },
	sky: { 100: "#E1ECFE", 300: "#9CC0FA", 500: "#2E7DF6", 700: "#1B4FA8" },
} as const;

export const alpha = {
	ink04: "rgba(10,14,13,0.04)",
	ink08: "rgba(10,14,13,0.08)",
	ink16: "rgba(10,14,13,0.16)",
	ink56: "rgba(10,14,13,0.56)",
	white12: "rgba(255,255,255,0.12)",
	white64: "rgba(255,255,255,0.64)",
	green24: "rgba(23,162,104,0.24)",
} as const;

const light = {
	// Superficies
	surfacePage: palette.neutral[50],
	surfaceCard: palette.neutral[0],
	surfaceSunken: palette.neutral[100],
	surfaceRaised: palette.neutral[0],
	surfaceInverse: palette.neutral[950],
	surfaceBrand: palette.green[500],
	surfaceBrandStrong: palette.green[700],
	surfaceBrandSoft: palette.green[50],
	surfaceAccent: palette.citrus[500],
	surfaceScrim: alpha.ink56,
	surfaceGlass: alpha.white64,

	// Texto
	textStrong: palette.neutral[900],
	textBody: palette.neutral[800],
	textMuted: palette.neutral[500],
	textSubtle: palette.neutral[400],
	textBrand: palette.green[600],
	textOnBrand: palette.neutral[0],
	textOnInverse: palette.neutral[0],
	textOnAccent: palette.neutral[950],
	textDisabled: palette.neutral[400],

	// Bordes y líneas
	borderSubtle: palette.neutral[200],
	borderStrong: palette.neutral[300],
	borderBrand: palette.green[500],
	borderInverse: alpha.white12,
	divider: palette.neutral[100],

	// Interactivo
	interactiveBrand: palette.green[500],
	interactiveBrandHover: palette.green[600],
	interactiveBrandPress: palette.green[700],
	interactiveSoft: palette.neutral[100],
	interactiveSoftHover: palette.neutral[200],
	interactiveDisabled: palette.neutral[200],
	focusRing: palette.green[400],

	// Dinero y estado. Regla de color de dinero (LOGICA_NEGOCIO.md §9.1 y APP_MOVIL.md §6):
	// los créditos van en verde, los débitos en tinta, el coral es solo para fallos y
	// para el descuadre, nunca para gasto ordinario ni para presentarlo como "plata perdida".
	valuePositive: palette.green[600],
	valueNegative: palette.coral[500],
	valueNeutral: palette.neutral[500],
	statusSuccess: palette.green[500],
	statusSuccessSoft: palette.green[50],
	statusWarning: palette.citrus[500],
	statusWarningSoft: palette.citrus[100],
	statusDanger: palette.coral[500],
	statusDangerSoft: palette.coral[100],
	statusInfo: palette.sky[500],
	statusInfoSoft: palette.sky[100],
} as const;

export const colors = {
	light,
	dark: light,
} as const;

export type ThemeColors = typeof light;
export type ColorToken = keyof ThemeColors;
