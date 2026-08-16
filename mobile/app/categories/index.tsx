import { useCallback, useState } from "react";
import { Link, useFocusEffect } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { listCategories, type Category, type CategoryKind } from "@/api/categories";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { useTheme } from "@/theme";

export default function CategoriesListScreen() {
	const theme = useTheme();
	const [kind, setKind] = useState<CategoryKind>("expense");
	const [categories, setCategories] = useState<Category[]>([]);
	const [loading, setLoading] = useState(true);

	useFocusEffect(
		useCallback(() => {
			setLoading(true);
			listCategories(kind).then((res) => {
				setCategories(res.data);
				setLoading(false);
			});
		}, [kind]),
	);

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea} edges={["bottom"]}>
				<View style={styles.filters}>
					<Pressable
						onPress={() => setKind("expense")}
						style={[styles.chip, { backgroundColor: kind === "expense" ? theme.colors.interactiveBrand : theme.colors.interactiveSoft }]}>
						<ThemedText variant="label" colorToken={kind === "expense" ? "textOnBrand" : "textBody"}>
							Gastos
						</ThemedText>
					</Pressable>
					<Pressable
						onPress={() => setKind("income")}
						style={[styles.chip, { backgroundColor: kind === "income" ? theme.colors.interactiveBrand : theme.colors.interactiveSoft }]}>
						<ThemedText variant="label" colorToken={kind === "income" ? "textOnBrand" : "textBody"}>
							Ingresos
						</ThemedText>
					</Pressable>
				</View>

				{loading ? (
					<View style={styles.centered}>
						<ActivityIndicator color={theme.colors.interactiveBrand} />
					</View>
				) : (
					<ScrollView contentContainerStyle={styles.list}>
						{categories.map((category) => {
							const Icon = getCategoryIcon(category.icon);
							return (
								<Link
									key={category.id}
									// No hay GET /categories/:id en el contrato (docs/APP_MOVIL.md
									// §4.6 solo lista, crea, edita y borra): se pasan los datos ya
									// conocidos como parámetros en vez de pedirlos de nuevo.
									href={{
										pathname: "/categories/[id]",
										params: { id: category.id, name: category.name, icon: category.icon ?? "", kind: category.kind },
									}}
									asChild>
									<Pressable style={styles.row}>
										<View style={[styles.iconChip, { backgroundColor: theme.colors.surfaceSunken }]}>
											<Icon size={18} color={theme.colors.textBody} />
										</View>
										<ThemedText variant="bodyStrong">{category.name}</ThemedText>
									</Pressable>
								</Link>
							);
						})}
					</ScrollView>
				)}

				<Link href={{ pathname: "/categories/new", params: { kind } }} asChild>
					<Pressable style={{ margin: 16, borderRadius: 999, paddingVertical: 14, alignItems: "center", backgroundColor: theme.colors.interactiveBrand }}>
						<ThemedText variant="bodyStrong" colorToken="textOnBrand">
							Nueva categoría
						</ThemedText>
					</Pressable>
				</Link>
			</SafeAreaView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	safeArea: { flex: 1 },
	filters: { flexDirection: "row", gap: 8, padding: 16, paddingBottom: 8 },
	chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
	centered: { flex: 1, alignItems: "center", justifyContent: "center" },
	list: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
	row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
	iconChip: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
