import { Stack } from "expo-router";

export default function RecurringLayout() {
	return (
		<Stack screenOptions={{ headerShown: true }}>
			<Stack.Screen name="index" options={{ title: "Recurrentes" }} />
			<Stack.Screen name="new" options={{ title: "Nueva regla", presentation: "modal" }} />
			<Stack.Screen name="[id]" options={{ title: "Regla" }} />
		</Stack>
	);
}
