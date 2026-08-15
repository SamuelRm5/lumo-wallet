import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { createRecurringRule } from "@/api/recurringRules";
import { RecurringRuleForm } from "@/components/recurring-rule-form";
import { ThemedView } from "@/components/themed-view";

export default function NewRecurringRuleScreen() {
	const router = useRouter();

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea} edges={["bottom"]}>
				<RecurringRuleForm
					submitLabel="Crear regla"
					onSubmit={async (input) => {
						await createRecurringRule(input);
						router.back();
					}}
				/>
			</SafeAreaView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	safeArea: { flex: 1 },
});
