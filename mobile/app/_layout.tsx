import { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { AppState } from "react-native";

import { useSessionStore } from "@/store/session";
import { useSyncStore } from "@/store/sync";
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
	const isAuthenticatedNow = status === "authenticated";

	// Sincronización incremental al abrir la app y al volver del background
	// (docs/APP_MOVIL.md §4.10). No bloquea el arranque: cada pantalla ya pide
	// lo suyo, y esto solo mantiene el corte al día y reporta los borrados.
	useEffect(() => {
		if (!isAuthenticatedNow) return;

		const sync = useSyncStore.getState().sync;
		sync();

		const subscription = AppState.addEventListener("change", (next) => {
			if (next === "active") sync();
		});
		return () => subscription.remove();
	}, [isAuthenticatedNow]);

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
					<Stack.Screen name="movement" />
					<Stack.Screen name="recurring" />
				</Stack.Protected>
				<Stack.Protected guard={!isAuthenticated}>
					<Stack.Screen name="login" />
				</Stack.Protected>
			</Stack>
		</>
	);
}
