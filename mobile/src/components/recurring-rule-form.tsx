import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { listAccounts, type Account } from "@/api/accounts";
import { listCategories, type Category } from "@/api/categories";
import { ApiError } from "@/api/client";
import type { RecurringRule, RecurringRuleInput, RuleFrequency, RuleKind, RuleMode } from "@/api/recurringRules";
import { ThemedText } from "@/components/themed-text";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { formatAmountInput, stripAmountInput } from "@/lib/currency";
import { formatPlainDate, toPlainDate, todayPlainDate } from "@/lib/plainDate";
import { useTheme } from "@/theme";

const KIND_LABEL: Record<RuleKind, string> = {
	expense: "Gasto",
	income: "Ingreso",
	transfer: "Transferencia",
};

const KIND_ORDER: RuleKind[] = ["expense", "income", "transfer"];

const FREQUENCY_LABEL: Record<RuleFrequency, string> = {
	weekly: "Semanal",
	biweekly: "Quincenal",
	monthly: "Mensual",
	yearly: "Anual",
};

const FREQUENCY_ORDER: RuleFrequency[] = ["weekly", "biweekly", "monthly", "yearly"];

// Convención ISO: 1 es lunes y 7 es domingo, igual que `weekday` de Luxon en
// server/src/services/recurring.service.js.
const WEEKDAYS = [
	{ value: 1, label: "Lun" },
	{ value: 2, label: "Mar" },
	{ value: 3, label: "Mié" },
	{ value: 4, label: "Jue" },
	{ value: 5, label: "Vie" },
	{ value: 6, label: "Sáb" },
	{ value: 7, label: "Dom" },
];

const MODE_LABEL: Record<RuleMode, string> = {
	auto: "Automática",
	reminder: "Recordatorio",
};

// Las semanales se agendan por día de la semana; las mensuales y anuales, por
// día del mes. El servidor rechaza la combinación equivocada, pero la UI ni
// siquiera muestra el campo que no aplica (mobile/plans/FASE-5.md, paso 1).
const usesWeekday = (frequency: RuleFrequency) => frequency === "weekly" || frequency === "biweekly";

export function RecurringRuleForm({
	rule,
	submitLabel,
	onSubmit,
}: {
	rule?: RecurringRule;
	submitLabel: string;
	onSubmit: (input: RecurringRuleInput) => Promise<void>;
}) {
	const theme = useTheme();

	const [name, setName] = useState(rule?.name ?? "");
	const [kind, setKind] = useState<RuleKind>(rule?.kind ?? "expense");
	const [amount, setAmount] = useState(rule ? String(rule.amount) : "");
	const [frequency, setFrequency] = useState<RuleFrequency>(rule?.frequency ?? "monthly");
	const [dayOfMonth, setDayOfMonth] = useState(rule?.dayOfMonth ? String(rule.dayOfMonth) : "1");
	const [dayOfWeek, setDayOfWeek] = useState(rule?.dayOfWeek ?? 1);
	const [startDate, setStartDate] = useState(rule ? toPlainDate(rule.startDate) : todayPlainDate());
	const [endDate, setEndDate] = useState(rule?.endDate ? toPlainDate(rule.endDate) : "");
	const [mode, setMode] = useState<RuleMode>(rule?.mode ?? "auto");
	const [categoryId, setCategoryId] = useState<number | null>(rule?.categoryId ?? null);
	const [fromAccountId, setFromAccountId] = useState<number | null>(rule?.fromAccountId ?? null);
	const [toAccountId, setToAccountId] = useState<number | null>(rule?.toAccountId ?? null);
	const [sourceAccountId, setSourceAccountId] = useState<number | null>(rule?.sourceAccountId ?? null);

	const [accounts, setAccounts] = useState<Account[] | null>(null);
	const [categories, setCategories] = useState<Category[] | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

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

	// Igual que en el formulario de operación: con una sola cuenta fuente el
	// servidor la resuelve, y una transferencia no toca la fuente.
	const needsSourcePicker = kind !== "transfer" && sourceAccounts.length > 1;

	const buildInput = (): RecurringRuleInput | null => {
		const value = Number(amount);
		if (!name.trim() || !value || value <= 0) return null;

		const base = {
			name: name.trim(),
			amount: value,
			frequency,
			startDate,
			endDate: endDate || undefined,
			mode,
			// Solo viaja el campo que corresponde a la frecuencia; el otro ni se
			// envía, para no dejar un valor huérfano al cambiar de frecuencia.
			...(usesWeekday(frequency) ? { dayOfWeek } : { dayOfMonth: Number(dayOfMonth) || 1 }),
			sourceAccountId: needsSourcePicker ? sourceAccountId ?? undefined : undefined,
		};

		switch (kind) {
			case "income":
				if (!toAccountId) return null;
				return { ...base, kind, toAccountId, categoryId: categoryId ?? undefined };
			case "expense":
				if (!fromAccountId) return null;
				return { ...base, kind, fromAccountId, categoryId: categoryId ?? undefined };
			case "transfer":
				if (!fromAccountId || !toAccountId) return null;
				return { ...base, kind, fromAccountId, toAccountId, sourceAccountId: undefined };
		}
	};

	const input = buildInput();

	const handleSubmit = async () => {
		if (!input) return;
		setError(null);
		setSubmitting(true);
		try {
			await onSubmit(input);
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "No se pudo guardar la regla");
			setSubmitting(false);
		}
	};

	if (!accounts || !categories) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator color={theme.colors.interactiveBrand} />
			</View>
		);
	}

	return (
		// `flex: 1` para que el scroll ceda el espacio a lo que la pantalla ponga
		// debajo (en el detalle, el botón de borrar) en vez de solaparse.
		<ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
			<TextInput
				value={name}
				onChangeText={setName}
				placeholder="Nombre (ej. Arriendo)"
				placeholderTextColor={theme.colors.textSubtle}
				editable={!submitting}
				style={[styles.input, { borderColor: theme.colors.borderSubtle, color: theme.colors.textStrong }]}
			/>

			<View style={styles.chipRow}>
				{KIND_ORDER.map((k) => (
					<Chip key={k} label={KIND_LABEL[k]} active={kind === k} onPress={() => setKind(k)} />
				))}
			</View>

			<TextInput
				value={formatAmountInput(amount)}
				onChangeText={(text) => setAmount(stripAmountInput(text))}
				keyboardType="numeric"
				placeholder="Monto"
				placeholderTextColor={theme.colors.textSubtle}
				editable={!submitting}
				style={[styles.amountInput, { color: theme.colors.textStrong }]}
			/>

			<Label>Frecuencia</Label>
			<View style={styles.chipRow}>
				{FREQUENCY_ORDER.map((f) => (
					<Chip key={f} label={FREQUENCY_LABEL[f]} active={frequency === f} onPress={() => setFrequency(f)} />
				))}
			</View>

			{usesWeekday(frequency) ? (
				<>
					<Label>Día de la semana</Label>
					<View style={styles.chipRow}>
						{WEEKDAYS.map((d) => (
							<Chip key={d.value} label={d.label} active={dayOfWeek === d.value} onPress={() => setDayOfWeek(d.value)} />
						))}
					</View>
				</>
			) : (
				<>
					<Label>Día del mes</Label>
					<TextInput
						value={dayOfMonth}
						onChangeText={(text) => setDayOfMonth(text.replace(/\D/g, "").slice(0, 2))}
						keyboardType="numeric"
						placeholder="1"
						placeholderTextColor={theme.colors.textSubtle}
						editable={!submitting}
						style={[styles.input, { borderColor: theme.colors.borderSubtle, color: theme.colors.textStrong }]}
					/>
					<ThemedText variant="caption" colorToken="textSubtle">
						Si el mes no tiene ese día, la ocurrencia cae en el último (el 31 es el 28 en febrero).
					</ThemedText>
				</>
			)}

			<Label>Modo</Label>
			<View style={styles.chipRow}>
				<Chip label={MODE_LABEL.auto} active={mode === "auto"} onPress={() => setMode("auto")} />
				<Chip label={MODE_LABEL.reminder} active={mode === "reminder"} onPress={() => setMode("reminder")} />
			</View>
			<ThemedText variant="caption" colorToken="textSubtle">
				{mode === "auto"
					? "Registra la operación sola y avisa."
					: "Deja la operación pendiente para confirmarla desde Movimientos."}
			</ThemedText>

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

			{kind !== "transfer" && kindCategories.length > 0 && (
				<>
					<Label>Categoría</Label>
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

			<Label>Desde</Label>
			<PlainDateInput value={startDate} onChange={setStartDate} editable={!submitting} />

			<Label>Hasta (opcional)</Label>
			<PlainDateInput value={endDate} onChange={setEndDate} editable={!submitting} placeholder="Sin fecha de fin" />

			{error && (
				<ThemedText variant="body" colorToken="statusDanger">
					{error}
				</ThemedText>
			)}

			<Pressable
				onPress={handleSubmit}
				disabled={!input || submitting}
				style={[styles.submit, { backgroundColor: theme.colors.interactiveBrand, opacity: !input || submitting ? 0.5 : 1 }]}>
				{submitting ? (
					<ActivityIndicator color={theme.colors.textOnBrand} />
				) : (
					<ThemedText variant="bodyStrong" colorToken="textOnBrand">
						{submitLabel}
					</ThemedText>
				)}
			</Pressable>
		</ScrollView>
	);
}

function Label({ children }: { children: string }) {
	return (
		<ThemedText variant="label" colorToken="textMuted" style={styles.sectionLabel}>
			{children}
		</ThemedText>
	);
}

// Sin date-picker nativo todavía, igual que el resto de la app (Fases 2 a 4):
// se escribe la fecha en el mismo formato que viaja al servidor.
function PlainDateInput({
	value,
	onChange,
	editable,
	placeholder = "AAAA-MM-DD",
}: {
	value: string;
	onChange: (value: string) => void;
	editable: boolean;
	placeholder?: string;
}) {
	const theme = useTheme();
	const valid = /^\d{4}-\d{2}-\d{2}$/.test(value);
	return (
		<>
			<TextInput
				value={value}
				onChangeText={(text) => onChange(text.replace(/[^\d-]/g, "").slice(0, 10))}
				placeholder={placeholder}
				placeholderTextColor={theme.colors.textSubtle}
				editable={editable}
				style={[styles.input, { borderColor: theme.colors.borderSubtle, color: theme.colors.textStrong }]}
			/>
			{valid && (
				<ThemedText variant="caption" colorToken="textSubtle">
					{formatPlainDate(value)}
				</ThemedText>
			)}
		</>
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
			<Label>{label}</Label>
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
	centered: { flex: 1, alignItems: "center", justifyContent: "center" },
	scroll: { flex: 1 },
	scrollContent: { padding: 24, gap: 10, paddingBottom: 48 },
	input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
	amountInput: { fontSize: 34, fontWeight: "700", paddingVertical: 8 },
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
	submit: { borderRadius: 999, paddingVertical: 14, alignItems: "center", marginTop: 16 },
});

export { FREQUENCY_LABEL, KIND_LABEL, MODE_LABEL, WEEKDAYS };
