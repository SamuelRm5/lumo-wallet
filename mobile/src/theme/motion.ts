// Portado de docs/Lumo Wallet Design System/tokens/motion.css.
// Los `bezier` quedan como arrays [x1,y1,x2,y2] para pasar directo a
// `Easing.bezier(...)` de react-native-reanimated donde haga falta.

export const duration = {
	instant: 90,
	fast: 140,
	base: 200,
	slow: 300,
	sheet: 420,
} as const;

export const easing = {
	standard: [0.2, 0.8, 0.2, 1] as const,
	out: [0.16, 1, 0.3, 1] as const,
	in: [0.4, 0, 1, 1] as const,
	spring: [0.34, 1.42, 0.64, 1] as const,
};

export const pressScale = 0.97;

// `prefers-reduced-motion` no existe como tal en RN: `AccessibilityInfo.isReduceMotionEnabled()`
// es el equivalente y es asíncrono. Los componentes que animen deben consultarlo y, si está
// activo, usar duration 1 y pressScale 1 en vez de los valores de arriba (igual que hace el
// design system en su bloque `@media (prefers-reduced-motion: reduce)`).
