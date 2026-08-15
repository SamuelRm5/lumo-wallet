import { useCallback, useState } from "react";
import { Link, useFocusEffect } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/api/client";
import { listRecurringRules, type RecurringRule } from "@/api/recurringRules";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { FREQUENCY_LABEL, KIND_LABEL, MODE_LABEL, WEEKDAYS } from "@/components/recurring-rule-form";
import { formatCurrency } from "@/lib/currency";
import { formatPlainDate } from "@/lib/plainDate";
import { useTheme } from "@/theme";

// Cuándo toca la próxima vez, en palabras. No calcula la fecha: eso es
// `nextRunAt`, que viene del servidor.
function scheduleLabel(rule: RecurringRule): string {
	const frequency = FREQUENCY_LABEL[rule.frequency];
	if (rule.dayOfWeek) {
		const day = WEEKDAYS.find((d) => d.value === rule.dayOfWeek)?.label ?? rule.dayOfWeek;
		return `${frequency} · ${day}`;
	}
	if (rule.dayOfMonth) return `${frequency} · día ${rule.dayOfMonth}`;
	return frequency;
}

export default function RecurringListScreen() {
	const theme = useTheme();
	const [rules, setRules] = useState<RecurringRule[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useFocusEffect(
		useCallback(() => {
			setLoading(true);
			listRecurringRules()
				.then((res) => {
					setRules(res.data);
					setError(null);
				})
				.catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las reglas"))
				.finally(() => setLoading(false));
		}, []),
	);

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea} edges={["bottom"]}>
				{loading ? (
					<View style={styles.centered}>
						<ActivityIndicator color={theme.colors.interactiveBrand} />
					</View>
				) : error ? (
					<View style={styles.centered}>
						<ThemedText variant="body" colorToken="statusDanger">
							{error}
						</ThemedText>
					</View>
				) : (
					<ScrollView contentContainerStyle={styles.list}>
						{rules.length === 0 ? (
							<ThemedText variant="body" colorToken="textMuted" style={styles.empty}>
								No hay reglas recurrentes todavía.
							</ThemedText>
						) : (
							rules.map((rule) => (
								<Link key={rule.id} href={{ pathname: "/recurring/[id]", params: { id: String(rule.id) } }} asChild>
									{/* Link con asChild renderiza un Slot, que exige un estilo ya
									    aplanado en vez de un array (igual que en Ajustes). */}
									<Pressable style={StyleSheet.flatten([styles.row, { borderColor: theme.colors.borderSubtle }])}>
										<View style={styles.rowText}>
											<ThemedText variant="bodyStrong">{rule.name}</ThemedText>
											<ThemedText variant="caption" colorToken="textMuted">
												{KIND_LABEL[rule.kind]} · {scheduleLabel(rule)} · {MODE_LABEL[rule.mode]}
											</ThemedText>
											{/* nextRunAt lo calcula el servidor; la app solo lo muestra
											    (docs/APP_MOVIL.md §4.7). */}
											<ThemedText variant="caption" colorToken="textSubtle">
												{rule.nextRunAt ? `Próxima: ${formatPlainDate(rule.nextRunAt)}` : "Sin próxima ocurrencia"}
											</ThemedText>
										</View>
										<ThemedText variant="bodyStrong">{formatCurrency(rule.amount)}</ThemedText>
									</Pressable>
								</Link>
							))
						)}
					</ScrollView>
				)}

				<Link href="/recurring/new" asChild>
					<Pressable style={StyleSheet.flatten([styles.newButton, { backgroundColor: theme.colors.interactiveBrand }])}>
						<ThemedText variant="bodyStrong" colorToken="textOnBrand">
							Nueva regla
						</ThemedText>
					</Pressable>
				</Link>
			</SafeAreaView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	safeArea: { flex: 1 },
	centered: { flex: 1, alignItems: "center", justifyContent: "center" },
	list: { padding: 16, gap: 10 },
	empty: { textAlign: "center", marginTop: 32 },
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		borderWidth: 1,
		borderRadius: 18,
		paddingHorizontal: 16,
		paddingVertical: 14,
	},
	rowText: { flex: 1, gap: 2 },
	newButton: { margin: 16, borderRadius: 999, paddingVertical: 14, alignItems: "center" },
});
