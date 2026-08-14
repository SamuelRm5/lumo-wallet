import { useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { createAccount, type AccountType } from "@/api/accounts";
import { ApiError } from "@/api/client";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { accountTypeLabel, accountTypeOrder } from "@/lib/accountTypes";
import { useTheme } from "@/theme";

export default function NewAccountScreen() {
	const theme = useTheme();
	const router = useRouter();

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [type, setType] = useState<AccountType>("cash");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleCreate = async () => {
		setError(null);
		setSaving(true);
		try {
			await createAccount({ name: name.trim(), description: description.trim() || undefined, type });
			router.back();
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "No se pudo crear la cuenta");
			setSaving(false);
		}
	};

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea}>
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
					placeholder="Descripción (opcional)"
					placeholderTextColor={theme.colors.textSubtle}
					editable={!saving}
					style={[styles.input, { borderColor: theme.colors.borderSubtle, color: theme.colors.textStrong }]}
				/>

				<ThemedText variant="label" colorToken="textMuted" style={styles.typeLabel}>
					Tipo
				</ThemedText>
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
					<ThemedText variant="body" colorToken="statusDanger">
						{error}
					</ThemedText>
				)}

				<Pressable
					onPress={handleCreate}
					disabled={!name.trim() || saving}
					style={[
						styles.submit,
						{ backgroundColor: theme.colors.interactiveBrand, opacity: !name.trim() || saving ? 0.5 : 1 },
					]}>
					{saving ? (
						<ActivityIndicator color={theme.colors.textOnBrand} />
					) : (
						<ThemedText variant="bodyStrong" colorToken="textOnBrand">
							Crear cuenta
						</ThemedText>
					)}
				</Pressable>
			</SafeAreaView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	safeArea: { flex: 1, padding: 24, gap: 12 },
	input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
	typeLabel: { marginTop: 8 },
	typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
	chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
	submit: { borderRadius: 999, paddingVertical: 14, alignItems: "center", marginTop: 16 },
});
