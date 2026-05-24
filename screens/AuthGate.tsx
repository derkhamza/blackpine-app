import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Linking, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "../components/SafeScreen";
import { useApp } from "../lib/AppContext";
import { useT } from "../lib/useT";
import { signup, login } from "../lib/api";
import { redeemInviteCode } from "../lib/inviteApi";
import { radii, shadows, spacing, colors, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { ResetPasswordScreen } from "./ResetPasswordScreen";
import { PRIVACY_POLICY_URL, TERMS_URL } from "../lib/constants";
import { Icon } from "../lib/icons";

// ── Error message sanitiser ───────────────────────────────────────────────────
// Maps known server/network error strings to user-friendly French messages so
// raw stack traces / internal details are never shown to the user.

function friendlyAuthError(err: any): string {
  const msg: string = (err?.message || "").toLowerCase();

  if (msg.includes("aborted") || msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch"))
    return "Erreur de connexion. Vérifiez votre connexion internet.";
  if (msg.includes("token_expired") || (msg.includes("token") && msg.includes("expired")))
    return "Votre session a expiré. Veuillez vous reconnecter.";
  if (msg.includes("subscription_expired"))
    return "Votre abonnement a expiré.";
  if (msg.includes("invalid") && (msg.includes("credential") || msg.includes("password") || msg.includes("email")))
    return "Email ou mot de passe incorrect.";
  if (msg.includes("user not found") || msg.includes("no user") || msg.includes("not found"))
    return "Aucun compte trouvé avec cet email.";
  if (msg.includes("already exists") || msg.includes("email already") || msg.includes("duplicate"))
    return "Un compte avec cet email existe déjà.";
  if (msg.includes("invalid email") || msg.includes("email invalide"))
    return "Adresse email invalide.";
  if (msg.includes("code") && (msg.includes("invalide") || msg.includes("invalid") || msg.includes("expired")))
    return "Code invalide ou expiré. Demandez un nouveau code au médecin.";

  // Never bubble raw server error — use a safe generic fallback
  return "Une erreur est survenue. Veuillez réessayer.";
}

// ── Small helpers ────────────────────────────────────────────────────────────

function FieldInput({
  icon,
  ...props
}: React.ComponentProps<typeof TextInput> & { icon: any }) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[s.inputRow, focused && s.inputRowFocused]}>
      <Icon name={icon} size={16} color={focused ? colors.brand : colors.textTertiary} />
      <TextInput
        style={s.inputField}
        placeholderTextColor={colors.textTertiary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AuthGate() {
  const colors = useColors();
  const { onSignup, onLogin, onSecretaryLogin } = useApp();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const topInset = useTopInset();

  const [showReset, setShowReset] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [mode, setMode] = useState<"login" | "signup" | "secretary">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  // Secretary code rate-limiting
  const secretaryFailCount = useRef(0);
  const [secretaryLockSecs, setSecretaryLockSecs] = useState(0);
  const secretaryLockTier = useRef(0);
  const secretaryLockInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const SECRETARY_MAX_ATTEMPTS  = 3;
  const SECRETARY_LOCKOUT_TIERS = [60, 120, 300];
  const secretaryIsLocked = secretaryLockSecs > 0;

  useEffect(() => {
    return () => { if (secretaryLockInterval.current) clearInterval(secretaryLockInterval.current); };
  }, []);

  const startSecretaryLockout = () => {
    const duration = SECRETARY_LOCKOUT_TIERS[Math.min(secretaryLockTier.current, SECRETARY_LOCKOUT_TIERS.length - 1)];
    secretaryLockTier.current = Math.min(secretaryLockTier.current + 1, SECRETARY_LOCKOUT_TIERS.length - 1);
    setSecretaryLockSecs(duration);
    secretaryLockInterval.current = setInterval(() => {
      setSecretaryLockSecs(prev => {
        if (prev <= 1) { clearInterval(secretaryLockInterval.current!); secretaryLockInterval.current = null; return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password) return;
    if (mode === "signup" && !acceptedTerms) return;
    if (mode === "signup" && password.length < 8) {
      Alert.alert(t("error"), "Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (mode === "signup" && !/[\d!@#$%^&*()\-_=+[\]{}|;:',.<>?/\\~`]/.test(password)) {
      Alert.alert(t("error"), "Le mot de passe doit contenir au moins un chiffre ou caractère spécial.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        await signup(email.trim(), password);
        onSignup();
      } else {
        const { trialStart } = await login(email.trim(), password);
        await onLogin(trialStart);
      }
    } catch (err: any) {
      Alert.alert(t("error"), friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemCode = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (code.length < 4 || secretaryIsLocked) return;
    setLoading(true);
    try {
      const session = await redeemInviteCode(code);
      secretaryFailCount.current = 0; // reset on success
      onSecretaryLogin(session);
    } catch (err: any) {
      secretaryFailCount.current += 1;
      if (secretaryFailCount.current >= SECRETARY_MAX_ATTEMPTS) {
        secretaryFailCount.current = 0;
        startSecretaryLockout();
      }
      Alert.alert(t("error"), friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  if (showReset) {
    return <ResetPasswordScreen onBack={() => setShowReset(false)} />;
  }

  const canSubmit = !!(email.trim() && password && !loading &&
    (mode !== "signup" || acceptedTerms));

  return (
    <ScrollView
      style={[s.container, { paddingTop: topInset }]}
      contentContainerStyle={s.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Brand hero ── */}
      <View style={s.hero}>
        <View style={s.logoMark}>
          <Icon name="stethoscope" size={26} color={colors.textOnDark} />
        </View>
        <Text style={s.brand}>BLACKPINE</Text>
        <Text style={s.brandSub}>CABINET</Text>
        <Text style={s.tagline}>{t("auth.tagline")}</Text>
      </View>

      {/* ── Form card ── */}
      <View style={s.card}>

        {/* Mode switcher — login / signup tabs (hidden in secretary mode) */}
        {mode !== "secretary" && (
          <View style={s.modeRow}>
            <Pressable
              style={[s.modeTab, mode === "signup" && s.modeTabActive]}
              onPress={() => setMode("signup")}
            >
              <Text style={[s.modeTabText, mode === "signup" && s.modeTabTextActive]}>
                {t("auth.signup")}
              </Text>
            </Pressable>
            <Pressable
              style={[s.modeTab, mode === "login" && s.modeTabActive]}
              onPress={() => setMode("login")}
            >
              <Text style={[s.modeTabText, mode === "login" && s.modeTabTextActive]}>
                {t("auth.login")}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Secretary header */}
        {mode === "secretary" && (
          <View style={s.secretaryHeader}>
            <Icon name="users" size={18} color={colors.brand} />
            <Text style={s.secretaryTitle}>{t("secretary.codeLabel")}</Text>
          </View>
        )}

        {/* Email / password form */}
        {mode !== "secretary" && (
          <>
            <Text style={s.fieldLabel}>{t("auth.emailLabel")}</Text>
            <FieldInput
              icon="mail"
              value={email}
              onChangeText={setEmail}
              placeholder={t("auth.emailPlaceholder")}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              autoComplete="email"
            />

            <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>{t("auth.passwordLabel")}</Text>
            <FieldInput
              icon="lock"
              value={password}
              onChangeText={setPassword}
              placeholder={
                mode === "signup" ? t("auth.passwordMinLength") : t("auth.passwordPlaceholder")
              }
              secureTextEntry
              textContentType={mode === "signup" ? "newPassword" : "password"}
              autoComplete={mode === "signup" ? "password-new" : "password"}
            />

            {/* Terms checkbox */}
            {mode === "signup" && (
              <Pressable
                style={s.termsRow}
                onPress={() => setAcceptedTerms(!acceptedTerms)}
              >
                <View style={[s.checkbox, acceptedTerms && s.checkboxChecked]}>
                  {acceptedTerms && <Text style={s.checkmark}>✓</Text>}
                </View>
                <Text style={s.termsText}>
                  {t("auth.acceptTerms")}{" "}
                  <Text style={s.termsLink} onPress={() => Linking.openURL(TERMS_URL)}>
                    {t("profile.terms")}
                  </Text>
                  {" "}{t("auth.and")}{" "}
                  <Text style={s.termsLink} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
                    {t("profile.privacyPolicy")}
                  </Text>
                </Text>
              </Pressable>
            )}

            {/* Subtitle hint */}
            <Text style={s.formHint}>
              {mode === "signup" ? t("auth.signupSubtitle") : t("auth.loginSubtitle")}
            </Text>

            {/* Submit */}
            <Pressable
              style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              {loading
                ? <ActivityIndicator size="small" color={colors.textOnDark} />
                : <Text style={s.submitBtnText}>
                    {mode === "signup" ? t("auth.signupBtn") : t("auth.loginBtn")}
                  </Text>
              }
            </Pressable>

            {/* Forgot password */}
            {mode === "login" && (
              <Pressable style={s.forgotBtn} onPress={() => setShowReset(true)}>
                <Text style={s.forgotText}>{t("reset.forgotPassword")}</Text>
              </Pressable>
            )}
          </>
        )}

        {/* Secretary code entry */}
        {mode === "secretary" && (
          <>
            <TextInput
              style={s.codeInput}
              value={inviteCode}
              onChangeText={(v) => setInviteCode(v.toUpperCase())}
              placeholder="ABC 123"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
            />
            <Text style={s.formHint}>{t("secretary.haveCode")}</Text>
            {secretaryIsLocked && (
              <Text style={s.lockoutHint}>
                Trop de tentatives. Réessayez dans {secretaryLockSecs}s
              </Text>
            )}
            <Pressable
              style={[s.submitBtn, (!inviteCode.trim() || loading || secretaryIsLocked) && s.submitBtnDisabled]}
              onPress={handleRedeemCode}
              disabled={!inviteCode.trim() || loading || secretaryIsLocked}
            >
              {loading
                ? <ActivityIndicator size="small" color={colors.textOnDark} />
                : <Text style={s.submitBtnText}>
                    {secretaryIsLocked ? `Verrouillé (${secretaryLockSecs}s)` : t("secretary.accessBtn")}
                  </Text>
              }
            </Pressable>
            <Pressable style={s.forgotBtn} onPress={() => setMode("login")}>
              <Text style={s.forgotText}>{t("secretary.backToLogin")}</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Secretary entry point */}
      {mode !== "secretary" && (
        <Pressable style={s.secretaryLink} onPress={() => setMode("secretary")}>
          <Icon name="users" size={12} color={colors.textTertiary} />
          <Text style={s.secretaryLinkText}>{t("secretary.haveCode")}</Text>
        </Pressable>
      )}

      <View style={{ height: insets.bottom + spacing.xl }} />
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceDark },

  scroll: { flexGrow: 1 },

  // Hero
  hero: {
    alignItems: "center",
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl + spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
  },
  brand: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 5,
    color: colors.textOnDark,
  },
  brandSub: {
    fontSize: 11,
    letterSpacing: 5,
    color: colors.gold,
    marginTop: 3,
    fontWeight: "600",
  },
  tagline: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    marginTop: spacing.md,
    letterSpacing: 0.3,
    textAlign: "center",
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    ...shadows.hero,
  },

  // Mode tabs
  modeRow: {
    flexDirection: "row",
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: 4,
    marginBottom: spacing.xl,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: radii.sm,
  },
  modeTabActive: {
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textTertiary,
  },
  modeTabTextActive: {
    color: colors.textPrimary,
  },

  // Secretary header
  secretaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  secretaryTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  // Fields
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 7,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    backgroundColor: colors.bg,
  },
  inputRowFocused: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  inputField: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },

  // Code entry
  codeInput: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 18,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 10,
    color: colors.textPrimary,
    textAlign: "center",
    backgroundColor: colors.bg,
    marginBottom: spacing.sm,
  },

  // Hint
  formHint: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },

  // Terms
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: spacing.lg,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  checkmark: { color: "#fff", fontSize: 13, fontWeight: "800" },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  termsLink: {
    color: colors.brand,
    fontWeight: "600",
    textDecorationLine: "underline",
  },

  // Buttons
  submitBtn: {
    paddingVertical: 16,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
    minHeight: 54,
    ...shadows.card,
  },
  submitBtnDisabled: {
    backgroundColor: colors.borderStrong,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: colors.textOnDark,
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  lockoutHint: {
    fontSize: 12,
    color: colors.gold,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  forgotBtn: {
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  forgotText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },

  // Secretary link at bottom
  secretaryLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
  },
  secretaryLinkText: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: "500",
  },
});
