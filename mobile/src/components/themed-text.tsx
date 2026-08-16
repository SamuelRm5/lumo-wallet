import { Text, type TextProps } from "react-native";

import { useTheme, type ColorToken, type TextRole } from "@/theme";

export type ThemedTextProps = TextProps & {
	// No se llama `role`: esa prop ya existe en TextProps para accesibilidad (ARIA),
	// con valores como "heading" que chocan con nuestros nombres de rol tipográfico.
	variant?: TextRole;
	colorToken?: ColorToken;
};

export function ThemedText({ style, variant = "body", colorToken = "textBody", ...rest }: ThemedTextProps) {
	const theme = useTheme();

	return <Text style={[theme.textRole[variant], { color: theme.colors[colorToken] }, style]} {...rest} />;
}
