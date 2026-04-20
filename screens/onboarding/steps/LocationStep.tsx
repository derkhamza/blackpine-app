import { StyleSheet, Text, TextInput, View } from "react-native";
import { CommuneType } from "blackpine-engine";
import { OnboardingShell } from "../OnboardingShell";
import { Choice } from "../Choice";
import { useT } from "../../../lib/useT";
import { colors, radii, spacing, typography } from "../../../lib/theme";

interface Props {
  commune: string;
  communeType: CommuneType | null;
  onChangeCommune: (v: string) => void;
  onChangeType: (v: CommuneType) => void;
  onNext: () => void;
  onBack: () => void;
}

export function LocationStep({ commune, communeType, onChangeCommune, onChangeType, onNext, onBack }: Props) {
  const { t } = useT();

  return (
    <OnboardingShell
      stepIndex={4}
      totalSteps={8}
      title={t("onboarding.locationTitle")}
      subtitle={t("onboarding.locationSub")}
      onNext={onNext}
      onBack={onBack}
      nextDisabled={!commune.trim() || !communeType}
    >
      <View style={{ marginBottom: spacing.lg }}>
        <Text style={styles.label}>{t("onboarding.cityLabel")}</Text>
        <TextInput
          style={styles.input}
          value={commune}
          onChangeText={onChangeCommune}
          placeholder={t("onboarding.cityPlaceholder")}
          placeholderTextColor={colors.textTertiary}
        />
      </View>

      <Text style={styles.label}>{t("onboarding.zoneType")}</Text>
      <Choice
        label={t("onboarding.urbanZone")}
        description={t("onboarding.urbanDesc")}
        icon="🏙️"
        selected={communeType === "URBAN"}
        onPress={() => onChangeType("URBAN")}
      />
      <Choice
        label={t("onboarding.ruralZone")}
        description={t("onboarding.ruralDesc")}
        icon="🌾"
        selected={communeType === "RURAL"}
        onPress={() => onChangeType("RURAL")}
      />
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: 6, fontWeight: "600" },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    padding: 14, fontSize: 16, backgroundColor: colors.surface, color: colors.textPrimary,
  },
});