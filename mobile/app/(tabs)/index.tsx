import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { checkApiHealth } from "@/api/client";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/theme";

// Pantalla de diagnóstico de la Fase 0 (mobile/plans/FASE-0.md, paso 4).
// Se retira cuando la Fase 1 convierta este tab en el login/dashboard real.
type HealthState = { status: "idle" | "loading" | "ok" | "error"; detail?: string };

export default function DiagnosticsScreen() {
	const theme = useTheme();
	const [health, setHealth] = useState<HealthState>({ status: "idle" });

	const checkHealth = useCallback(async () => {
		setHealth({ status: "loading" });
		try {
			const result = await checkApiHealth();
			setHealth({ status: "ok", detail: JSON.stringify(result) });
		} catch (error) {
			setHealth({ status: "error", detail: error instanceof Error ? error.message : String(error) });
		}
	}, []);

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea}>
				<ThemedText variant="title">Diagnóstico</ThemedText>
				<ThemedText variant="body" colorToken="textMuted" style={styles.subtitle}>
					Verifica que el teléfono llega al backend en la red local antes de construir el
					dashboard real (Fase 2).
				</ThemedText>

				<Pressable
					onPress={checkHealth}
					style={({ pressed }) => [
						styles.button,
						{ backgroundColor: theme.colors.interactiveBrand, opacity: pressed ? 0.9 : 1 },
					]}>
					<ThemedText variant="bodyStrong" colorToken="textOnBrand">
						Probar GET /api/health
					</ThemedText>
				</Pressable>

				<View style={styles.result}>
					{health.status === "loading" && <ActivityIndicator />}
					{health.status === "ok" && (
						<ThemedText variant="body" colorToken="valuePositive">
							OK — {health.detail}
						</ThemedText>
					)}
					{health.status === "error" && (
						<ThemedText variant="body" colorToken="statusDanger">
							{health.detail}
						</ThemedText>
					)}
				</View>
			</SafeAreaView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	safeArea: { flex: 1, padding: 24, gap: 16 },
	subtitle: { marginBottom: 8 },
	button: { borderRadius: 999, paddingVertical: 14, alignItems: "center" },
	result: { marginTop: 8 },
});
