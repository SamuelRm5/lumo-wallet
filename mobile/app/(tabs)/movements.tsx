import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/api/client";
import { listOperations, type Operation, type OperationKind, type OperationStatus } from "@/api/operations";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { formatCurrency } from "@/lib/currency";
import { useTheme } from "@/theme";

// `getCategoryIcon` es una búsqueda pura en una tabla fija
// (src/lib/categoryIcons.ts): no crea un componente nuevo en cada render, solo
// selecciona uno ya existente. El linter de React Compiler no distingue eso de
// una fábrica de componentes impura cuando el resultado se usa como JSX
// directamente en el cuerpo de un componente con nombre; aislarlo en su propio
// componente lo dispensa de esa regla sin apagarla en el resto del archivo.
function CategoryIcon({ iconId, color, size = 18 }: { iconId: string | null; color: string; size?: number }) {
	const Icon = getCategoryIcon(iconId);
	// eslint-disable-next-line react-hooks/static-components -- selección pura de un ícono ya existente, no una fábrica
	return <Icon size={size} color={color} />;
}

const KIND_LABEL: Record<OperationKind, string> = {
	income: "Ingreso",
	expense: "Gasto",
	transfer: "Transferencia",
	adjustment: "Ajuste",
};

const KIND_FILTERS: { label: string; value: OperationKind | undefined }[] = [
	{ label: "Todas", value: undefined },
	{ label: "Ingresos", value: "income" },
	{ label: "Gastos", value: "expense" },
	{ label: "Transferencias", value: "transfer" },
	{ label: "Ajustes", value: "adjustment" },
];

const STATUS_FILTERS: { label: string; value: OperationStatus | undefined }[] = [
	{ label: "Todos los estados", value: undefined },
	{ label: "Confirmadas", value: "confirmed" },
	{ label: "Pendientes", value: "pending" },
];

// Paginación por cursor, no por página: se pasa `?cursor=` tal cual llegó en
// `meta.nextCursor`, nunca reconstruido (docs/APP_MOVIL.md §3).
export default function MovementsScreen() {
	const theme = useTheme();
	const router = useRouter();

	const [kind, setKind] = useState<OperationKind | undefined>(undefined);
	const [status, setStatus] = useState<OperationStatus | undefined>(undefined);
	const [search, setSearch] = useState("");

	const [operations, setOperations] = useState<Operation[]>([]);
	const [cursor, setCursor] = useState<string | null>(null);
	const [hasMore, setHasMore] = useState(false);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const result = await listOperations({ kind, status, search: search.trim() || undefined, limit: 20 });
			setOperations(result.data);
			setCursor(result.meta.nextCursor);
			setHasMore(result.meta.hasMore);
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "No se pudieron cargar los movimientos");
		} finally {
			setLoading(false);
		}
	}, [kind, status, search]);

	useFocusEffect(
		useCallback(() => {
			load();
		}, [load]),
	);

	const loadMore = async () => {
		if (!hasMore || loadingMore || !cursor) return;
		setLoadingMore(true);
		try {
			const result = await listOperations({ kind, status, search: search.trim() || undefined, limit: 20, cursor });
			setOperations((prev) => [...prev, ...result.data]);
			setCursor(result.meta.nextCursor);
			setHasMore(result.meta.hasMore);
		} catch {
			// Un fallo al pedir la siguiente página no borra lo que ya se ve;
			// el usuario puede reintentar haciendo scroll de nuevo.
		} finally {
			setLoadingMore(false);
		}
	};

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea} edges={["top"]}>
				<ThemedText variant="title" style={styles.title}>
					Movimientos
				</ThemedText>

				<TextInput
					value={search}
					onChangeText={setSearch}
					onSubmitEditing={load}
					placeholder="Buscar por descripción"
					placeholderTextColor={theme.colors.textSubtle}
					style={[styles.search, { borderColor: theme.colors.borderSubtle, color: theme.colors.textStrong }]}
				/>

				<View style={styles.chipRow}>
					{KIND_FILTERS.map((f) => (
						<Chip key={f.label} label={f.label} active={kind === f.value} onPress={() => setKind(f.value)} />
					))}
				</View>
				<View style={styles.chipRow}>
					{STATUS_FILTERS.map((f) => (
						<Chip key={f.label} label={f.label} active={status === f.value} onPress={() => setStatus(f.value)} />
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
					<FlatList
						data={operations}
						keyExtractor={(item) => String(item.id)}
						contentContainerStyle={styles.list}
						onEndReachedThreshold={0.4}
						onEndReached={loadMore}
						ListEmptyComponent={
							<ThemedText variant="body" colorToken="textMuted" style={styles.empty}>
								No hay movimientos con estos filtros.
							</ThemedText>
						}
						ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footer} color={theme.colors.interactiveBrand} /> : null}
						renderItem={({ item }) => (
							<MovementRow
								operation={item}
								onPress={() => router.push({ pathname: "/movement/[id]", params: { id: String(item.id) } })}
							/>
						)}
					/>
				)}
			</SafeAreaView>
		</ThemedView>
	);
}

function MovementRow({ operation, onPress }: { operation: Operation; onPress: () => void }) {
	const theme = useTheme();

	// Solo income/expense/adjustment tienen un signo claro para el usuario;
	// una transferencia no es ni crédito ni débito, mueve la misma plata.
	const sign = operation.kind === "income" ? "+" : operation.kind === "expense" ? "−" : "";
	const colorToken = operation.kind === "income" ? "valuePositive" : operation.kind === "expense" ? "textStrong" : "textStrong";

	return (
		<Pressable onPress={onPress} style={[styles.row, { borderColor: theme.colors.borderSubtle }]}>
			<View style={[styles.iconChip, { backgroundColor: theme.colors.surfaceSunken }]}>
				<CategoryIcon iconId={operation.category?.icon ?? null} color={theme.colors.textBody} />
			</View>
			<View style={styles.rowText}>
				<ThemedText variant="bodyStrong">{operation.description || KIND_LABEL[operation.kind]}</ThemedText>
				<ThemedText variant="caption" colorToken="textMuted">
					{new Date(operation.date).toLocaleDateString("es-CO")}
					{operation.status === "pending" ? " · pendiente" : ""}
					{operation.origin === "legacy" ? " · histórico" : ""}
				</ThemedText>
			</View>
			<ThemedText variant="bodyStrong" colorToken={colorToken}>
				{sign}
				{formatCurrency(operation.amount)}
			</ThemedText>
		</Pressable>
	);
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
	const theme = useTheme();
	return (
		<Pressable
			onPress={onPress}
			style={[styles.chip, { backgroundColor: active ? theme.colors.interactiveBrand : theme.colors.interactiveSoft }]}>
			<ThemedText variant="label" colorToken={active ? "textOnBrand" : "textBody"}>
				{label}
			</ThemedText>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	safeArea: { flex: 1 },
	title: { paddingHorizontal: 24, paddingTop: 8 },
	search: { marginHorizontal: 24, marginTop: 12, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15 },
	chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 24, paddingTop: 10 },
	chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
	centered: { flex: 1, alignItems: "center", justifyContent: "center" },
	list: { padding: 24, paddingTop: 16, gap: 10 },
	empty: { textAlign: "center", marginTop: 32 },
	footer: { paddingVertical: 16 },
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		borderWidth: 1,
		borderRadius: 18,
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	iconChip: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
	rowText: { flex: 1, gap: 2 },
});
