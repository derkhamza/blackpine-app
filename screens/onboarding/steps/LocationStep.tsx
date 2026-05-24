import { StyleSheet, Text, Pressable, View } from "react-native";
import { CommuneType } from "blackpine-engine";
import { OnboardingShell } from "../OnboardingShell";
import { Choice } from "../Choice";
import { useT } from "../../../lib/useT";
import { radii, spacing, typography, ColorPalette } from "../../../lib/theme";
import { useColors } from "../../../lib/ThemeContext";
import { useState, useMemo } from "react";
import { CityPicker } from "../../../components/CityPicker";

interface Props {
  commune: string;
  communeType: CommuneType | null;
  onChangeCommune: (v: string) => void;
  onChangeType: (v: CommuneType) => void;
  onNext: () => void;
  onBack: () => void;
}

export function LocationStep({ commune, communeType, onChangeCommune, onChangeType, onNext, onBack }: Props) {
  const colors = useColors();const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();
  const [cityPickerOpen, setCityPickerOpen] = useState(false); 
  return (
    <OnboardingShell
      stepIndex={5}
      totalSteps={9}
      title={t("onboarding.locationTitle")}
      subtitle={t("onboarding.locationSub")}
      onNext={onNext}
      onBack={onBack}
      nextDisabled={!commune.trim() || !communeType}
    >
      <View style={{ marginBottom: spacing.lg }}>
        <Text style={styles.label}>{t("onboarding.cityLabel")}</Text>
        <Pressable style={styles.input} onPress={() => setCityPickerOpen(true)}>
          <Text style={{ fontSize: 16, color: commune ? colors.textPrimary : colors.textTertiary }}>
            {commune || t("onboarding.cityPlaceholder")}
          </Text>
        </Pressable>
        <CityPicker
          visible={cityPickerOpen}
          value={commune}
          onSelect={onChangeCommune}
          onClose={() => setCityPickerOpen(false)}
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

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: 6, fontWeight: "600" },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    padding: 14, fontSize: 16, backgroundColor: colors.surface, color: colors.textPrimary,
  },
});