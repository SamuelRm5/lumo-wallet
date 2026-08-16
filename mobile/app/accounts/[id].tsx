import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
	deleteAccount,
	getAccount,
	listAccounts,
	reconcileAccount,
	updateAccount,
	type Account,
	type AccountType,
} from "@/api/accounts";
import { ApiError } from "@/api/client";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { accountTypeLabel, accountTypeOrder } from "@/lib/accountTypes";
import { formatCurrency } from "@/lib/currency";
import { useTheme } from "@/theme";

export default function AccountDetailScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const accountId = Number(id);
	const theme = useTheme();
	const router = useRouter();

	const [account, setAccount] = useState<Account | null>(null);
	const [loading, setLoading] = useState(true);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			setAccount(await getAccount(accountId));
		} finally {
			setLoading(false);
		}
	}, [accountId]);

	useFocusEffect(
		useCallback(() => {
			load();
		}, [load]),
	);

	if (loading || !account) {
		return (
			<ThemedView style={styles.centered}>
				<ActivityIndicator color={theme.colors.interactiveBrand} />
			</ThemedView>
		);
	}

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea} edges={["bottom"]}>
				<ScrollView contentContainerStyle={styles.scrollContent}>
					<ThemedText variant="caption" colorToken="textMuted">
						Saldo
					</ThemedText>
					<ThemedText variant="balance">{formatCurrency(account.balance)}</ThemedText>

					<EditForm account={account} onSaved={setAccount} />

					{account.type !== "source" && <ReconcileForm account={account} onReconciled={load} />}

					<ArchiveButton account={account} onArchived={() => router.replace("/accounts")} />
				</ScrollView>
			</SafeAreaView>
		</ThemedView>
	);
}

function EditForm({ account, onSaved }: { account: Account; onSaved: (a: Account) => void }) {
	const theme = useTheme();
	const [name, setName] = useState(account.name);
	const [description, setDescription] = useState(account.description ?? "");
	const [type, setType] = useState<AccountType>(account.type);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const dirty = name !== account.name || description !== (account.description ?? "") || type !== account.type;

	const handleSave = async () => {
		setError(null);
		setSaving(true);
		try {
			const updated = await updateAccount(account.id, { name, description, type });
			onSaved(updated);
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "No se pudo guardar");
		} finally {
			setSaving(false);
		}
	};

	return (
		<ThemedView colorToken="surfaceCard" style={[styles.card, { borderColor: theme.colors.borderSubtle }]}>
			<ThemedText variant="heading">Editar</ThemedText>
			<TextInput
				value={name}
				onChangeText={setName}
				placeholder="Nombre"
				placeholderTextColor={theme.colors.textSubtle}
				editable={!saving}
				style={[styles.input, { borderColor: theme.colors.borderSubtle, color: theme.colors.textStrong }]}
			/>
			<TextInput
				value={description}
				onChangeText={setDescription}
				placeholder="Descripción"
				placeholderTextColor={theme.colors.textSubtle}
				editable={!saving}
				style={[styles.input, { borderColor: theme.colors.borderSubtle, color: theme.colors.textStrong }]}
			/>
			<View style={styles.typeRow}>
				{accountTypeOrder.map((t) => (
					<Pressable
						key={t}
						onPress={() => setType(t)}
						style={[
							styles.chip,
							{ backgroundColor: type === t ? theme.colors.interactiveBrand : theme.colors.interactiveSoft },
						]}>
						<ThemedText variant="label" colorToken={type === t ? "textOnBrand" : "textBody"}>
							{accountTypeLabel[t]}
						</ThemedText>
					</Pressable>
				))}
			</View>
			{error && (
				<ThemedText variant="caption" colorToken="statusDanger">
					{error}
				</ThemedText>
			)}
			<Pressable
				onPress={handleSave}
				disabled={!dirty || saving}
				style={[styles.smallButton, { backgroundColor: theme.colors.interactiveBrand, opacity: !dirty || saving ? 0.5 : 1 }]}>
				{saving ? <ActivityIndicator color={theme.colors.textOnBrand} /> : <ThemedText variant="label" colorToken="textOnBrand">Guardar</ThemedText>}
			</Pressable>
		</ThemedView>
	);
}

function ReconcileForm({ account, onReconciled }: { account: Account; onReconciled: () => void }) {
	const theme = useTheme();
	const [realBalance, setRealBalance] = useState(String(account.balance));
	const [sourceAccounts, setSourceAccounts] = useState<Account[] | null>(null);
	const [sourceAccountId, setSourceAccountId] = useState<number | null>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<string | null>(null);

	useFocusEffect(
		useCallback(() => {
			listAccounts("source").then((res) => {
				setSourceAccounts(res.data);
				if (res.data.length === 1) setSourceAccountId(res.data[0].id);
			});
		}, []),
	);

	// Con una sola cuenta fuente, el servidor la resuelve solo; con más de una
	// es obligatoria (docs/APP_MOVIL.md §4.4, misma regla que en operaciones).
	const needsSourcePicker = (sourceAccounts?.length ?? 0) > 1;

	const handleReconcile = async () => {
		setError(null);
		setResult(null);
		const value = Number(realBalance);
		if (Number.isNaN(value)) {
			setError("El saldo real debe ser un número");
			return;
		}
		if (needsSourcePicker && !sourceAccountId) {
			setError("Elige de qué cuenta fuente sale el ajuste");
			return;
		}
		setSaving(true);
		try {
			const res = await reconcileAccount(account.id, {
				realBalance: value,
				sourceAccountId: sourceAccountId ?? undefined,
			});
			setResult(
				res.difference === 0
					? "Sin diferencia. Solo se actualizó la fecha de conciliación."
					: `Diferencia de ${formatCurrency(res.difference)} registrada como ajuste — captura incompleta, no plata perdida ni sobrante.`,
			);
			onReconciled();
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "No se pudo conciliar");
		} finally {
			setSaving(false);
		}
	};

	return (
		<ThemedView colorToken="surfaceCard" style={[styles.card, { borderColor: theme.colors.borderSubtle }]}>
			<ThemedText variant="heading">Conciliar</ThemedText>
			<ThemedText variant="caption" colorToken="textMuted">
				¿Cuánta plata hay de verdad en esta cuenta?
			</ThemedText>
			<TextInput
				value={realBalance}
				onChangeText={setRealBalance}
				keyboardType="numeric"
				placeholder="Saldo real"
				placeholderTextColor={theme.colors.textSubtle}
				editable={!saving}
				style={[styles.input, { borderColor: theme.colors.borderSubtle, color: theme.colors.textStrong }]}
			/>
			{needsSourcePicker && sourceAccounts && (
				<View style={styles.typeRow}>
					{sourceAccounts.map((source) => (
						<Pressable
							key={source.id}
							onPress={() => setSourceAccountId(source.id)}
							style={[
								styles.chip,
								{
									backgroundColor:
										sourceAccountId === source.id ? theme.colors.interactiveBrand : theme.colors.interactiveSoft,
								},
							]}>
							<ThemedText variant="label" colorToken={sourceAccountId === source.id ? "textOnBrand" : "textBody"}>
								{source.name}
							</ThemedText>
						</Pressable>
					))}
				</View>
			)}
			{error && (
				<ThemedText variant="caption" colorToken="statusDanger">
					{error}
				</ThemedText>
			)}
			{result && (
				<ThemedText variant="caption" colorToken="statusWarning">
					{result}
				</ThemedText>
			)}
			<Pressable
				onPress={handleReconcile}
				disabled={saving}
				style={[styles.smallButton, { backgroundColor: theme.colors.interactiveBrand, opacity: saving ? 0.5 : 1 }]}>
				{saving ? <ActivityIndicator color={theme.colors.textOnBrand} /> : <ThemedText variant="label" colorToken="textOnBrand">Conciliar</ThemedText>}
			</Pressable>
		</ThemedView>
	);
}

function ArchiveButton({ account, onArchived }: { account: Account; onArchived: () => void }) {
	const theme = useTheme();
	const [archiving, setArchiving] = useState(false);

	const archive = async (force: boolean) => {
		setArchiving(true);
		try {
			await deleteAccount(account.id, force);
			onArchived();
		} catch (err) {
			// 409: la cuenta tiene saldo. No es un error a mostrar y ya: es una
			// confirmación con el saldo real, y si el usuario acepta se repite
			// con force=true (docs/APP_MOVIL.md §4.3).
			if (err instanceof ApiError && err.status === 409) {
				Alert.alert("Archivar cuenta", err.message, [
					{ text: "Cancelar", style: "cancel", onPress: () => setArchiving(false) },
					{ text: "Archivar de todas formas", style: "destructive", onPress: () => archive(true) },
				]);
				return;
			}
			Alert.alert("No se pudo archivar", err instanceof ApiError ? err.message : "Error desconocido");
			setArchiving(false);
		}
	};

	return (
		<Pressable
			onPress={() =>
				Alert.alert("Archivar cuenta", `¿Archivar "${account.name}"?`, [
					{ text: "Cancelar", style: "cancel" },
					{ text: "Archivar", style: "destructive", onPress: () => archive(false) },
				])
			}
			disabled={archiving}
			style={[styles.archiveButton, { borderColor: theme.colors.borderSubtle, opacity: archiving ? 0.5 : 1 }]}>
			{archiving ? (
				<ActivityIndicator color={theme.colors.statusDanger} />
			) : (
				<ThemedText variant="bodyStrong" colorToken="statusDanger">
					Archivar cuenta
				</ThemedText>
			)}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	safeArea: { flex: 1 },
	centered: { flex: 1, alignItems: "center", justifyContent: "center" },
	scrollContent: { padding: 24, gap: 16, paddingBottom: 48 },
	card: { borderRadius: 24, borderWidth: 1, padding: 20, gap: 10 },
	input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15 },
	typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
	chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
	smallButton: { borderRadius: 999, paddingVertical: 12, alignItems: "center", marginTop: 4 },
	archiveButton: { borderRadius: 999, borderWidth: 1, paddingVertical: 14, alignItems: "center" },
});
