import { useRef, useState, useMemo } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { OnboardingShell } from "../OnboardingShell";
import { useT } from "../../../lib/useT";
import { spacing, ColorPalette } from "../../../lib/theme";
import { useColors } from "../../../lib/ThemeContext";

export interface DoctorInfoData {
  firstName: string;
  lastName: string;
  phone: string;
}

// Moroccan mobile/landline: 06/07/05 XXXXXXXX or +212 6/7/5 XXXXXXXX
function isValidPhone(raw: string): boolean {
  const c = raw.replace(/[\s\-\.]/g, "");
  return /^(0[5-7]\d{8}|\+212[5-7]\d{8})$/.test(c);
}

interface Props {
  data: DoctorInfoData;
  onChange: (patch: Partial<DoctorInfoData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function DoctorInfoStep({ data, onChange, onNext, onBack }: Props) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();

  const lastNameRef = useRef<TextInput>(null);
  const phoneRef    = useRef<TextInput>(null);

  const [phoneTouched, setPhoneTouched] = useState(false);

  const phoneHasContent = data.phone.trim().length > 0;
  const phoneInvalid    = phoneHasContent && !isValidPhone(data.phone);
  const showPhoneError  = phoneTouched && phoneInvalid;

  const canContinue =
    data.firstName.trim().length > 0 &&
    data.lastName.trim().length > 0 &&
    !phoneInvalid;

  return (
    <OnboardingShell
      stepIndex={1}
      totalSteps={6}
      title={t("onboarding.doctorInfoTitle")}
      subtitle={t("onboarding.doctorInfoSub")}
      onBack={onBack}
      onNext={onNext}
      nextDisabled={!canContinue}
    >
      <View style={styles.form}>
        {/* First name */}
        <Text style={styles.label}>{t("doctor.firstName")} *</Text>
        <TextInput
          style={styles.input}
          value={data.firstName}
          onChangeText={(v) => onChange({ firstName: v })}
          placeholder={t("doctor.firstNamePlaceholder")}
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="words"
          autoCorrect={false}
          autoFocus
          returnKeyType="next"
          onSubmitEditing={() => lastNameRef.current?.focus()}
        />

        {/* Last name */}
        <Text style={[styles.label, styles.gap]}>{t("doctor.lastName")} *</Text>
        <TextInput
          ref={lastNameRef}
          style={styles.input}
          value={data.lastName}
          onChangeText={(v) => onChange({ lastName: v })}
          placeholder={t("doctor.lastNamePlaceholder")}
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => phoneRef.current?.focus()}
        />

        {/* Phone — optional */}
        <Text style={[styles.label, styles.gap]}>
          {t("doctor.phone")}
          <Text style={styles.optional}> {t("onboarding.optional")}</Text>
        </Text>
        <TextInput
          ref={phoneRef}
          style={[styles.input, showPhoneError && styles.inputError]}
          value={data.phone}
          onChangeText={(v) => {
            onChange({ phone: v });
            if (phoneTouched && isValidPhone(v)) setPhoneTouched(false);
          }}
          onBlur={() => { if (phoneHasContent) setPhoneTouched(true); }}
          placeholder={t("doctor.phonePlaceholder")}
          placeholderTextColor={colors.textTertiary}
          keyboardType="phone-pad"
          returnKeyType="done"
        />
        {showPhoneError && (
          <Text style={styles.errorText}>{t("doctor.phoneInvalid")}</Text>
        )}

        <Text style={styles.hint}>{t("doctor.hint")}</Text>
      </View>
    </OnboardingShell>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  form: { gap: 2 },
  gap: { marginTop: spacing.md },
  label: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 },
  optional: { fontWeight: "400", color: colors.textTertiary, fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  inputError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  errorText: { fontSize: 12, color: colors.danger, marginTop: 4, marginLeft: 4 },
  hint: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: spacing.xl,
    lineHeight: 18,
  },
});
