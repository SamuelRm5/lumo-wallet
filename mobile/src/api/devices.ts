import { apiRequest } from "./client";

// docs/APP_MOVIL.md §4.9. Formas tomadas de server/src/schemas/devices.schema.js.
// Las notificaciones son solo para recurrentes: no hay otro tipo que registrar.

export type DevicePlatform = "android" | "ios";

export type Device = {
	id: number;
	expoPushToken: string;
	platform: DevicePlatform;
	lastSeenAt: string | null;
	createdAt: string;
};

export function listDevices() {
	return apiRequest<{ data: Device[] }>("/devices");
}

// Repetir el mismo token no duplica: el servidor lo reasigna. El cliente no
// necesita deduplicar (docs/APP_MOVIL.md §4.9).
export function registerDevice(expoPushToken: string, platform: DevicePlatform) {
	return apiRequest<Device>("/devices", { method: "POST", body: { expoPushToken, platform } });
}

export function deleteDevice(id: number) {
	return apiRequest<void>(`/devices/${id}`, { method: "DELETE" });
}
