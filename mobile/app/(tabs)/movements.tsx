import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

// Placeholder. Listado paginado por cursor, filtros y detalle llegan en la Fase 4
// (mobile/plans/FASE-4.md).
export default function MovementsScreen() {
	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea}>
				<ThemedText variant="title">Movimientos</ThemedText>
				<ThemedText variant="body" colorToken="textMuted">
					Listado y filtros llegan en la Fase 4.
				</ThemedText>
			</SafeAreaView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	safeArea: { flex: 1, padding: 24, gap: 8 },
});
