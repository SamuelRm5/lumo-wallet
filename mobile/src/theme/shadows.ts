// Portado de docs/Lumo Wallet Design System/tokens/shadows.css.
//
// RN no tiene box-shadow: iOS usa shadowColor/shadowOffset/shadowOpacity/shadowRadius,
// Android usa `elevation` (una sola aproximación entera, sin color ni offset propios en
// versiones viejas de Android; desde Android 9 admite shadowColor pero no todos los
// dispositivos lo respetan igual). Estos son valores aproximados, no una traducción
// exacta del blur/spread de la sombra CSS.
//
// `shadow-sheet` es una sombra hacia arriba (offset Y negativo): `elevation` de Android
// no puede orientarse, así que en Android sale como una sombra normal hacia abajo más
// tenue. Se documenta acá para no sorprender a quien lo use en un bottom sheet.

import { Platform } from "react-native";
import { palette } from "./colors";

type ShadowRole = {
	shadowColor: string;
	shadowOffset: { width: number; height: number };
	shadowOpacity: number;
	shadowRadius: number;
	elevation: number;
};

const ink = palette.neutral[950];

const roles: Record<string, ShadowRole> = {
	xs: { shadowColor: ink, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
	sm: { shadowColor: ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
	md: { shadowColor: ink, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 6 },
	lg: { shadowColor: ink, shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.16, shadowRadius: 40, elevation: 12 },
	sheet: { shadowColor: ink, shadowOffset: { width: 0, height: -12 }, shadowOpacity: 0.14, shadowRadius: 32, elevation: 16 },
	brand: { shadowColor: palette.green[500], shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.55, shadowRadius: 24, elevation: 8 },
	accent: { shadowColor: palette.citrus[500], shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.7, shadowRadius: 24, elevation: 8 },
};

export type ShadowRoleName = keyof typeof roles;

// En Android solo aplica `elevation` (sin color ni offset propios); en iOS y web se usan
// las propiedades completas.
export function shadow(name: ShadowRoleName) {
	const role = roles[name];
	return Platform.OS === "android" ? { elevation: role.elevation } : role;
}

// Hairline: 1px inset con el color de borde. No es una sombra real, se aplica como borde.
export const hairlineWidth = 1;
