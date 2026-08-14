import { useState } from "react";
import { Link } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { changePassword, updateMe } from "@/api/auth";
import { ApiError } from "@/api/client";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useSessionStore } from "@/store/session";
import { useTheme } from "@/theme";

// Perfil y cuentas (Fases 1 y 2). Categorías (Fase 3), recurrentes (Fase 5) y
// dispositivos (Fase 6) se agregan en sus fases respectivas.
export default function SettingsScreen() {
	const theme = useTheme();
	const user = useSessionStore((state) => state.user);

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea}>
				<ThemedText variant="title">Ajustes</ThemedText>

				<Link href="/accounts" asChild>
					<Pressable style={StyleSheet.flatten([styles.navRow, { borderColor: theme.colors.borderSubtle }])}>
						<ThemedText variant="bodyStrong">Cuentas</ThemedText>
						<ThemedText variant="body" colorToken="textMuted">
							›
						</ThemedText>
					</Pressable>
				</Link>

				<ThemedView colorToken="surfaceCard" style={[styles.card, { borderColor: theme.colors.borderSubtle }]}>
					<ProfileSection />
				</ThemedView>

				<ThemedView colorToken="surfaceCard" style={[styles.card, { borderColor: theme.colors.borderSubtle }]}>
					<PasswordSection />
				</ThemedView>

				<LogoutButton />

				<ThemedText variant="caption" colorToken="textSubtle" style={styles.footnote}>
					{user ? `Sesión de ${user.email}` : null}
				</ThemedText>
			</SafeAreaView>
		</ThemedView>
	);
}

function ProfileSection() {
	const theme = useTheme();
	const user = useSessionStore((state) => state.user);
	const refreshUser = useSessionStore((state) => state.refreshUser);

	const [name, setName] = useState(user?.name ?? "");
	const [email, setEmail] = useState(user?.email ?? "");
	const [saving, setSaving] = useState(false);
	const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

	const dirty = name !== (user?.name ?? "") || email !== (user?.email ?? "");

	const handleSave = async () => {
		setFeedback(null);
		setSaving(true);
		try {
			const changes: { name?: string; email?: string } = {};
			if (name !== user?.name) changes.name = name;
			if (email !== user?.email) changes.email = email;
			await updateMe(changes);
			await refreshUser();
			setFeedback({ kind: "ok", text: "Perfil actualizado" });
		} catch (err) {
			setFeedback({ kind: "error", text: err instanceof ApiError ? err.message : "No se pudo guardar" });
		} finally {
			setSaving(false);
		}
	};

	return (
		<>
			<ThemedText variant="heading">Perfil</ThemedText>
			<TextInput
				value={name}
				onChangeText={setName}
				placeholder="Nombre"
				placeholderTextColor={theme.colors.textSubtle}
				editable={!saving}
				style={[styles.input, { borderColor: theme.colors.borderSubtle, color: theme.colors.textStrong }]}
			/>
			<TextInput
				value={email}
				onChangeText={setEmail}
				placeholder="Email"
				placeholderTextColor={theme.colors.textSubtle}
				autoCapitalize="none"
				keyboardType="email-address"
				editable={!saving}
				style={[styles.input, { borderColor: theme.colors.borderSubtle, color: theme.colors.textStrong }]}
			/>
			{feedback && (
				<ThemedText variant="caption" colorToken={feedback.kind === "ok" ? "valuePositive" : "statusDanger"}>
					{feedback.text}
				</ThemedText>
			)}
			<Pressable
				onPress={handleSave}
				disabled={!dirty || saving}
				style={({ pressed }) => [
					styles.smallButton,
					{ backgroundColor: theme.colors.interactiveBrand, opacity: !dirty || saving ? 0.5 : pressed ? 0.9 : 1 },
				]}>
				{saving ? <ActivityIndicator color={theme.colors.textOnBrand} /> : <ThemedText variant="label" colorToken="textOnBrand">Guardar</ThemedText>}
			</Pressable>
		</>
	);
}

function PasswordSection() {
	const theme = useTheme();
	const clearLocalSession = useSessionStore((state) => state.clearLocalSession);

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleChangePassword = async () => {
		setError(null);
		setSaving(true);
		try {
			await changePassword({ currentPassword, newPassword });
			// Cierra todas las sesiones en el servidor, incluida esta: no tiene
			// sentido avisarle de vuelta con /auth/logout (docs/APP_MOVIL.md §4.1).
			await clearLocalSession();
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "No se pudo cambiar la contraseña");
			setSaving(false);
		}
	};

	return (
		<>
			<ThemedText variant="heading">Contraseña</ThemedText>
			<TextInput
				value={currentPassword}
				onChangeText={setCurrentPassword}
				placeholder="Contraseña actual"
				placeholderTextColor={theme.colors.textSubtle}
				secureTextEntry
				editable={!saving}
				style={[styles.input, { borderColor: theme.colors.borderSubtle, color: theme.colors.textStrong }]}
			/>
			<TextInput
				value={newPassword}
				onChangeText={setNewPassword}
				placeholder="Contraseña nueva"
				placeholderTextColor={theme.colors.textSubtle}
				secureTextEntry
				editable={!saving}
				style={[styles.input, { borderColor: theme.colors.borderSubtle, color: theme.colors.textStrong }]}
			/>
			{error && (
				<ThemedText variant="caption" colorToken="statusDanger">
					{error}
				</ThemedText>
			)}
			<Pressable
				onPress={handleChangePassword}
				disabled={!currentPassword || !newPassword || saving}
				style={({ pressed }) => [
					styles.smallButton,
					{ backgroundColor: theme.colors.interactiveBrand, opacity: !currentPassword || !newPassword || saving ? 0.5 : pressed ? 0.9 : 1 },
				]}>
				{saving ? <ActivityIndicator color={theme.colors.textOnBrand} /> : <ThemedText variant="label" colorToken="textOnBrand">Cambiar contraseña</ThemedText>}
			</Pressable>
		</>
	);
}

function LogoutButton() {
	const theme = useTheme();
	const logout = useSessionStore((state) => state.logout);
	const [loggingOut, setLoggingOut] = useState(false);

	return (
		<Pressable
			onPress={async () => {
				setLoggingOut(true);
				await logout();
			}}
			disabled={loggingOut}
			style={({ pressed }) => [
				styles.logoutButton,
				{ borderColor: theme.colors.borderSubtle, opacity: pressed ? 0.8 : 1 },
			]}>
			{loggingOut ? (
				<ActivityIndicator color={theme.colors.statusDanger} />
			) : (
				<ThemedText variant="bodyStrong" colorToken="statusDanger">
					Cerrar sesión
				</ThemedText>
			)}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	safeArea: { flex: 1, padding: 24, gap: 16 },
	card: { borderRadius: 24, borderWidth: 1, padding: 20, gap: 10 },
	navRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		borderWidth: 1,
		borderRadius: 18,
		paddingHorizontal: 20,
		paddingVertical: 16,
	},
	input: {
		borderWidth: 1,
		borderRadius: 14,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 15,
	},
	smallButton: { borderRadius: 999, paddingVertical: 12, alignItems: "center", marginTop: 4 },
	logoutButton: { borderRadius: 999, borderWidth: 1, paddingVertical: 14, alignItems: "center" },
	footnote: { textAlign: "center" },
});
