import { useEffect, useMemo, useRef, useState } from "react";
import * as Crypto from "expo-crypto";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { listAccounts, type Account } from "@/api/accounts";
import { listCategories, type Category } from "@/api/categories";
import { ApiError } from "@/api/client";
import { createOperation, type CreateOperationInput, type OperationKind } from "@/api/operations";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { useTheme } from "@/theme";

const KIND_LABEL: Record<OperationKind, string> = {
	income: "Ingreso",
	expense: "Gasto",
	transfer: "Transferencia",
	adjustment: "Ajuste",
};

const KIND_ORDER: OperationKind[] = ["expense", "income", "transfer", "adjustment"];

// El cliente nunca envía asientos: manda la operación y el servidor deriva las
// dos filas con su signo (docs/APP_MOVIL.md §4.4).
export default function RegisterOperationScreen() {
	const theme = useTheme();
	const router = useRouter();

	const [kind, setKind] = useState<OperationKind>("expense");
	const [amount, setAmount] = useState("");
	const [daysAgo, setDaysAgo] = useState(0);
	const [description, setDescription] = useState("");
	const [categoryId, setCategoryId] = useState<number | null>(null);
	const [fromAccountId, setFromAccountId] = useState<number | null>(null);
	const [toAccountId, setToAccountId] = useState<number | null>(null);
	const [accountId, setAccountId] = useState<number | null>(null);
	const [sourceAccountId, setSourceAccountId] = useState<number | null>(null);
	const [direction, setDirection] = useState<"in" | "out">("out");

	const [accounts, setAccounts] = useState<Account[] | null>(null);
	const [categories, setCategories] = useState<Category[] | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Un UUID por intento de registro, reutilizado en los reintentos de ese
	// mismo intento. Al remontar la pantalla (nuevo intento) se genera uno
	// nuevo (docs/APP_MOVIL.md §3).
	const idempotencyKey = useRef(Crypto.randomUUID());

	useEffect(() => {
		listAccounts().then((res) => setAccounts(res.data));
		listCategories().then((res) => setCategories(res.data));
	}, []);

	const nonSourceAccounts = useMemo(() => accounts?.filter((a) => a.type !== "source") ?? [], [accounts]);
	const sourceAccounts = useMemo(() => accounts?.filter((a) => a.type === "source") ?? [], [accounts]);
	const kindCategories = useMemo(
		() => categories?.filter((c) => c.kind === (kind === "income" ? "income" : "expense")) ?? [],
		[categories, kind],
	);

	// Con una sola cuenta fuente el servidor la resuelve solo; con más de una
	// es obligatoria. Las transferencias no tocan la fuente.
	const needsSourcePicker = kind !== "transfer" && sourceAccounts.length > 1;

	const date = useMemo(() => {
		const d = new Date();
		d.setDate(d.getDate() - daysAgo);
		return d.toISOString();
	}, [daysAgo]);

	const buildPayload = (): CreateOperationInput | null => {
		const value = Number(amount);
		if (!value || value <= 0) return null;

		const base = {
			amount: value,
			date,
			description: description.trim() || undefined,
			sourceAccountId: needsSourcePicker ? sourceAccountId ?? undefined : undefined,
		};

		switch (kind) {
			case "income":
				if (!toAccountId) return null;
				return { kind, ...base, toAccountId, categoryId: categoryId ?? undefined };
			case "expense":
				if (!fromAccountId) return null;
				return { kind, ...base, fromAccountId, categoryId: categoryId ?? undefined };
			case "transfer":
				if (!fromAccountId || !toAccountId) return null;
				return { kind, ...base, fromAccountId, toAccountId, sourceAccountId: undefined };
			case "adjustment":
				if (!accountId || !description.trim()) return null;
				return { kind, ...base, accountId, direction, description: description.trim() };
		}
	};

	const payload = buildPayload();

	const handleSubmit = async () => {
		if (!payload) return;
		setError(null);
		setSubmitting(true);
		try {
			await createOperation(payload, idempotencyKey.current);
			router.back();
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "No se pudo registrar la operación");
			setSubmitting(false);
		}
	};

	if (!accounts || !categories) {
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
					<View style={styles.chipRow}>
						{KIND_ORDER.map((k) => (
							<Chip key={k} label={KIND_LABEL[k]} active={kind === k} onPress={() => setKind(k)} />
						))}
					</View>

					<TextInput
						value={amount}
						onChangeText={setAmount}
						keyboardType="numeric"
						placeholder="Monto"
						placeholderTextColor={theme.colors.textSubtle}
						editable={!submitting}
						style={[styles.amountInput, { color: theme.colors.textStrong }]}
					/>

					<View style={styles.chipRow}>
						<Chip label="Hoy" active={daysAgo === 0} onPress={() => setDaysAgo(0)} />
						<Chip label="Ayer" active={daysAgo === 1} onPress={() => setDaysAgo(1)} />
					</View>

					{kind === "income" && (
						<AccountPicker label="Cuenta de destino" accounts={nonSourceAccounts} selected={toAccountId} onSelect={setToAccountId} />
					)}
					{kind === "expense" && (
						<AccountPicker label="Cuenta de origen" accounts={nonSourceAccounts} selected={fromAccountId} onSelect={setFromAccountId} />
					)}
					{kind === "transfer" && (
						<>
							<AccountPicker label="Desde" accounts={nonSourceAccounts} selected={fromAccountId} onSelect={setFromAccountId} />
							<AccountPicker label="Hacia" accounts={nonSourceAccounts} selected={toAccountId} onSelect={setToAccountId} />
						</>
					)}
					{kind === "adjustment" && (
						<>
							<AccountPicker label="Cuenta a ajustar" accounts={nonSourceAccounts} selected={accountId} onSelect={setAccountId} />
							<ThemedText variant="label" colorToken="textMuted" style={styles.sectionLabel}>
								Dirección
							</ThemedText>
							<View style={styles.chipRow}>
								<Chip label="Entra" active={direction === "in"} onPress={() => setDirection("in")} />
								<Chip label="Sale" active={direction === "out"} onPress={() => setDirection("out")} />
							</View>
						</>
					)}

					{(kind === "income" || kind === "expense") && kindCategories.length > 0 && (
						<>
							<ThemedText variant="label" colorToken="textMuted" style={styles.sectionLabel}>
								Categoría
							</ThemedText>
							<View style={styles.chipRow}>
								{kindCategories.map((category) => {
									const Icon = getCategoryIcon(category.icon);
									const active = categoryId === category.id;
									return (
										<Pressable
											key={category.id}
											onPress={() => setCategoryId(active ? null : category.id)}
											style={[
												styles.categoryChip,
												{ backgroundColor: active ? theme.colors.interactiveBrand : theme.colors.interactiveSoft },
											]}>
											<Icon size={16} color={active ? theme.colors.textOnBrand : theme.colors.textBody} />
											<ThemedText variant="label" colorToken={active ? "textOnBrand" : "textBody"}>
												{category.name}
											</ThemedText>
										</Pressable>
									);
								})}
							</View>
						</>
					)}

					{needsSourcePicker && (
						<AccountPicker label="Cuenta fuente" accounts={sourceAccounts} selected={sourceAccountId} onSelect={setSourceAccountId} />
					)}

					<TextInput
						value={description}
						onChangeText={setDescription}
						placeholder={kind === "adjustment" ? "Motivo (obligatorio)" : "Descripción (opcional)"}
						placeholderTextColor={theme.colors.textSubtle}
						editable={!submitting}
						style={[styles.input, { borderColor: theme.colors.borderSubtle, color: theme.colors.textStrong }]}
					/>

					{error && (
						<ThemedText variant="body" colorToken="statusDanger">
							{error}
						</ThemedText>
					)}

					<Pressable
						onPress={handleSubmit}
						disabled={!payload || submitting}
						style={[
							styles.submit,
							{ backgroundColor: theme.colors.interactiveBrand, opacity: !payload || submitting ? 0.5 : 1 },
						]}>
						{submitting ? (
							<ActivityIndicator color={theme.colors.textOnBrand} />
						) : (
							<ThemedText variant="bodyStrong" colorToken="textOnBrand">
								Guardar
							</ThemedText>
						)}
					</Pressable>
				</ScrollView>
			</SafeAreaView>
		</ThemedView>
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

function AccountPicker({
	label,
	accounts,
	selected,
	onSelect,
}: {
	label: string;
	accounts: Account[];
	selected: number | null;
	onSelect: (id: number) => void;
}) {
	return (
		<>
			<ThemedText variant="label" colorToken="textMuted" style={styles.sectionLabel}>
				{label}
			</ThemedText>
			<View style={styles.chipRow}>
				{accounts.length === 0 ? (
					<ThemedText variant="caption" colorToken="textSubtle">
						No hay cuentas disponibles
					</ThemedText>
				) : (
					accounts.map((account) => (
						<Chip key={account.id} label={account.name} active={selected === account.id} onPress={() => onSelect(account.id)} />
					))
				)}
			</View>
		</>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	safeArea: { flex: 1 },
	centered: { flex: 1, alignItems: "center", justifyContent: "center" },
	scrollContent: { padding: 24, gap: 12, paddingBottom: 48 },
	chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
	chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
	categoryChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		borderRadius: 999,
		paddingHorizontal: 14,
		paddingVertical: 8,
	},
	sectionLabel: { marginTop: 8 },
	amountInput: { fontSize: 34, fontWeight: "700", paddingVertical: 12 },
	input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginTop: 8 },
	submit: { borderRadius: 999, paddingVertical: 14, alignItems: "center", marginTop: 16 },
});
