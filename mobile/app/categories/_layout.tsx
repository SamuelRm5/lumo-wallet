import { Stack } from "expo-router";

export default function CategoriesLayout() {
	return (
		<Stack screenOptions={{ headerShown: true }}>
			<Stack.Screen name="index" options={{ title: "Categorías" }} />
			<Stack.Screen name="new" options={{ title: "Nueva categoría", presentation: "modal" }} />
			<Stack.Screen name="[id]" options={{ title: "Categoría" }} />
		</Stack>
	);
}
