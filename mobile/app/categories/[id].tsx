import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { deleteCategory, updateCategory, type CategoryKind } from "@/api/categories";
import { ApiError } from "@/api/client";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { categoryIconOptions } from "@/lib/categoryIcons";
import { useTheme } from "@/theme";

// No hay GET /categories/:id (docs/APP_MOVIL.md §4.6): los datos llegan como
// parámetros de navegación desde la lista, que ya los tiene.
export default function CategoryDetailScreen() {
	const params = useLocalSearchParams<{ id: string; name: string; icon: string; kind: CategoryKind }>();
	const categoryId = Number(params.id);
	const originalName = params.name;
	const originalIcon = params.icon || null;

	const theme = useTheme();
	const router = useRouter();

	const [name, setName] = useState(originalName);
	const [icon, setIcon] = useState<string | null>(originalIcon);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const dirty = name !== originalName || icon !== originalIcon;

	const handleSave = async () => {
		setError(null);
		setSaving(true);
		try {
			await updateCategory(categoryId, { name, icon });
			router.back();
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "No se pudo guardar");
			setSaving(false);
		}
	};

	const handleDelete = () => {
		Alert.alert("Borrar categoría", `¿Borrar "${originalName}"? Las operaciones que la usaban la conservan.`, [
			{ text: "Cancelar", style: "cancel" },
			{
				text: "Borrar",
				style: "destructive",
				onPress: async () => {
					setDeleting(true);
					try {
						await deleteCategory(categoryId);
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
						{params.kind === "income" ? "Ingreso" : "Gasto"} · el tipo no se puede cambiar
					</ThemedText>

					<TextInput
						value={name}
						onChangeText={setName}
						placeholder="Nombre"
						placeholderTextColor={theme.colors.textSubtle}
						editable={!saving}
						style={[styles.input, { borderColor: theme.colors.borderSubtle, color: theme.colors.textStrong }]}
					/>

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
						onPress={handleSave}
						disabled={!dirty || saving}
						style={[styles.submit, { backgroundColor: theme.colors.interactiveBrand, opacity: !dirty || saving ? 0.5 : 1 }]}>
						{saving ? (
							<ActivityIndicator color={theme.colors.textOnBrand} />
						) : (
							<ThemedText variant="bodyStrong" colorToken="textOnBrand">
								Guardar
							</ThemedText>
						)}
					</Pressable>

					<Pressable
						onPress={handleDelete}
						disabled={deleting}
						style={[styles.deleteButton, { borderColor: theme.colors.borderSubtle, opacity: deleting ? 0.5 : 1 }]}>
						{deleting ? (
							<ActivityIndicator color={theme.colors.statusDanger} />
						) : (
							<ThemedText variant="bodyStrong" colorToken="statusDanger">
								Borrar categoría
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
	iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
	iconOption: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
	submit: { borderRadius: 999, paddingVertical: 14, alignItems: "center", marginTop: 16 },
	deleteButton: { borderRadius: 999, borderWidth: 1, paddingVertical: 14, alignItems: "center", marginTop: 12 },
});
