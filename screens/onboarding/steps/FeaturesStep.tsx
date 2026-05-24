import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { OnboardingShell } from "../OnboardingShell";
import { useT } from "../../../lib/useT";
import { radii, spacing, ColorPalette } from "../../../lib/theme";
import { useColors } from "../../../lib/ThemeContext";

const FEATURES = [
  {
    icon: "💰",
    key: "featureFinances",
    descKey: "featureFinancesDesc",
  },
  {
    icon: "📅",
    key: "featureAgenda",
    descKey: "featureAgendaDesc",
  },
  {
    icon: "👥",
    key: "featurePatients",
    descKey: "featurePatientsDesc",
  },
  {
    icon: "☁️",
    key: "featureSync",
    descKey: "featureSyncDesc",
  },
];

interface Props {
  onStart: () => void;
  onBack: () => void;
}

export function FeaturesStep({ onStart, onBack }: Props) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();

  return (
    <OnboardingShell
      stepIndex={5}
      totalSteps={6}
      title={t("onboarding.featuresTitle")}
      subtitle={t("onboarding.featuresSub")}
      onBack={onBack}
      onNext={onStart}
      nextLabel={t("onboarding.letsGo")}
    >
      <View style={styles.list}>
        {FEATURES.map(({ icon, key, descKey }) => (
          <View key={key} style={styles.card}>
            <Text style={styles.icon}>{icon}</Text>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{t(`onboarding.${key}`)}</Text>
              <Text style={styles.cardDesc}>{t(`onboarding.${descKey}`)}</Text>
            </View>
          </View>
        ))}
      </View>
    </OnboardingShell>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  list: { gap: spacing.sm },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: { fontSize: 28, width: 40, textAlign: "center" },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, marginBottom: 2 },
  cardDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
});
