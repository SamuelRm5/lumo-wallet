import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/api/client";
import { getOperationStats, type OperationStats } from "@/api/stats";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { formatCurrency } from "@/lib/currency";
import { currentYearRange, formatMonthKey, monthRange } from "@/lib/plainDate";
import { useTheme } from "@/theme";

// Todas las cifras vienen resueltas de GET /operations/stats. La app no suma
// nada de la lista de operaciones: el servidor ya excluye los asientos
// duplicados y las transferencias, y separa los ajustes (docs/APP_MOVIL.md
// §4.8). Por eso esta pantalla importa @/api/stats y nunca @/api/operations.

const RANGES = [
	{ label: "Este mes", build: () => monthRange(0) },
	{ label: "Mes pasado", build: () => monthRange(-1) },
	{ label: "Este año", build: () => currentYearRange() },
];

export default function ReportsScreen() {
	const theme = useTheme();
	const [rangeIndex, setRangeIndex] = useState(2);
	const [stats, setStats] = useState<OperationStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const { from, to } = RANGES[rangeIndex].build();
			setStats(await getOperationStats(from, to));
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "No se pudieron cargar los reportes");
		} finally {
			setLoading(false);
		}
	}, [rangeIndex]);

	useFocusEffect(
		useCallback(() => {
			load();
		}, [load]),
	);

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea} edges={["top"]}>
				<ThemedText variant="title" style={styles.title}>
					Reportes
				</ThemedText>

				<View style={styles.chipRow}>
					{RANGES.map((range, index) => (
						<Pressable
							key={range.label}
							onPress={() => setRangeIndex(index)}
							style={[
								styles.chip,
								{ backgroundColor: rangeIndex === index ? theme.colors.interactiveBrand : theme.colors.interactiveSoft },
							]}>
							<ThemedText variant="label" colorToken={rangeIndex === index ? "textOnBrand" : "textBody"}>
								{range.label}
							</ThemedText>
						</Pressable>
					))}
				</View>

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
				) : stats ? (
					<ScrollView contentContainerStyle={styles.scrollContent}>
						<ThemedView colorToken="surfaceCard" style={[styles.card, { borderColor: theme.colors.borderSubtle }]}>
							<TotalRow label="Ingresos" value={stats.income} colorToken="valuePositive" />
							<TotalRow label="Gastos" value={stats.expense} />
							{/* Línea propia, nunca mezclada con los gastos: es plata que no se
							    sabe dónde quedó, detectada al conciliar (docs/APP_MOVIL.md §4.8). */}
							<TotalRow label="Sin identificar" value={stats.adjustments} colorToken="textMuted" />
							<View style={[styles.divider, { backgroundColor: theme.colors.borderSubtle }]} />
							<TotalRow label="Neto" value={stats.net} strong colorToken={stats.net >= 0 ? "valuePositive" : "valueNegative"} />
						</ThemedView>

						<ThemedText variant="heading" style={styles.sectionTitle}>
							Por categoría
						</ThemedText>
						{stats.byCategory.length === 0 ? (
							<ThemedText variant="body" colorToken="textMuted">
								Nada registrado en este rango.
							</ThemedText>
						) : (
							<ThemedView colorToken="surfaceCard" style={[styles.card, { borderColor: theme.colors.borderSubtle }]}>
								{stats.byCategory.map((row) => (
									<View key={`${row.kind}:${row.categoryId ?? "null"}`} style={styles.row}>
										<ThemedText variant="body">{row.name}</ThemedText>
										<ThemedText variant="bodyStrong" colorToken={row.kind === "income" ? "valuePositive" : "textStrong"}>
											{formatCurrency(row.total)}
										</ThemedText>
									</View>
								))}
							</ThemedView>
						)}

						<ThemedText variant="heading" style={styles.sectionTitle}>
							Por mes
						</ThemedText>
						{stats.byMonth.length === 0 ? (
							<ThemedText variant="body" colorToken="textMuted">
								Nada registrado en este rango.
							</ThemedText>
						) : (
							<ThemedView colorToken="surfaceCard" style={[styles.card, { borderColor: theme.colors.borderSubtle }]}>
								{stats.byMonth.map((row) => (
									<View key={row.month} style={styles.monthRow}>
										<ThemedText variant="bodyStrong">{formatMonthKey(row.month)}</ThemedText>
										<View style={styles.monthValues}>
											<ThemedText variant="caption" colorToken="valuePositive">
												+{formatCurrency(row.income)}
											</ThemedText>
											<ThemedText variant="caption" colorToken="textMuted">
												−{formatCurrency(row.expense)}
											</ThemedText>
											{row.adjustments !== 0 && (
												<ThemedText variant="caption" colorToken="textSubtle">
													{formatCurrency(row.adjustments)} sin identificar
												</ThemedText>
											)}
										</View>
									</View>
								))}
							</ThemedView>
						)}
					</ScrollView>
				) : null}
			</SafeAreaView>
		</ThemedView>
	);
}

function TotalRow({
	label,
	value,
	strong,
	colorToken,
}: {
	label: string;
	value: number;
	strong?: boolean;
	colorToken?: "valuePositive" | "valueNegative" | "textMuted" | "textStrong";
}) {
	return (
		<View style={styles.row}>
			<ThemedText variant={strong ? "bodyStrong" : "body"}>{label}</ThemedText>
			<ThemedText variant={strong ? "heading" : "bodyStrong"} colorToken={colorToken}>
				{formatCurrency(value)}
			</ThemedText>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	safeArea: { flex: 1 },
	title: { paddingHorizontal: 24, paddingTop: 8 },
	chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 24, paddingTop: 12 },
	chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
	centered: { flex: 1, alignItems: "center", justifyContent: "center" },
	scrollContent: { padding: 24, paddingTop: 16, gap: 4, paddingBottom: 48 },
	card: { borderRadius: 24, borderWidth: 1, padding: 20, gap: 10 },
	row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
	divider: { height: 1, marginVertical: 2 },
	sectionTitle: { marginTop: 20, marginBottom: 8 },
	monthRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
	monthValues: { alignItems: "flex-end", gap: 2 },
});
