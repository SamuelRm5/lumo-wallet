import { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";

import { useSessionStore } from "@/store/session";
import { googleFontsToLoad } from "@/theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
	const [fontsLoaded, fontError] = useFonts(googleFontsToLoad);
	const status = useSessionStore((state) => state.status);
	const bootstrap = useSessionStore((state) => state.bootstrap);

	useEffect(() => {
		bootstrap();
		// Se corre una sola vez al montar la app: intenta renovar la sesión con
		// el refresh token guardado, sin pedirle nada al usuario todavía.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const sessionReady = status !== "checking";

	useEffect(() => {
		if (fontsLoaded || fontError) {
			if (sessionReady) {
				SplashScreen.hideAsync();
			}
		}
	}, [fontsLoaded, fontError, sessionReady]);

	if ((!fontsLoaded && !fontError) || !sessionReady) {
		return null;
	}

	const isAuthenticated = status === "authenticated";

	return (
		<>
			<StatusBar style="auto" />
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Protected guard={isAuthenticated}>
					<Stack.Screen name="(tabs)" />
					<Stack.Screen name="register-operation" options={{ presentation: "modal", headerShown: true, title: "Registrar" }} />
					<Stack.Screen name="accounts" />
					<Stack.Screen name="categories" />
				</Stack.Protected>
				<Stack.Protected guard={!isAuthenticated}>
					<Stack.Screen name="login" />
				</Stack.Protected>
			</Stack>
		</>
	);
}
