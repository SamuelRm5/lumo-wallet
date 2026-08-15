import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/api/client";
import { deleteRecurringRule, listRecurringRules, updateRecurringRule, type RecurringRule } from "@/api/recurringRules";
import { RecurringRuleForm } from "@/components/recurring-rule-form";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { formatPlainDate } from "@/lib/plainDate";
import { useTheme } from "@/theme";

export default function RecurringRuleDetailScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const ruleId = Number(id);
	const theme = useTheme();
	const router = useRouter();

	const [rule, setRule] = useState<RecurringRule | null>(null);
	const [loading, setLoading] = useState(true);
	const [deleting, setDeleting] = useState(false);

	// El contrato no tiene GET /recurring-rules/:id (docs/APP_MOVIL.md §4.7 solo
	// lista, crea, edita y borra): se pide la lista y se busca. Es una sola
	// petición y evita arrastrar los catorce campos por los parámetros de
	// navegación, como sí se hace en Categorías, que solo tiene cuatro.
	useEffect(() => {
		listRecurringRules()
			.then((res) => setRule(res.data.find((r) => r.id === ruleId) ?? null))
			.finally(() => setLoading(false));
	}, [ruleId]);

	const handleDelete = () => {
		Alert.alert("Borrar regla", "Deja de generar ocurrencias nuevas. Las ya generadas se conservan.", [
			{ text: "Cancelar", style: "cancel" },
			{
				text: "Borrar",
				style: "destructive",
				onPress: async () => {
					setDeleting(true);
					try {
						await deleteRecurringRule(ruleId);
						router.back();
					} catch (err) {
						Alert.alert("No se pudo borrar", err instanceof ApiError ? err.message : "Error desconocido");
						setDeleting(false);
					}
				},
			},
		]);
	};

	if (loading) {
		return (
			<ThemedView style={styles.centered}>
				<ActivityIndicator color={theme.colors.interactiveBrand} />
			</ThemedView>
		);
	}

	if (!rule) {
		return (
			<ThemedView style={styles.centered}>
				<ThemedText variant="body" colorToken="textMuted">
					La regla ya no existe.
				</ThemedText>
			</ThemedView>
		);
	}

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea} edges={["bottom"]}>
				<View style={[styles.nextRun, { borderColor: theme.colors.borderSubtle }]}>
					<ThemedText variant="caption" colorToken="textMuted">
						Próxima ocurrencia
					</ThemedText>
					<ThemedText variant="bodyStrong">
						{rule.nextRunAt ? formatPlainDate(rule.nextRunAt) : "Sin próxima ocurrencia"}
					</ThemedText>
					<ThemedText variant="caption" colorToken="textSubtle">
						La calcula el servidor. Editar la regla no cambia las operaciones ya generadas.
					</ThemedText>
				</View>

				<RecurringRuleForm
					rule={rule}
					submitLabel="Guardar cambios"
					onSubmit={async (input) => {
						await updateRecurringRule(rule.id, input);
						router.back();
					}}
				/>

				<Pressable
					onPress={handleDelete}
					disabled={deleting}
					style={[styles.deleteButton, { borderColor: theme.colors.borderSubtle, opacity: deleting ? 0.5 : 1 }]}>
					{deleting ? (
						<ActivityIndicator color={theme.colors.statusDanger} />
					) : (
						<ThemedText variant="bodyStrong" colorToken="statusDanger">
							Borrar regla
						</ThemedText>
					)}
				</Pressable>
			</SafeAreaView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	safeArea: { flex: 1 },
	centered: { flex: 1, alignItems: "center", justifyContent: "center" },
	nextRun: { marginHorizontal: 24, marginTop: 16, borderWidth: 1, borderRadius: 18, padding: 16, gap: 2 },
	deleteButton: {
		marginHorizontal: 24,
		marginBottom: 24,
		borderRadius: 999,
		borderWidth: 1,
		paddingVertical: 14,
		alignItems: "center",
	},
});
