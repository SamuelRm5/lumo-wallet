import { View, type ViewProps } from "react-native";

import { useTheme, type ColorToken } from "@/theme";

export type ThemedViewProps = ViewProps & {
	colorToken?: ColorToken;
};

export function ThemedView({ style, colorToken = "surfacePage", ...rest }: ThemedViewProps) {
	const theme = useTheme();

	return <View style={[{ backgroundColor: theme.colors[colorToken] }, style]} {...rest} />;
}
