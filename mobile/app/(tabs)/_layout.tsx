import { Tabs, useRouter } from "expo-router";
import { CircleUserRound, House, List, PlusCircle, PieChart } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme";

// Cuatro pestañas con el registro como acción central (docs/APP_MOVIL.md §5).
// El botón central no navega a una pantalla propia: intercepta el toque y abre
// /register-operation como modal, así que su ruta (register-trigger) nunca se ve.
export default function TabsLayout() {
	const theme = useTheme();
	const router = useRouter();
	const insets = useSafeAreaInsets();

	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarActiveTintColor: theme.colors.textBrand,
				tabBarInactiveTintColor: theme.colors.textMuted,
				tabBarStyle: {
					backgroundColor: theme.colors.surfaceCard,
					borderTopColor: theme.colors.borderSubtle,
					// Al fijar `height` se pierde el padding automático que
					// react-navigation agrega para la barra de navegación del
					// sistema (Android): sin esto, los botones de atrás/inicio
					// tapan la mitad de las pestañas.
					height: theme.chrome.tabBarHeight + insets.bottom,
					paddingBottom: insets.bottom,
					paddingTop: 8,
				},
			}}>
			<Tabs.Screen
				name="index"
				options={{
					title: "Inicio",
					tabBarIcon: ({ color, size }) => <House color={color} size={size} />,
				}}
			/>
			<Tabs.Screen
				name="movements"
				options={{
					title: "Movimientos",
					tabBarIcon: ({ color, size }) => <List color={color} size={size} />,
				}}
			/>
			<Tabs.Screen
				name="register-trigger"
				options={{
					title: "",
					tabBarIcon: ({ color, size }) => <PlusCircle color={theme.colors.interactiveBrand} size={size + 12} />,
				}}
				listeners={() => ({
					tabPress: (event) => {
						event.preventDefault();
						router.push("/register-operation");
					},
				})}
			/>
			<Tabs.Screen
				name="reports"
				options={{
					title: "Reportes",
					tabBarIcon: ({ color, size }) => <PieChart color={color} size={size} />,
				}}
			/>
			<Tabs.Screen
				name="settings"
				options={{
					title: "Ajustes",
					tabBarIcon: ({ color, size }) => <CircleUserRound color={color} size={size} />,
				}}
			/>
		</Tabs>
	);
}
