import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

// Placeholder del modal. El formulario único con las cuatro formas de operación
// (income/expense/transfer/adjustment) e Idempotency-Key llega en la Fase 3
// (mobile/plans/FASE-3.md).
export default function RegisterOperationScreen() {
	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea}>
				<ThemedText variant="body" colorToken="textMuted">
					El formulario de registro llega en la Fase 3.
				</ThemedText>
			</SafeAreaView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	safeArea: { flex: 1, padding: 24 },
});
