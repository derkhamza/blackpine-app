import { useState, useMemo } from "react";
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
import { radii, shadows, spacing, typography, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { useT } from "../lib/useT";

interface Props {
  onAuth: (user: AuthUser) => void;
}


export function AuthScreen({ onAuth }: Props) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const colors = useColors();const styles = useMemo(() => makeStyles(colors), [colors]);
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

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
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
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  label: {
    ...typography.caption,
    color: colors.brand,
    marginBottom: 6,
    marginTop: spacing.md,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontSize: 11,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.bg,
  },
  submitBtn: {
    paddingVertical: 15,
    borderRadius: radii.lg,
    alignItems: "center",
    backgroundColor: colors.brand,
    marginTop: spacing.xl,
  },
  submitBtnDisabled: { backgroundColor: colors.borderStrong },
  submitBtnText: { color: colors.textOnDark, fontWeight: "600", fontSize: 15 },
  switchBtn: { paddingVertical: spacing.lg, alignItems: "center" },
  switchText: { color: colors.brand, fontSize: 14, fontWeight: "600" },
});