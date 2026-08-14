// Portado de docs/Lumo Wallet Design System/tokens/spacing.css. Grilla de 4px.

export const space = {
	0: 0,
	0.5: 2,
	1: 4,
	1.5: 6,
	2: 8,
	2.5: 10,
	3: 12,
	4: 16,
	5: 20,
	6: 24,
	8: 32,
	10: 40,
	12: 48,
	16: 64,
	20: 80,
	24: 96,
} as const;

// Rieles de layout
export const gutter = { mobile: 20, desktop: 40 } as const;
export const contentMax = 1160;
export const gapList = 10;
export const stack = { tight: space[2], base: space[4], loose: space[6] };
export const sectionGap = space[8];

// Alturas de chrome fijo. Coinciden con las medidas del `TabBar`/`AppBar` del design
// system; se usan para reservar espacio bajo listas que scrollean bajo chrome fijo.
export const chrome = {
	tabBarHeight: 76,
	appBarHeight: 56,
	controlHeightSmall: 36,
	controlHeight: 48,
	controlHeightLarge: 56,
	touchMin: 44,
} as const;
