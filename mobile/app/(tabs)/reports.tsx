import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

// Placeholder. GET /operations/stats llega en la Fase 5 (mobile/plans/FASE-5.md).
export default function ReportsScreen() {
	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea}>
				<ThemedText variant="title">Reportes</ThemedText>
				<ThemedText variant="body" colorToken="textMuted">
					Ingresos, gastos, ajustes y desglose por categoría llegan en la Fase 5.
				</ThemedText>
			</SafeAreaView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	safeArea: { flex: 1, padding: 24, gap: 8 },
});
