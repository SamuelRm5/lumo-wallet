import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/api/client";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useSessionStore } from "@/store/session";
import { useTheme } from "@/theme";

export default function LoginScreen() {
	const theme = useTheme();
	const loginWithCredentials = useSessionStore((state) => state.loginWithCredentials);

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async () => {
		setError(null);
		setSubmitting(true);
		try {
			await loginWithCredentials(email.trim(), password);
			// Al quedar autenticado, el guard de app/_layout.tsx saca esta pantalla sola.
		} catch (err) {
			// `message` ya viene en español y es mostrable tal cual (docs/APP_MOVIL.md §3).
			setError(err instanceof ApiError ? err.message : "No se pudo conectar con el servidor");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<ThemedView style={styles.container}>
			<KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
				<SafeAreaView style={styles.safeArea}>
					<ThemedText variant="display" style={styles.title}>
						lumo
					</ThemedText>
					<ThemedText variant="body" colorToken="textMuted" style={styles.subtitle}>
						Iniciar sesión
					</ThemedText>

					<TextInput
						value={email}
						onChangeText={setEmail}
						placeholder="Email"
						placeholderTextColor={theme.colors.textSubtle}
						autoCapitalize="none"
						autoComplete="email"
						keyboardType="email-address"
						editable={!submitting}
						style={[styles.input, { borderColor: theme.colors.borderSubtle, color: theme.colors.textStrong }]}
					/>
					<TextInput
						value={password}
						onChangeText={setPassword}
						placeholder="Contraseña"
						placeholderTextColor={theme.colors.textSubtle}
						secureTextEntry
						autoComplete="password"
						editable={!submitting}
						style={[styles.input, { borderColor: theme.colors.borderSubtle, color: theme.colors.textStrong }]}
					/>

					{error && (
						<ThemedText variant="body" colorToken="statusDanger" style={styles.error}>
							{error}
						</ThemedText>
					)}

					<Pressable
						onPress={handleSubmit}
						disabled={submitting || !email || !password}
						style={({ pressed }) => [
							styles.button,
							{
								backgroundColor: theme.colors.interactiveBrand,
								opacity: submitting || !email || !password ? 0.6 : pressed ? 0.9 : 1,
							},
						]}>
						{submitting ? (
							<ActivityIndicator color={theme.colors.textOnBrand} />
						) : (
							<ThemedText variant="bodyStrong" colorToken="textOnBrand">
								Entrar
							</ThemedText>
						)}
					</Pressable>
				</SafeAreaView>
			</KeyboardAvoidingView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	flex: { flex: 1 },
	safeArea: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
	title: { marginBottom: 4 },
	subtitle: { marginBottom: 24 },
	input: {
		borderWidth: 1,
		borderRadius: 14,
		paddingHorizontal: 16,
		paddingVertical: 14,
		fontSize: 15,
	},
	error: { marginTop: 4 },
	button: { borderRadius: 999, paddingVertical: 14, alignItems: "center", marginTop: 12 },
});
