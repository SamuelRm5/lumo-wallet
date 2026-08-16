import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/api/client";
import { listOperations, type Operation } from "@/api/operations";
import { getSummary, type Summary } from "@/api/summary";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { accountTypeLabel } from "@/lib/accountTypes";
import { formatCurrency } from "@/lib/currency";
import { useTheme } from "@/theme";

// Dashboard (docs/APP_MOVIL.md §4.2): una sola llamada a GET /summary resuelve
// la pantalla entera. No se recalcula nada de esto sumando otra cosa: el
// backend ya hizo la cuenta.
export default function HomeScreen() {
	const theme = useTheme();
	const router = useRouter();

	const [summary, setSummary] = useState<Summary | null>(null);
	const [pending, setPending] = useState<Operation[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			const [summaryResult, pendingResult] = await Promise.all([
				getSummary(),
				listOperations({ status: "pending", limit: 5 }),
			]);
			setSummary(summaryResult);
			setPending(pendingResult.data);
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "No se pudo cargar el resumen");
		} finally {
			setLoading(false);
		}
	}, []);

	// Se recarga cada vez que la pestaña vuelve a foco (p. ej. tras registrar
	// una operación o conciliar una cuenta), no solo al montar.
	useFocusEffect(
		useCallback(() => {
			load();
		}, [load]),
	);

	if (loading) {
		return (
			<ThemedView style={styles.centered}>
				<ActivityIndicator color={theme.colors.interactiveBrand} />
			</ThemedView>
		);
	}

	if (error || !summary) {
		return (
			<ThemedView style={styles.centered}>
				<ThemedText variant="body" colorToken="statusDanger" style={styles.errorText}>
					{error ?? "No se pudo cargar el resumen"}
				</ThemedText>
				<Pressable onPress={load} style={[styles.retryButton, { backgroundColor: theme.colors.interactiveBrand }]}>
					<ThemedText variant="bodyStrong" colorToken="textOnBrand">
						Reintentar
					</ThemedText>
				</Pressable>
			</ThemedView>
		);
	}

	const expected = summary.byType.source;
	const actual = summary.byType.cash + summary.byType.receivable + summary.byType.liability;

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea} edges={["top"]}>
				<ScrollView contentContainerStyle={styles.scrollContent}>
					<ThemedText variant="title">Inicio</ThemedText>

					<ThemedView colorToken="surfaceCard" style={[styles.card, { borderColor: theme.colors.borderSubtle }]}>
						<ThemedText variant="caption" colorToken="textMuted">
							Lo que debería haber
						</ThemedText>
						<ThemedText variant="balance">{formatCurrency(expected)}</ThemedText>

						<ThemedText variant="caption" colorToken="textMuted" style={styles.actualLabel}>
							Lo que hay
						</ThemedText>
						<ThemedText variant="balance">{formatCurrency(actual)}</ThemedText>

						<View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

						<ThemedText variant="label" colorToken={summary.discrepancy === 0 ? "textMuted" : "statusWarning"}>
							{summary.discrepancy === 0
								? "Sin descuadre"
								: `Descuadre de ${formatCurrency(Math.abs(summary.discrepancy))} — captura incompleta, no plata perdida ni sobrante`}
						</ThemedText>
					</ThemedView>

					<View style={styles.quickActions}>
						{/* Cada acceso abre el formulario con su tipo ya elegido; sin el
						    parámetro los dos caían en el default del formulario (gasto). */}
						<Pressable
							onPress={() => router.push({ pathname: "/register-operation", params: { kind: "income" } })}
							style={[styles.quickAction, { backgroundColor: theme.colors.interactiveBrand }]}>
							<ThemedText variant="bodyStrong" colorToken="textOnBrand">
								Registrar ingreso
							</ThemedText>
						</Pressable>
						<Pressable
							onPress={() => router.push({ pathname: "/register-operation", params: { kind: "expense" } })}
							style={[styles.quickAction, { backgroundColor: theme.colors.surfaceInverse }]}>
							<ThemedText variant="bodyStrong" colorToken="textOnInverse">
								Registrar gasto
							</ThemedText>
						</Pressable>
					</View>

					<ThemedText variant="heading" style={styles.sectionTitle}>
						Cuentas
					</ThemedText>
					{summary.accounts.map((account) => (
						<Pressable
							key={account.id}
							onPress={() => router.push(`/accounts/${account.id}`)}
							style={[styles.accountRow, { borderColor: theme.colors.borderSubtle }]}>
							<View style={styles.accountRowText}>
								<ThemedText variant="bodyStrong">{account.name}</ThemedText>
								<ThemedText variant="caption" colorToken="textMuted">
									{accountTypeLabel[account.type]} ·{" "}
									{account.lastReconciledAt
										? `conciliada ${new Date(account.lastReconciledAt).toLocaleDateString("es-CO")}`
										: "sin conciliar"}
								</ThemedText>
							</View>
							<ThemedText variant="bodyStrong" colorToken={account.balance < 0 ? "valueNegative" : "textStrong"}>
								{formatCurrency(account.balance)}
							</ThemedText>
						</Pressable>
					))}

					{pending.length > 0 && (
						<>
							<ThemedText variant="heading" style={styles.sectionTitle}>
								Pendientes de confirmar
							</ThemedText>
							{pending.map((operation) => (
								<View key={operation.id} style={[styles.accountRow, { borderColor: theme.colors.borderSubtle }]}>
									<View style={styles.accountRowText}>
										<ThemedText variant="bodyStrong">{operation.description ?? "Sin descripción"}</ThemedText>
										<ThemedText variant="caption" colorToken="textMuted">
											{new Date(operation.date).toLocaleDateString("es-CO")}
										</ThemedText>
									</View>
									<ThemedText variant="bodyStrong">{formatCurrency(operation.amount)}</ThemedText>
								</View>
							))}
						</>
					)}
				</ScrollView>
			</SafeAreaView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	safeArea: { flex: 1 },
	scrollContent: { padding: 24, gap: 16, paddingBottom: 48 },
	centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
	errorText: { textAlign: "center" },
	retryButton: { borderRadius: 999, paddingHorizontal: 24, paddingVertical: 12 },
	card: { borderRadius: 24, borderWidth: 1, padding: 20, gap: 4 },
	actualLabel: { marginTop: 12 },
	divider: { height: 1, marginVertical: 12 },
	quickActions: { flexDirection: "row", gap: 12 },
	quickAction: { flex: 1, borderRadius: 999, paddingVertical: 14, alignItems: "center" },
	sectionTitle: { marginTop: 8 },
	accountRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		borderWidth: 1,
		borderRadius: 18,
		paddingHorizontal: 16,
		paddingVertical: 14,
	},
	accountRowText: { gap: 2 },
});
