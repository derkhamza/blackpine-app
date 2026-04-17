import { StyleSheet, Text, View } from "react-native";
import { OnboardingShell } from "../OnboardingShell";
import { colors, spacing, typography } from "../../../lib/theme";

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <OnboardingShell
      stepIndex={0}
      totalSteps={8}
      title="Bienvenue chez Blackpine Cabinet"
      subtitle="Gérez vos finances et vos impôts, sans stress et sans comptable entre chaque question."
      onNext={onNext}
      nextLabel="Commencer"
    >
      <View style={styles.hero}>
        <Text style={styles.brandMark}>BLACKPINE</Text>
        <Text style={styles.tagline}>
          Conçu pour les professionnels de santé au Maroc
        </Text>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, alignItems: "center", justifyContent: "center" },
  brandMark: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 4,
    color: colors.brand,
    marginBottom: spacing.md,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
});