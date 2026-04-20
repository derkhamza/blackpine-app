import { StyleSheet, Text, View } from "react-native";
import { OnboardingShell } from "../OnboardingShell";
import { useT } from "../../../lib/useT";
import { colors, radii, spacing, typography } from "../../../lib/theme";

export function TrustStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { t } = useT();

  return (
    <OnboardingShell
      stepIndex={1}
      totalSteps={8}
      title={t("onboarding.trustTitle")}
      subtitle={t("onboarding.trustSub")}
      onNext={onNext}
      onBack={onBack}
    >
      <View style={styles.list}>
        <PromiseCard
          icon="🔒"
          title={t("onboarding.dataInMorocco")}
          detail={t("onboarding.dataInMoroccoDetail")}
        />
        <PromiseCard
          icon="✓"
          title={t("onboarding.approvedByExperts")}
          detail={t("onboarding.approvedDetail")}
        />
        <PromiseCard
          icon="🎁"
          title={t("onboarding.freeTrial")}
          detail={t("onboarding.freeTrialDetail")}
        />
      </View>
    </OnboardingShell>
  );
}

function PromiseCard({ icon, title, detail }: { icon: string; title: string; detail: string }) {
  return (
    <View style={styles.item}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemDetail}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  item: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "flex-start",
  },
  icon: { fontSize: 24, marginTop: 2 },
  itemTitle: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  itemDetail: { ...typography.caption, color: colors.textSecondary, marginTop: 2, lineHeight: 19 },
});