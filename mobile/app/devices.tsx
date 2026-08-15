import { useCallback, useState } from "react";
import { Stack, useFocusEffect } from "expo-router";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/api/client";
import { deleteDevice, listDevices, type Device } from "@/api/devices";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { pushSupportedHere, registerForPush } from "@/lib/push";
import { useTheme } from "@/theme";

export default function DevicesScreen() {
	const theme = useTheme();
	const [devices, setDevices] = useState<Device[] | null>(null);
	const [registering, setRegistering] = useState(false);
	const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

	const support = pushSupportedHere();

	const load = useCallback(async () => {
		try {
			const res = await listDevices();
			setDevices(res.data);
		} catch (err) {
			setFeedback({ kind: "error", text: err instanceof ApiError ? err.message : "No se pudieron cargar los dispositivos" });
			setDevices([]);
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			load();
		}, [load]),
	);

	const handleRegister = async () => {
		setFeedback(null);
		setRegistering(true);
		try {
			const result = await registerForPush();
			if (result.status === "registered") {
				setFeedback({ kind: "ok", text: "Este teléfono quedó registrado." });
				await load();
			} else if (result.status === "denied") {
				setFeedback({ kind: "error", text: "Sin permiso de notificaciones no se puede registrar el teléfono." });
			} else {
				setFeedback({ kind: "error", text: result.reason });
			}
		} catch (err) {
			setFeedback({ kind: "error", text: err instanceof ApiError ? err.message : "No se pudo registrar el teléfono" });
		} finally {
			setRegistering(false);
		}
	};

	const handleDelete = (device: Device) => {
		Alert.alert("Quitar dispositivo", "Dejará de recibir avisos de las reglas recurrentes.", [
			{ text: "Cancelar", style: "cancel" },
			{
				text: "Quitar",
				style: "destructive",
				onPress: async () => {
					try {
						await deleteDevice(device.id);
						await load();
					} catch (err) {
						Alert.alert("No se pudo quitar", err instanceof ApiError ? err.message : "Error desconocido");
					}
				},
			},
		]);
	};

	return (
		<ThemedView style={styles.container}>
			<Stack.Screen options={{ title: "Dispositivos" }} />
			<SafeAreaView style={styles.safeArea} edges={["bottom"]}>
				<ScrollView contentContainerStyle={styles.content}>
					<ThemedText variant="body" colorToken="textMuted">
						Los avisos son solo para las reglas recurrentes.
					</ThemedText>

					{!support.supported && (
						<ThemedView colorToken="surfaceCard" style={[styles.card, { borderColor: theme.colors.borderSubtle }]}>
							<ThemedText variant="label" colorToken="statusDanger">
								Push no disponible aquí
							</ThemedText>
							<ThemedText variant="caption" colorToken="textMuted">
								{support.reason}
							</ThemedText>
						</ThemedView>
					)}

					{devices === null ? (
						<ActivityIndicator color={theme.colors.interactiveBrand} style={styles.loader} />
					) : devices.length === 0 ? (
						<ThemedText variant="body" colorToken="textSubtle">
							No hay dispositivos registrados.
						</ThemedText>
					) : (
						devices.map((device) => (
							<View key={device.id} style={[styles.row, { borderColor: theme.colors.borderSubtle }]}>
								<View style={styles.rowText}>
									<ThemedText variant="bodyStrong">{device.platform === "ios" ? "iPhone" : "Android"}</ThemedText>
									{/* El token completo no aporta nada al usuario y ocupa toda la
									    fila: basta el final para distinguir un teléfono de otro. */}
									<ThemedText variant="caption" colorToken="textSubtle">
										…{device.expoPushToken.slice(-12)}
									</ThemedText>
								</View>
								<Pressable onPress={() => handleDelete(device)}>
									<ThemedText variant="label" colorToken="statusDanger">
										Quitar
									</ThemedText>
								</Pressable>
							</View>
						))
					)}

					{feedback && (
						<ThemedText variant="caption" colorToken={feedback.kind === "ok" ? "valuePositive" : "statusDanger"}>
							{feedback.text}
						</ThemedText>
					)}

					<Pressable
						onPress={handleRegister}
						disabled={registering}
						style={[styles.button, { backgroundColor: theme.colors.interactiveBrand, opacity: registering ? 0.5 : 1 }]}>
						{registering ? (
							<ActivityIndicator color={theme.colors.textOnBrand} />
						) : (
							<ThemedText variant="bodyStrong" colorToken="textOnBrand">
								Registrar este teléfono
							</ThemedText>
						)}
					</Pressable>
				</ScrollView>
			</SafeAreaView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	safeArea: { flex: 1 },
	content: { padding: 24, gap: 12 },
	card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 4 },
	loader: { marginTop: 24 },
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		borderWidth: 1,
		borderRadius: 18,
		paddingHorizontal: 16,
		paddingVertical: 14,
	},
	rowText: { flex: 1, gap: 2 },
	button: { borderRadius: 999, paddingVertical: 14, alignItems: "center", marginTop: 8 },
});
