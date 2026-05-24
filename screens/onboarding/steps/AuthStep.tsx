import { useState, useMemo } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { OnboardingShell } from "../OnboardingShell";
import { useT } from "../../../lib/useT";
import { signup, login } from "../../../lib/api";
import { radii, shadows, spacing, typography, ColorPalette } from "../../../lib/theme";
import { useColors } from "../../../lib/ThemeContext";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function AuthStep({ onNext, onBack }: Props) {
  const colors = useColors();const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      if (mode === "signup") {
        await signup(email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      onNext();
    } catch (err: any) {
      Alert.alert(t("error"), err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingShell
      stepIndex={2}
      totalSteps={9}
      title={mode === "signup" ? t("auth.signup") : t("auth.login")}
      subtitle={
        mode === "signup" ? t("auth.signupSubtitle") : t("auth.loginSubtitle")
      }
      onBack={onBack}
    >
      <View style={styles.form}>
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

        <Text style={[styles.label, { marginTop: spacing.md }]}>
          {t("auth.passwordLabel")}
        </Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder={
            mode === "signup"
              ? t("auth.passwordMinLength")
              : t("auth.passwordPlaceholder")
          }
          placeholderTextColor={colors.textTertiary}
          secureTextEntry
        />

        <Pressable
          style={[
            styles.submitBtn,
            (!email.trim() || !password || loading) && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!email.trim() || !password || loading}
        >
          <Text style={styles.submitBtnText}>
            {loading
              ? t("loading")
              : mode === "signup"
              ? t("auth.signupBtn")
              : t("auth.loginBtn")}
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.switchBtn}
        onPress={() => setMode(mode === "login" ? "signup" : "login")}
      >
        <Text style={styles.switchText}>
          {mode === "login"
            ? t("auth.switchToSignup")
            : t("auth.switchToLogin")}
        </Text>
      </Pressable>
    </OnboardingShell>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  form: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    ...shadows.card,
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
  submitBtn: {
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: "center",
    backgroundColor: colors.brand,
    marginTop: spacing.xl,
  },
  submitBtnDisabled: { backgroundColor: colors.borderStrong },
  submitBtnText: { color: colors.textOnDark, fontWeight: "600", fontSize: 15 },
  switchBtn: { paddingVertical: spacing.lg, alignItems: "center" },
  switchText: { color: colors.brand, fontSize: 14, fontWeight: "600" },
});