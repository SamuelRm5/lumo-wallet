// Portado de docs/Lumo Wallet Design System/tokens/typography.css.
// En RN cada peso de una fuente cargada con expo-font es su propia familia
// (no existe fontWeight aplicado sobre una sola familia variable), así que los "pesos"
// del token original se resuelven aquí como nombres de familia concretos, cargados en
// app/_layout.tsx con @expo-google-fonts/*.

import {
	Sora_400Regular,
	Sora_600SemiBold,
	Sora_700Bold,
} from "@expo-google-fonts/sora";
import {
	PlusJakartaSans_400Regular,
	PlusJakartaSans_500Medium,
	PlusJakartaSans_600SemiBold,
	PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { JetBrainsMono_500Medium } from "@expo-google-fonts/jetbrains-mono";

export const fontFamily = {
	soraRegular: "Sora_400Regular",
	soraSemibold: "Sora_600SemiBold",
	soraBold: "Sora_700Bold",
	sansRegular: "PlusJakartaSans_400Regular",
	sansMedium: "PlusJakartaSans_500Medium",
	sansSemibold: "PlusJakartaSans_600SemiBold",
	sansBold: "PlusJakartaSans_700Bold",
	mono: "JetBrainsMono_500Medium",
} as const;

// Escala de tamaños, mobile-first
export const fontSize = {
	"2xs": 11,
	xs: 12,
	sm: 13,
	base: 15,
	md: 17,
	lg: 20,
	xl: 24,
	"2xl": 28,
	"3xl": 34,
	"4xl": 44,
	"5xl": 56,
	"6xl": 72,
} as const;

export const lineHeight = {
	tight: 1.05,
	snug: 1.2,
	normal: 1.45,
	relaxed: 1.6,
} as const;

// em relativo al tamaño de la fuente del rol que lo usa
export const tracking = {
	tighter: -0.03,
	tight: -0.015,
	normal: 0,
	wide: 0.04,
	widest: 0.12,
} as const;

const size = (px: number, leading: number, trackingEm = 0) => ({
	fontSize: px,
	lineHeight: Math.round(px * leading),
	letterSpacing: Math.round(px * trackingEm * 100) / 100,
});

// Roles compuestos. Las figuras de dinero (balance, montos en listas) deben usar
// `variantNumeric: "tabular-nums"` además del rol tipográfico: RN no tiene el equivalente
// de font-feature-settings de CSS, así que la fuente tabular depende de que el font file
// de Sora ya traiga cifras tabulares (Google Fonts sí las trae) y de fijar `fontVariant`.
export const textRole = {
	display: {
		fontFamily: fontFamily.soraBold,
		...size(fontSize["4xl"], lineHeight.tight, tracking.tight),
	},
	title: {
		fontFamily: fontFamily.soraBold,
		...size(fontSize["2xl"], lineHeight.snug),
	},
	heading: {
		fontFamily: fontFamily.sansBold,
		...size(fontSize.lg, lineHeight.snug),
	},
	body: {
		fontFamily: fontFamily.sansRegular,
		...size(fontSize.base, lineHeight.normal),
	},
	bodyStrong: {
		fontFamily: fontFamily.sansSemibold,
		...size(fontSize.base, lineHeight.normal),
	},
	label: {
		fontFamily: fontFamily.sansSemibold,
		...size(fontSize.sm, 1.3),
	},
	caption: {
		fontFamily: fontFamily.sansMedium,
		...size(fontSize.xs, 1.35),
	},
	overline: {
		fontFamily: fontFamily.sansSemibold,
		...size(fontSize["2xs"], 1.2, tracking.wide),
	},
	balance: {
		fontFamily: fontFamily.soraBold,
		...size(fontSize["3xl"], lineHeight.tight, tracking.tighter),
	},
	mono: {
		fontFamily: fontFamily.mono,
		...size(fontSize.sm, 1.4),
	},
} as const;

export type TextRole = keyof typeof textRole;

// Mapa listo para pasar a useFonts (expo-font) en app/_layout.tsx.
// Los valores son los assets ya resueltos que exporta cada paquete de @expo-google-fonts.
export const googleFontsToLoad = {
	Sora_400Regular,
	Sora_600SemiBold,
	Sora_700Bold,
	PlusJakartaSans_400Regular,
	PlusJakartaSans_500Medium,
	PlusJakartaSans_600SemiBold,
	PlusJakartaSans_700Bold,
	JetBrainsMono_500Medium,
};
