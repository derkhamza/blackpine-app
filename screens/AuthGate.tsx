import { useState } from "react";
import {
  Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../lib/AppContext";
import { useT } from "../lib/useT";
import { signup, login } from "../lib/api";
import { colors, radii, shadows, spacing, typography } from "../lib/theme";

export function AuthGate() {
  const { onSignup, onLogin } = useApp();
  const { t } = useT();
  const insets = useSafeAreaInsets();
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
        onSignup(); // → onboarding
      } else {
        await login(email.trim(), password);
        await onLogin(); // → pull data → app
      }
    } catch (err: any) {
      Alert.alert(t("error"), err.message || "Error");
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
      <Text style={styles.brand}>BLACKPINE</Text>
      <Text style={styles.brandSub}>CABINET</Text>

      <Text style={styles.title}>
        {mode === "signup" ? t("auth.signup") : t("auth.login")}
      </Text>
      <Text style={styles.subtitle}>
        {mode === "signup" ? t("auth.signupSubtitle") : t("auth.loginSubtitle")}
      </Text>

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

        <Text style={[styles.label, { marginTop: spacing.md }]}>{t("auth.passwordLabel")}</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder={mode === "signup" ? t("auth.passwordMinLength") : t("auth.passwordPlaceholder")}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry
        />

        <Pressable
          style={[styles.submitBtn, (!email.trim() || !password || loading) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!email.trim() || !password || loading}
        >
          <Text style={styles.submitBtnText}>
            {loading ? t("loading") : mode === "signup" ? t("auth.signupBtn") : t("auth.loginBtn")}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: 60 },
  brand: { fontSize: 20, fontWeight: "800", letterSpacing: 3, color: colors.brand, textAlign: "center" },
  brandSub: { fontSize: 12, letterSpacing: 4, color: colors.gold, textAlign: "center", marginBottom: spacing.xxl },
  title: { ...typography.h1, color: colors.textPrimary, textAlign: "center", marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: "center", marginBottom: spacing.xl, lineHeight: 22 },
  form: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.lg, ...shadows.card },
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: 6, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.textPrimary, backgroundColor: colors.bg },
  submitBtn: { paddingVertical: 14, borderRadius: radii.md, alignItems: "center", backgroundColor: colors.brand, marginTop: spacing.xl },
  submitBtnDisabled: { backgroundColor: colors.borderStrong },
  submitBtnText: { color: colors.textOnDark, fontWeight: "600", fontSize: 15 },
  switchBtn: { paddingVertical: spacing.lg, alignItems: "center" },
  switchText: { color: colors.brand, fontSize: 14, fontWeight: "600" },
});