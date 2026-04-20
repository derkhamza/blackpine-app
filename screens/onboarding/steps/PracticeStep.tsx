import { StyleSheet, Text, View } from "react-native";
import { PracticeType } from "blackpine-engine";
import { OnboardingShell } from "../OnboardingShell";
import { Choice } from "../Choice";
import { useT } from "../../../lib/useT";
import { colors, radii, spacing, typography } from "../../../lib/theme";

interface Props {
  value: PracticeType | "SALARIED" | null;
  onChange: (v: PracticeType | "SALARIED") => void;
  onNext: () => void;
  onBack: () => void;
}

export function PracticeStep({ value, onChange, onNext, onBack }: Props) {
  const { t } = useT();
  const isSalaried = value === "SALARIED";

  return (
    <OnboardingShell
      stepIndex={3}
      totalSteps={8}
      title={t("onboarding.practiceTitle")}
      subtitle={t("onboarding.practiceSub")}
      onNext={onNext}
      onBack={onBack}
      nextDisabled={!value || isSalaried}
    >
      <Choice
        label={t("onboarding.ownCabinet")}
        description={t("onboarding.ownCabinetDesc")}
        icon="🏢"
        selected={value === "CABINET_ONLY"}
        onPress={() => onChange("CABINET_ONLY")}
      />
      <Choice
        label={t("onboarding.clinicOnly")}
        description={t("onboarding.clinicOnlyDesc")}
        icon="🏥"
        selected={value === "CLINIC_ONLY"}
        onPress={() => onChange("CLINIC_ONLY")}
      />
      <Choice
        label={t("onboarding.both")}
        description={t("onboarding.bothDesc")}
        icon="🔀"
        selected={value === "MIXED"}
        onPress={() => onChange("MIXED")}
      />
      <Choice
        label={t("onboarding.salaried")}
        description={t("onboarding.salariedDesc")}
        icon="💼"
        selected={value === "SALARIED"}
        onPress={() => onChange("SALARIED")}
      />

      {isSalaried && (
        <View style={styles.warning}>
          <Text style={styles.warningTitle}>{t("onboarding.salariedWarning")}</Text>
          <Text style={styles.warningDetail}>{t("onboarding.salariedDetail")}</Text>
        </View>
      )}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  warning: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.warningSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "#E8C470",
  },
  warningTitle: { fontSize: 14, fontWeight: "600", color: colors.warning, marginBottom: 4 },
  warningDetail: { ...typography.caption, color: colors.warning, lineHeight: 19 },
});