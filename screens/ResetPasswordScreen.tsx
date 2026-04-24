import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useT } from "../lib/useT";
import { requestPasswordReset, verifyResetCode } from "../lib/api";
import { colors, radii, shadows, spacing, typography } from "../lib/theme";

type Step = "email" | "code" | "done";

interface Props {
  onBack: () => void;
}

export function ResetPasswordScreen({ onBack }: Props) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setStep("code");
    } catch (err: any) {
      Alert.alert(t("error"), err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!code.trim() || !newPassword) return;
    setLoading(true);
    try {
      await verifyResetCode(email.trim(), code.trim(), newPassword);
      setStep("done");
    } catch (err: any) {
      Alert.alert(t("error"), err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backBtnText}>‹ {t("reset.backToLogin")}</Text>
      </Pressable>

      <Text style={styles.title}>{t("reset.title")}</Text>

      {step === "email" && (
        <View style={styles.form}>
          <Text style={styles.description}>{t("reset.enterEmail")}</Text>

          <Text style={styles.label}>{t("auth.emailLabel")}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={t("auth.emailPlaceholder")}
            placeholderTextColor={colors.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Pressable
            style={[styles.submitBtn, (!email.trim() || loading) && styles.submitBtnDisabled]}
            onPress={handleSendCode}
            disabled={!email.trim() || loading}
          >
            <Text style={styles.submitBtnText}>
              {loading ? t("loading") : t("reset.sendCode")}
            </Text>
          </Pressable>
        </View>
      )}

      {step === "code" && (
        <View style={styles.form}>
          <Text style={styles.description}>{t("reset.codeSent")}</Text>

          <Text style={styles.label}>{t("reset.enterCode")}</Text>
          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={setCode}
            placeholder={t("reset.codePlaceholder")}
            placeholderTextColor={colors.textTertiary}
            keyboardType="number-pad"
            maxLength={6}
          />

          <Text style={[styles.label, { marginTop: spacing.md }]}>{t("reset.newPassword")}</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={t("auth.passwordMinLength")}
            placeholderTextColor={colors.textTertiary}
            secureTextEntry
          />

          <Pressable
            style={[styles.submitBtn, (!code.trim() || !newPassword || loading) && styles.submitBtnDisabled]}
            onPress={handleVerify}
            disabled={!code.trim() || !newPassword || loading}
          >
            <Text style={styles.submitBtnText}>
              {loading ? t("loading") : t("reset.resetPassword")}
            </Text>
          </Pressable>
        </View>
      )}

      {step === "done" && (
        <View style={styles.form}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successText}>{t("reset.success")}</Text>

          <Pressable style={styles.submitBtn} onPress={onBack}>
            <Text style={styles.submitBtnText}>{t("reset.backToLogin")}</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: 20 },
  backBtn: { marginBottom: spacing.lg },
  backBtnText: { color: colors.brand, fontSize: 15, fontWeight: "600" },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.lg },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    ...shadows.card,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.bg,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 16,
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
    backgroundColor: colors.bg,
    textAlign: "center",
    letterSpacing: 8,
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: "center",
    backgroundColor: colors.brand,
    marginTop: spacing.xl,
  },
  submitBtnDisabled: { backgroundColor: colors.borderStrong },
  submitBtnText: { color: colors.textOnDark, fontWeight: "600", fontSize: 15 },
  successIcon: {
    fontSize: 48,
    textAlign: "center",
    color: colors.success,
    marginBottom: spacing.md,
  },
  successText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});