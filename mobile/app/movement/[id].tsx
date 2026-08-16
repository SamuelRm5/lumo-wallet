import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/api/client";
import { confirmOperation, deleteOperation, getOperation, type Operation, type OperationKind } from "@/api/operations";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { formatAmountInput, formatCurrency, stripAmountInput } from "@/lib/currency";
import { useTheme } from "@/theme";

const KIND_LABEL: Record<OperationKind, string> = {
	income: "Ingreso",
	expense: "Gasto",
	transfer: "Transferencia",
	adjustment: "Ajuste",
};

export default function MovementDetailScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const operationId = Number(id);
	const theme = useTheme();
	const router = useRouter();

	const [operation, setOperation] = useState<Operation | null>(null);
	const [loading, setLoading] = useState(true);
	const [deleting, setDeleting] = useState(false);

	useFocusEffect(
		useCallback(() => {
			getOperation(operationId)
				.then(setOperation)
				.finally(() => setLoading(false));
		}, [operationId]),
	);

	if (loading || !operation) {
		return (
			<ThemedView style={styles.centered}>
				<ActivityIndicator color={theme.colors.interactiveBrand} />
			</ThemedView>
		);
	}

	// Las operaciones legacy traen un solo asiento: no se puede reconstruir con
	// certeza a qué cuentas del formulario corresponde, así que no se editan
	// desde acá (docs/APP_MOVIL.md §4.5 y §12.5).
	const canEdit = operation.entries.length >= 2;

	const handleDelete = () => {
		Alert.alert("Borrar movimiento", "La operación desaparece de listados y saldos, pero el registro se conserva.", [
			{ text: "Cancelar", style: "cancel" },
			{
				text: "Borrar",
				style: "destructive",
				onPress: async () => {
					setDeleting(true);
					try {
						await deleteOperation(operation.id);
						router.back();
					} catch (err) {
						Alert.alert("No se pudo borrar", err instanceof ApiError ? err.message : "Error desconocido");
						setDeleting(false);
					}
				},
			},
		]);
	};

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea} edges={["bottom"]}>
				<ScrollView contentContainerStyle={styles.scrollContent}>
					<ThemedText variant="caption" colorToken="textMuted">
						{KIND_LABEL[operation.kind]}
						{operation.status === "pending" ? " · pendiente de confirmar" : ""}
						{operation.origin === "legacy" ? " · histórico" : ""}
					</ThemedText>
					<ThemedText variant="balance">{formatCurrency(operation.amount)}</ThemedText>
					<ThemedText variant="body" colorToken="textMuted">
						{new Date(operation.date).toLocaleString("es-CO")}
					</ThemedText>

					{operation.description && <ThemedText variant="body">{operation.description}</ThemedText>}

					{operation.category && (
						<View style={styles.categoryRow}>
							{(() => {
								const Icon = getCategoryIcon(operation.category.icon);
								return <Icon size={16} color={theme.colors.textBody} />;
							})()}
							<ThemedText variant="label" colorToken="textMuted">
								{operation.category.name}
							</ThemedText>
						</View>
					)}

					<ThemedView colorToken="surfaceCard" style={[styles.card, { borderColor: theme.colors.borderSubtle }]}>
						<ThemedText variant="heading">Asientos</ThemedText>
						{operation.entries.map((entry) => (
							<View key={entry.accountId} style={styles.entryRow}>
								<ThemedText variant="body">{entry.accountName}</ThemedText>
								<ThemedText variant="bodyStrong" colorToken={entry.amount >= 0 ? "valuePositive" : "textStrong"}>
									{entry.amount >= 0 ? "+" : ""}
									{formatCurrency(entry.amount)}
								</ThemedText>
							</View>
						))}
					</ThemedView>

					{operation.status === "pending" && <ConfirmSection operation={operation} onConfirmed={setOperation} />}

					{canEdit && (
						<Pressable
							onPress={() => router.push({ pathname: "/register-operation", params: { operationId: operation.id } })}
							style={[styles.editButton, { backgroundColor: theme.colors.interactiveBrand }]}>
							<ThemedText variant="bodyStrong" colorToken="textOnBrand">
								Editar
							</ThemedText>
						</Pressable>
					)}
					{!canEdit && (
						<ThemedText variant="caption" colorToken="textSubtle">
							Es un movimiento histórico migrado del modelo anterior: no se puede editar desde la app.
						</ThemedText>
					)}

					<Pressable
						onPress={handleDelete}
						disabled={deleting}
						style={[styles.deleteButton, { borderColor: theme.colors.borderSubtle, opacity: deleting ? 0.5 : 1 }]}>
						{deleting ? (
							<ActivityIndicator color={theme.colors.statusDanger} />
						) : (
							<ThemedText variant="bodyStrong" colorToken="statusDanger">
								Borrar movimiento
							</ThemedText>
						)}
					</Pressable>
				</ScrollView>
			</SafeAreaView>
		</ThemedView>
	);
}

function ConfirmSection({ operation, onConfirmed }: { operation: Operation; onConfirmed: (op: Operation) => void }) {
	const theme = useTheme();
	const [amount, setAmount] = useState(String(operation.amount));
	const [confirming, setConfirming] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleConfirm = async () => {
		setError(null);
		setConfirming(true);
		try {
			const value = Number(amount);
			// Sin cuerpo si el monto precargado es correcto (docs/APP_MOVIL.md §4.5).
			const updated = await confirmOperation(operation.id, value !== operation.amount ? value : undefined);
			onConfirmed(updated);
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "No se pudo confirmar");
		} finally {
			setConfirming(false);
		}
	};

	return (
		<ThemedView colorToken="surfaceCard" style={[styles.card, { borderColor: theme.colors.borderSubtle }]}>
			<ThemedText variant="heading">Confirmar</ThemedText>
			<ThemedText variant="caption" colorToken="textMuted">
				No afecta saldos hasta que se confirme. Ajusta el monto si hace falta.
			</ThemedText>
			<TextInput
				value={formatAmountInput(amount)}
				onChangeText={(text) => setAmount(stripAmountInput(text))}
				keyboardType="numeric"
				editable={!confirming}
				style={[styles.input, { borderColor: theme.colors.borderSubtle, color: theme.colors.textStrong }]}
			/>
			{error && (
				<ThemedText variant="caption" colorToken="statusDanger">
					{error}
				</ThemedText>
			)}
			<Pressable
				onPress={handleConfirm}
				disabled={confirming}
				style={[styles.smallButton, { backgroundColor: theme.colors.interactiveBrand, opacity: confirming ? 0.5 : 1 }]}>
				{confirming ? (
					<ActivityIndicator color={theme.colors.textOnBrand} />
				) : (
					<ThemedText variant="label" colorToken="textOnBrand">
						Confirmar
					</ThemedText>
				)}
			</Pressable>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	safeArea: { flex: 1 },
	centered: { flex: 1, alignItems: "center", justifyContent: "center" },
	scrollContent: { padding: 24, gap: 8, paddingBottom: 48 },
	categoryRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
	card: { borderRadius: 24, borderWidth: 1, padding: 20, gap: 10, marginTop: 16 },
	entryRow: { flexDirection: "row", justifyContent: "space-between" },
	input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15 },
	smallButton: { borderRadius: 999, paddingVertical: 12, alignItems: "center", marginTop: 4 },
	editButton: { borderRadius: 999, paddingVertical: 14, alignItems: "center", marginTop: 16 },
	deleteButton: { borderRadius: 999, borderWidth: 1, paddingVertical: 14, alignItems: "center", marginTop: 12 },
});
