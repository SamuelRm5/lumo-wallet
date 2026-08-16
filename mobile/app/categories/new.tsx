import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { createCategory, type CategoryKind } from "@/api/categories";
import { ApiError } from "@/api/client";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { categoryIconOptions } from "@/lib/categoryIcons";
import { useTheme } from "@/theme";

export default function NewCategoryScreen() {
	const theme = useTheme();
	const router = useRouter();
	const { kind: initialKind } = useLocalSearchParams<{ kind?: CategoryKind }>();

	const [name, setName] = useState("");
	const [kind, setKind] = useState<CategoryKind>(initialKind === "income" ? "income" : "expense");
	const [icon, setIcon] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleCreate = async () => {
		setError(null);
		setSaving(true);
		try {
			await createCategory({ name: name.trim(), icon, kind });
			router.back();
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "No se pudo crear la categoría");
			setSaving(false);
		}
	};

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea}>
				<ScrollView contentContainerStyle={styles.scrollContent}>
					<TextInput
						value={name}
						onChangeText={setName}
						placeholder="Nombre"
						placeholderTextColor={theme.colors.textSubtle}
						editable={!saving}
						style={[styles.input, { borderColor: theme.colors.borderSubtle, color: theme.colors.textStrong }]}
					/>

					<ThemedText variant="label" colorToken="textMuted" style={styles.sectionLabel}>
						Tipo
					</ThemedText>
					<View style={styles.chipRow}>
						<Pressable
							onPress={() => setKind("expense")}
							style={[styles.chip, { backgroundColor: kind === "expense" ? theme.colors.interactiveBrand : theme.colors.interactiveSoft }]}>
							<ThemedText variant="label" colorToken={kind === "expense" ? "textOnBrand" : "textBody"}>
								Gasto
							</ThemedText>
						</Pressable>
						<Pressable
							onPress={() => setKind("income")}
							style={[styles.chip, { backgroundColor: kind === "income" ? theme.colors.interactiveBrand : theme.colors.interactiveSoft }]}>
							<ThemedText variant="label" colorToken={kind === "income" ? "textOnBrand" : "textBody"}>
								Ingreso
							</ThemedText>
						</Pressable>
					</View>

					<ThemedText variant="label" colorToken="textMuted" style={styles.sectionLabel}>
						Ícono
					</ThemedText>
					<View style={styles.iconGrid}>
						{categoryIconOptions.map((option) => {
							const Icon = option.icon;
							const active = icon === option.id;
							return (
								<Pressable
									key={option.id}
									onPress={() => setIcon(active ? null : option.id)}
									style={[
										styles.iconOption,
										{ backgroundColor: active ? theme.colors.interactiveBrand : theme.colors.interactiveSoft },
									]}>
									<Icon size={20} color={active ? theme.colors.textOnBrand : theme.colors.textBody} />
								</Pressable>
							);
						})}
					</View>

					{error && (
						<ThemedText variant="body" colorToken="statusDanger">
							{error}
						</ThemedText>
					)}

					<Pressable
						onPress={handleCreate}
						disabled={!name.trim() || saving}
						style={[styles.submit, { backgroundColor: theme.colors.interactiveBrand, opacity: !name.trim() || saving ? 0.5 : 1 }]}>
						{saving ? (
							<ActivityIndicator color={theme.colors.textOnBrand} />
						) : (
							<ThemedText variant="bodyStrong" colorToken="textOnBrand">
								Crear categoría
							</ThemedText>
						)}
					</Pressable>
				</ScrollView>
			</SafeAreaView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	safeArea: { flex: 1 },
	scrollContent: { padding: 24, gap: 12 },
	input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
	sectionLabel: { marginTop: 8 },
	chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
	chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
	iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
	iconOption: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
	submit: { borderRadius: 999, paddingVertical: 14, alignItems: "center", marginTop: 16 },
});
