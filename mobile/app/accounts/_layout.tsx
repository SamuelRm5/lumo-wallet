import { Stack } from "expo-router";

// Cuentas vive dentro de Ajustes y también se llega desde el dashboard tocando
// una cuenta (docs/APP_MOVIL.md §5): un stack propio, referenciado como una
// sola pantalla "accounts" desde el Stack.Protected raíz.
export default function AccountsLayout() {
	return (
		<Stack screenOptions={{ headerShown: true }}>
			<Stack.Screen name="index" options={{ title: "Cuentas" }} />
			<Stack.Screen name="new" options={{ title: "Nueva cuenta", presentation: "modal" }} />
			<Stack.Screen name="[id]" options={{ title: "Cuenta" }} />
		</Stack>
	);
}
