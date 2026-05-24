import { useRef, useState, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { CommuneType, PracticeType } from "blackpine-engine";
import { OnboardingShell } from "../OnboardingShell";
import { Choice } from "../Choice";
import { CityPicker } from "../../../components/CityPicker";
import { useT } from "../../../lib/useT";
import { radii, spacing, typography, ColorPalette } from "../../../lib/theme";
import { useColors } from "../../../lib/ThemeContext";

// Address: at least 8 chars, contains a letter and a digit or comma
function isValidAddress(raw: string): boolean {
  const trimmed = raw.trim();
  if (trimmed.length < 8) return false;
  return /[a-zA-ZÀ-ÿ]/.test(trimmed) && /[\d,]/.test(trimmed);
}

interface Props {
  practiceType: PracticeType | "SALARIED" | null;
  commune: string;
  communeType: CommuneType | null;
  address: string;
  onChangePractice: (v: PracticeType | "SALARIED") => void;
  onChangeCommune: (v: string) => void;
  onChangeZone: (v: CommuneType) => void;
  onChangeAddress: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function PracticeLocationStep({
  practiceType, commune, communeType, address,
  onChangePractice, onChangeCommune, onChangeZone, onChangeAddress,
  onNext, onBack,
}: Props) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();
  const addressRef = useRef<TextInput>(null);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [addressTouched, setAddressTouched] = useState(false);

  const isSalaried = practiceType === "SALARIED";
  const addressHasContent = address.trim().length > 0;
  const addressInvalid   = addressHasContent && !isValidAddress(address);
  const showAddressError = addressTouched && addressInvalid;

  const canContinue =
    !!practiceType &&
    !isSalaried &&
    !!commune.trim() &&
    !!communeType &&
    !addressInvalid; // address is optional but must be valid if filled

  return (
    <OnboardingShell
      stepIndex={3}
      totalSteps={6}
      title={t("onboarding.practiceLocationTitle")}
      subtitle={t("onboarding.practiceLocationSub")}
      onNext={onNext}
      onBack={onBack}
      nextDisabled={!canContinue}
    >
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── Practice type ── */}
        <Text style={styles.sectionLabel}>{t("onboarding.practiceTitle")}</Text>
        <Choice label={t("onboarding.ownCabinet")} description={t("onboarding.ownCabinetDesc")}
          icon="🏢" selected={practiceType === "CABINET_ONLY"} onPress={() => onChangePractice("CABINET_ONLY")} />
        <Choice label={t("onboarding.clinicOnly")} description={t("onboarding.clinicOnlyDesc")}
          icon="🏥" selected={practiceType === "CLINIC_ONLY"} onPress={() => onChangePractice("CLINIC_ONLY")} />
        <Choice label={t("onboarding.both")} description={t("onboarding.bothDesc")}
          icon="🔀" selected={practiceType === "MIXED"} onPress={() => onChangePractice("MIXED")} />
        <Choice label={t("onboarding.salaried")} description={t("onboarding.salariedDesc")}
          icon="💼" selected={practiceType === "SALARIED"} onPress={() => onChangePractice("SALARIED")} />

        {isSalaried && (
          <View style={styles.warning}>
            <Text style={styles.warningTitle}>{t("onboarding.salariedWarning")}</Text>
            <Text style={styles.warningDetail}>{t("onboarding.salariedDetail")}</Text>
          </View>
        )}

        {/* ── Location + Address ── */}
        {!isSalaried && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>
              {t("onboarding.locationTitle")}
            </Text>

            {/* City */}
            <Text style={styles.fieldLabel}>{t("onboarding.cityLabel")}</Text>
            <Pressable style={styles.cityBtn} onPress={() => setCityPickerOpen(true)}>
              <Text style={{ fontSize: 16, color: commune ? colors.textPrimary : colors.textTertiary }}>
                {commune || t("onboarding.cityPlaceholder")}
              </Text>
            </Pressable>

            {/* Zone */}
            <View style={styles.zoneRow}>
              <Pressable
                style={[styles.zoneChip, communeType === "URBAN" && styles.zoneChipActive]}
                onPress={() => onChangeZone("URBAN")}
              >
                <Text style={[styles.zoneText, communeType === "URBAN" && styles.zoneTextActive]}>
                  🏙️ {t("onboarding.urbanZone")}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.zoneChip, communeType === "RURAL" && styles.zoneChipActive]}
                onPress={() => onChangeZone("RURAL")}
              >
                <Text style={[styles.zoneText, communeType === "RURAL" && styles.zoneTextActive]}>
                  🌾 {t("onboarding.ruralZone")}
                </Text>
              </Pressable>
            </View>

            {/* Cabinet address — optional, used on prescriptions/certificates */}
            <Text style={styles.fieldLabel}>
              {t("doctor.address")}
              <Text style={styles.optionalLabel}> {t("onboarding.optional")}</Text>
            </Text>
            <TextInput
              ref={addressRef}
              style={[styles.addressInput, showAddressError && styles.inputError]}
              value={address}
              onChangeText={(v) => {
                onChangeAddress(v);
                if (addressTouched && isValidAddress(v)) setAddressTouched(false);
              }}
              onBlur={() => { if (addressHasContent) setAddressTouched(true); }}
              placeholder={t("doctor.addressPlaceholder")}
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="sentences"
              returnKeyType="done"
            />
            {showAddressError && (
              <Text style={styles.errorText}>{t("doctor.addressInvalid")}</Text>
            )}

            <CityPicker
              visible={cityPickerOpen}
              value={commune}
              onSelect={onChangeCommune}
              onClose={() => setCityPickerOpen(false)}
            />
          </>
        )}
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
    marginBottom: 8,
    marginTop: spacing.sm,
  },
  cityBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 14,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  zoneRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  zoneChip: {
    flex: 1, paddingVertical: 12, alignItems: "center",
    borderRadius: radii.md, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.surface,
  },
  zoneChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  zoneText: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  zoneTextActive: { color: "#fff" },
  addressInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    marginBottom: spacing.xs,
  },
  inputError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  errorText: { fontSize: 12, color: colors.danger, marginTop: 2, marginLeft: 4, marginBottom: spacing.sm },
  optionalLabel: { fontWeight: "400", color: colors.textTertiary, fontSize: 12 },
  warning: {
    marginTop: spacing.sm, padding: spacing.md,
    backgroundColor: colors.warningSoft, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.warning,
  },
  warningTitle: { fontSize: 14, fontWeight: "600", color: colors.warning, marginBottom: 4 },
  warningDetail: { fontSize: 13, color: colors.warning, lineHeight: 19 },
});
