import { useCallback, useState } from "react";
import { Link, useFocusEffect } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { listAccounts, type Account, type AccountType } from "@/api/accounts";
import { ApiError } from "@/api/client";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { accountTypeLabel, accountTypeOrder } from "@/lib/accountTypes";
import { formatCurrency } from "@/lib/currency";
import { useTheme } from "@/theme";

export default function AccountsListScreen() {
	const theme = useTheme();
	const [filter, setFilter] = useState<AccountType | null>(null);
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async (type: AccountType | null) => {
		setLoading(true);
		setError(null);
		try {
			const result = await listAccounts(type ?? undefined);
			setAccounts(result.data);
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "No se pudieron cargar las cuentas");
		} finally {
			setLoading(false);
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			load(filter);
			// Recarga al volver a foco (tras crear, editar o archivar una
			// cuenta) y cada vez que cambia el filtro.
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [filter]),
	);

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea} edges={["bottom"]}>
				<View style={styles.filters}>
					<FilterChip label="Todas" active={filter === null} onPress={() => setFilter(null)} />
					{accountTypeOrder.map((type) => (
						<FilterChip
							key={type}
							label={accountTypeLabel[type]}
							active={filter === type}
							onPress={() => setFilter(type)}
						/>
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
				) : (
					<ScrollView contentContainerStyle={styles.list}>
						{accounts.length === 0 && (
							<ThemedText variant="body" colorToken="textMuted" style={styles.empty}>
								No hay cuentas de este tipo todavía.
							</ThemedText>
						)}
						{accounts.map((account) => (
							<Link key={account.id} href={`/accounts/${account.id}`} asChild>
								<Pressable style={StyleSheet.flatten([styles.row, { borderColor: theme.colors.borderSubtle }])}>
									<View style={styles.rowText}>
										<ThemedText variant="bodyStrong">{account.name}</ThemedText>
										<ThemedText variant="caption" colorToken="textMuted">
											{accountTypeLabel[account.type]}
										</ThemedText>
									</View>
									<ThemedText variant="bodyStrong" colorToken={account.balance < 0 ? "valueNegative" : "textStrong"}>
										{formatCurrency(account.balance)}
									</ThemedText>
								</Pressable>
							</Link>
						))}
					</ScrollView>
				)}

				<Link href="/accounts/new" asChild>
					<Pressable style={StyleSheet.flatten([styles.newButton, { backgroundColor: theme.colors.interactiveBrand }])}>
						<ThemedText variant="bodyStrong" colorToken="textOnBrand">
							Nueva cuenta
						</ThemedText>
					</Pressable>
				</Link>
			</SafeAreaView>
		</ThemedView>
	);
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
	const theme = useTheme();
	return (
		<Pressable
			onPress={onPress}
			style={[
				styles.chip,
				{
					backgroundColor: active ? theme.colors.interactiveBrand : theme.colors.interactiveSoft,
				},
			]}>
			<ThemedText variant="label" colorToken={active ? "textOnBrand" : "textBody"}>
				{label}
			</ThemedText>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	safeArea: { flex: 1 },
	filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 16, paddingBottom: 8 },
	chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
	centered: { flex: 1, alignItems: "center", justifyContent: "center" },
	list: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
	empty: { textAlign: "center", marginTop: 32 },
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		borderWidth: 1,
		borderRadius: 18,
		paddingHorizontal: 16,
		paddingVertical: 14,
	},
	rowText: { gap: 2 },
	newButton: { margin: 16, borderRadius: 999, paddingVertical: 14, alignItems: "center" },
});
