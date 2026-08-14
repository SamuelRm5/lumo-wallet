import { useColorScheme } from "@/hooks/use-color-scheme";
import { colors, palette, alpha, type ColorToken } from "./colors";
import { fontFamily, fontSize, lineHeight, tracking, textRole, googleFontsToLoad, type TextRole } from "./typography";
import { space, gutter, contentMax, gapList, stack, sectionGap, chrome } from "./spacing";
import { radius, radiusRole, circleRadius } from "./radii";
import { shadow, hairlineWidth } from "./shadows";
import { duration, easing, pressScale } from "./motion";

export {
	palette,
	alpha,
	fontFamily,
	fontSize,
	lineHeight,
	tracking,
	textRole,
	googleFontsToLoad,
	space,
	gutter,
	contentMax,
	gapList,
	stack,
	sectionGap,
	chrome,
	radius,
	radiusRole,
	circleRadius,
	shadow,
	hairlineWidth,
	duration,
	easing,
	pressScale,
};
export type { ColorToken, TextRole };

// El design system no define paleta oscura (ver colors.ts): `useTheme` ya resuelve
// `light`/`dark` para que el resto de la app no tenga que saberlo, pero hoy ambas
// devuelven los mismos valores.
export function useTheme() {
	const scheme = useColorScheme();
	return {
		colors: colors[scheme === "dark" ? "dark" : "light"],
		space,
		radius,
		radiusRole,
		shadow,
		textRole,
		chrome,
	};
}

export type Theme = ReturnType<typeof useTheme>;
