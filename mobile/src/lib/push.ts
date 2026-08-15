import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

import { registerDevice } from "@/api/devices";

// `expo-notifications` no se importa arriba a propósito: en Expo Go con SDK 53+
// el módulo lanza al **cargarse**, no al usarse, y eso tumbaba la pantalla de
// dispositivos entera antes de poder listar nada. Se carga bajo demanda, solo
// donde el push está soportado.
type NotificationsModule = typeof import("expo-notifications");

// Registro del token de push (docs/APP_MOVIL.md §4.9). Las notificaciones son
// solo para recurrentes: no hay otro tipo que pedir permiso de recibir.

export type PushRegistration =
	| { status: "registered"; token: string }
	| { status: "denied" }
	| { status: "unsupported"; reason: string };

// Desde el SDK 53, Expo Go en Android ya no entrega tokens de push remoto: hace
// falta una development build (mobile/plans/FASE-6.md, paso 1). Se detecta el
// entorno en vez de intentarlo y dejar que falle, para poder decirle al usuario
// por qué no está registrado en lugar de mostrarle un error de librería.
export function pushSupportedHere(): { supported: boolean; reason: string } {
	if (!Device.isDevice) {
		return { supported: false, reason: "El emulador no recibe notificaciones push." };
	}
	if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
		return {
			supported: false,
			reason: "Expo Go no entrega tokens de push en Android desde el SDK 53. Hace falta una development build.",
		};
	}
	return { supported: true, reason: "" };
}

export async function registerForPush(): Promise<PushRegistration> {
	const support = pushSupportedHere();
	if (!support.supported) return { status: "unsupported", reason: support.reason };

	const Notifications: NotificationsModule = await import("expo-notifications");

	if (Platform.OS === "android") {
		// Android exige un canal para poder mostrar la notificación; sin él llega
		// pero no se ve.
		await Notifications.setNotificationChannelAsync("default", {
			name: "Recurrentes",
			importance: Notifications.AndroidImportance.DEFAULT,
		});
	}

	const existing = await Notifications.getPermissionsAsync();
	const granted =
		existing.granted || (await Notifications.requestPermissionsAsync()).granted;
	if (!granted) return { status: "denied" };

	// El projectId es obligatorio fuera de Expo Go para resolver a qué proyecto
	// pertenece el token.
	const projectId = Constants.expoConfig?.extra?.eas?.projectId;
	const { data: token } = await Notifications.getExpoPushTokenAsync(
		projectId ? { projectId } : undefined,
	);

	await registerDevice(token, Platform.OS === "ios" ? "ios" : "android");
	return { status: "registered", token };
}
