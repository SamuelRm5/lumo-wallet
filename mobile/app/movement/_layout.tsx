import { Stack } from "expo-router";

// Segmento "movement" (singular) para no chocar con la pestaña "movements"
// (docs/APP_MOVIL.md §5: Movimientos vive en el tab bar; esto es su detalle).
export default function MovementLayout() {
	return (
		<Stack screenOptions={{ headerShown: true }}>
			<Stack.Screen name="[id]" options={{ title: "Movimiento" }} />
		</Stack>
	);
}
