import { useState, useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { OnboardingShell } from "../OnboardingShell";
import { Choice } from "../Choice";
import { useT } from "../../../lib/useT";
import { radii, spacing, ColorPalette } from "../../../lib/theme";
import { useColors } from "../../../lib/ThemeContext";

interface Props {
  value: string | null;
  onChange: (iso: string) => void;
  onNext: () => void;
  onBack: () => void;
}

type Bucket = "LT_3Y" | "3_5Y" | "GT_5Y" | "EXACT";

function bucketToDate(bucket: Bucket): string {
  const now = new Date();
  if (bucket === "LT_3Y") now.setFullYear(now.getFullYear() - 1);
  if (bucket === "3_5Y") now.setFullYear(now.getFullYear() - 4);
  if (bucket === "GT_5Y") now.setFullYear(now.getFullYear() - 10);
  return now.toISOString().split("T")[0];
}

export function ActivityStep({ value, onChange, onNext, onBack }: Props) {
  const colors = useColors();const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const handleBucket = (b: Bucket) => {
    setBucket(b);
    if (b !== "EXACT") onChange(bucketToDate(b));
  };

  const onDateChange = (_: unknown, selected?: Date) => {
    if (Platform.OS !== "ios") setShowPicker(false);
    if (selected) onChange(selected.toISOString().split("T")[0]);
  };

  return (
    <OnboardingShell
      stepIndex={6}
      totalSteps={9}
      title={t("onboarding.activityTitle")}
      subtitle={t("onboarding.activitySub")}
      onNext={onNext}
      onBack={onBack}
      nextDisabled={!value}
    >
      <Choice
        label={t("onboarding.lessThan3")}
        description={t("onboarding.lessThan3Desc")}
        icon="🌱"
        selected={bucket === "LT_3Y"}
        onPress={() => handleBucket("LT_3Y")}
      />
      <Choice
        label={t("onboarding.between3and5")}
        description={t("onboarding.between3and5Desc")}
        icon="🌿"
        selected={bucket === "3_5Y"}
        onPress={() => handleBucket("3_5Y")}
      />
      <Choice
        label={t("onboarding.moreThan5")}
        description={t("onboarding.moreThan5Desc")}
        icon="🌳"
        selected={bucket === "GT_5Y"}
        onPress={() => handleBucket("GT_5Y")}
      />
      <Choice
        label={t("onboarding.exactDate")}
        description={t("onboarding.exactDateDesc")}
        icon="📅"
        selected={bucket === "EXACT"}
        onPress={() => handleBucket("EXACT")}
      />

      {bucket === "EXACT" && (
        <View style={styles.datePickerWrapper}>
          <Pressable style={styles.dateBtn} onPress={() => setShowPicker(true)}>
            <Text style={styles.dateBtnText}>
              {value
                ? new Date(value).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : t("onboarding.pickDate")}
            </Text>
          </Pressable>
          {showPicker && (
            <DateTimePicker
              value={value ? new Date(value) : new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}
        </View>
      )}
    </OnboardingShell>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  datePickerWrapper: { marginTop: spacing.md },
  dateBtn: {
    backgroundColor: colors.surface, padding: spacing.md,
    borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
  },
  dateBtnText: { fontSize: 15, color: colors.textPrimary, fontWeight: "500" },
});