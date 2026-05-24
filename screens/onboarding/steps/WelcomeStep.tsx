import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { OnboardingShell } from "../OnboardingShell";
import { useT } from "../../../lib/useT";
import { radii, spacing, ColorPalette } from "../../../lib/theme";
import { useColors } from "../../../lib/ThemeContext";
import { Icon } from "../../../lib/icons";

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();

  return (
    <OnboardingShell
      stepIndex={0}
      totalSteps={6}
      title={t("onboarding.welcome")}
      subtitle={t("onboarding.welcomeSub")}
      onNext={onNext}
      nextLabel={t("onboarding.start")}
    >
      <View style={styles.hero}>
        <View style={styles.iconBadge}>
          <Icon name="stethoscope" size={24} color={colors.brand} />
        </View>
        <Text style={styles.brandMark}>BLACKPINE</Text>
        <Text style={styles.brandSub}>CABINET</Text>
        <Text style={styles.tagline}>{t("onboarding.tagline")}</Text>
      </View>

      <View style={styles.promises}>
        {[
          { icon: "lock" as const,  text: t("onboarding.dataInMorocco") },
          { icon: "checkCircle" as const, text: t("onboarding.approvedByExperts") },
          { icon: "zap" as const,   text: t("onboarding.freeTrial") },
        ].map(({ icon, text }) => (
          <View key={text} style={styles.promiseRow}>
            <View style={styles.promiseIconWrap}>
              <Icon name={icon} size={15} color={colors.brand} />
            </View>
            <Text style={styles.promiseText}>{text}</Text>
          </View>
        ))}
      </View>
    </OnboardingShell>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  hero: { alignItems: "center", marginBottom: spacing.xl, paddingTop: spacing.md },
  iconBadge: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: colors.brandSoft,
    alignItems: "center", justifyContent: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.brand + "25",
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 6, elevation: 3,
  },
  brandMark: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 5,
    color: colors.brand,
  },
  brandSub: {
    fontSize: 9,
    letterSpacing: 4,
    color: colors.gold,
    fontWeight: "700",
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  promises: { gap: spacing.sm },
  promiseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  promiseIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: colors.brandSoft,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  promiseText: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.textPrimary },
});
