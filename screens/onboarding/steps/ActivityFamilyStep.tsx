import { useState, useMemo } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaritalStatus } from "blackpine-engine";
import { OnboardingShell } from "../OnboardingShell";
import { Choice } from "../Choice";
import { useT } from "../../../lib/useT";
import { radii, spacing, typography, ColorPalette } from "../../../lib/theme";
import { useColors } from "../../../lib/ThemeContext";

type Bucket = "LT_3Y" | "3_5Y" | "GT_5Y" | "EXACT";

function bucketToDate(bucket: Bucket): string {
  const now = new Date();
  if (bucket === "LT_3Y") now.setFullYear(now.getFullYear() - 1);
  if (bucket === "3_5Y") now.setFullYear(now.getFullYear() - 4);
  if (bucket === "GT_5Y") now.setFullYear(now.getFullYear() - 10);
  return now.toISOString().split("T")[0];
}

interface Props {
  activityDate: string | null;
  marital: MaritalStatus | null;
  dependents: number;
  onChangeDate: (iso: string) => void;
  onChangeMarital: (v: MaritalStatus) => void;
  onChangeDependents: (v: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ActivityFamilyStep({
  activityDate, marital, dependents,
  onChangeDate, onChangeMarital, onChangeDependents,
  onNext, onBack,
}: Props) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const handleBucket = (b: Bucket) => {
    setBucket(b);
    if (b !== "EXACT") onChangeDate(bucketToDate(b));
  };

  const onDateChange = (_: unknown, selected?: Date) => {
    if (Platform.OS !== "ios") setShowPicker(false);
    if (selected) onChangeDate(selected.toISOString().split("T")[0]);
  };

  const canContinue = !!activityDate && !!marital;

  return (
    <OnboardingShell
      stepIndex={4}
      totalSteps={6}
      title={t("onboarding.activityFamilyTitle")}
      subtitle={t("onboarding.activityFamilySub")}
      onNext={onNext}
      onBack={onBack}
      nextDisabled={!canContinue}
    >
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Activity start */}
        <Text style={styles.sectionLabel}>{t("onboarding.activityTitle")}</Text>
        <Choice label={t("onboarding.lessThan3")} description={t("onboarding.lessThan3Desc")} icon="🌱"
          selected={bucket === "LT_3Y"} onPress={() => handleBucket("LT_3Y")} />
        <Choice label={t("onboarding.between3and5")} description={t("onboarding.between3and5Desc")} icon="🌿"
          selected={bucket === "3_5Y"} onPress={() => handleBucket("3_5Y")} />
        <Choice label={t("onboarding.moreThan5")} description={t("onboarding.moreThan5Desc")} icon="🌳"
          selected={bucket === "GT_5Y"} onPress={() => handleBucket("GT_5Y")} />
        <Choice label={t("onboarding.exactDate")} description={t("onboarding.exactDateDesc")} icon="📅"
          selected={bucket === "EXACT"} onPress={() => handleBucket("EXACT")} />

        {bucket === "EXACT" && (
          <View style={styles.dateWrapper}>
            <Pressable style={styles.dateBtn} onPress={() => setShowPicker(true)}>
              <Text style={styles.dateBtnText}>
                {activityDate
                  ? new Date(activityDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
                  : t("onboarding.pickDate")}
              </Text>
            </Pressable>
            {showPicker && (
              <DateTimePicker
                value={activityDate ? new Date(activityDate) : new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            )}
          </View>
        )}

        {/* Family */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>
          {t("onboarding.familyTitle")}
        </Text>
        <View style={styles.maritalRow}>
          <Pressable
            style={[styles.maritalBtn, marital === "MARRIED" && styles.maritalBtnActive]}
            onPress={() => onChangeMarital("MARRIED")}
          >
            <Text style={styles.maritalIcon}>💍</Text>
            <Text style={[styles.maritalText, marital === "MARRIED" && styles.maritalTextActive]}>
              {t("onboarding.married")}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.maritalBtn, marital === "SINGLE" && styles.maritalBtnActive]}
            onPress={() => onChangeMarital("SINGLE")}
          >
            <Text style={styles.maritalIcon}>🙂</Text>
            <Text style={[styles.maritalText, marital === "SINGLE" && styles.maritalTextActive]}>
              {t("onboarding.single")}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.fieldLabel}>{t("onboarding.childrenCount")}</Text>
        <View style={styles.counterRow}>
          {[0, 1, 2, 3, 4, 5, 6].map((n) => (
            <Pressable
              key={n}
              style={[styles.counterBtn, dependents === n && styles.counterBtnActive]}
              onPress={() => onChangeDependents(n)}
            >
              <Text style={[styles.counterText, dependents === n && styles.counterTextActive]}>
                {n === 6 ? "6+" : n}
              </Text>
            </Pressable>
          ))}
        </View>

      </ScrollView>
    </OnboardingShell>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  sectionLabel: {
    ...typography.micro,
    color: colors.brand,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  dateWrapper: { marginTop: spacing.sm, marginBottom: spacing.sm },
  dateBtn: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateBtnText: { fontSize: 15, color: colors.textPrimary, fontWeight: "500" },
  maritalRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  maritalBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 4,
  },
  maritalBtnActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  maritalIcon: { fontSize: 22 },
  maritalText: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  maritalTextActive: { color: "#fff" },
  counterRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: spacing.xl },
  counterBtn: {
    width: 44, height: 44, alignItems: "center", justifyContent: "center",
    borderRadius: radii.md, backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
  },
  counterBtnActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  counterText: { fontSize: 17, fontWeight: "600", color: colors.textPrimary },
  counterTextActive: { color: "#fff" },
});
