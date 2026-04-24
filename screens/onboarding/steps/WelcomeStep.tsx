import { StyleSheet, Text, View } from "react-native";
import { OnboardingShell } from "../OnboardingShell";
import { useT } from "../../../lib/useT";
import { colors, spacing } from "../../../lib/theme";

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  const { t } = useT();

  return (
    <OnboardingShell
      stepIndex={0}
      totalSteps={9}
      title={t("onboarding.welcome")}
      subtitle={t("onboarding.welcomeSub")}
      onNext={onNext}
      nextLabel={t("onboarding.start")}
    >
      <View style={styles.hero}>
        <Text style={styles.brandMark}>BLACKPINE</Text>
        <Text style={styles.tagline}>{t("onboarding.tagline")}</Text>
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
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
});