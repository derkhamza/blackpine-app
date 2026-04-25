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
import { signup, login, AuthUser } from "../lib/api";
import { colors, radii, shadows, spacing, typography } from "../lib/theme";
import { useT } from "../lib/useT";

interface Props {
  onAuth: (user: AuthUser) => void;
}


export function AuthScreen({ onAuth }: Props) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useT();
  const handleSubmit = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      const user = mode === "signup"
        ? await signup(email.trim(), password)
        : await login(email.trim(), password);
      onAuth(user);
    } catch (err: any) {
      Alert.alert(t("error"), err.message || t("error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, styles.content]}>

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

        <Text style={styles.label}>{t("auth.passwordLabel")}</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder={mode === "signup" ? t("auth.passwordMinLength") : t("auth.passwordPlaceholder")}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry
        />

        <Pressable
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading || !email.trim() || !password}
        >
          <Text style={styles.submitBtnText}>
            {loading ? t("loading") : mode === "login" ? t("auth.loginBtn") : t("auth.signupBtn")}
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.switchBtn}
        onPress={() => setMode(mode === "login" ? "signup" : "login")}
      >
        <Text style={styles.switchText}>
          {mode === "login" ? t("auth.switchToSignup") : t("auth.switchToLogin")}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "transparent" },
  content: { padding: spacing.lg, paddingTop: spacing.lg },
  brandMark: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.brand,
    marginBottom: spacing.xl,
  },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl, lineHeight: 22 },
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
    marginTop: spacing.md,
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