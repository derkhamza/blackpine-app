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

interface Props {
  onAuth: (user: AuthUser) => void;
}

export function AuthScreen({ onAuth }: Props) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      const user = mode === "signup"
        ? await signup(email.trim(), password)
        : await login(email.trim(), password);
      onAuth(user);
    } catch (err: any) {
      Alert.alert("Erreur", err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.brandMark}>BLACKPINE</Text>
      <Text style={styles.title}>
        {mode === "login" ? "Connexion" : "Créer un compte"}
      </Text>
      <Text style={styles.subtitle}>
        {mode === "login"
          ? "Connectez-vous pour synchroniser vos données"
          : "Créez un compte pour sauvegarder dans le cloud"}
      </Text>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="votre@email.com"
          placeholderTextColor={colors.textTertiary}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Mot de passe</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder={mode === "signup" ? "6 caractères minimum" : "Votre mot de passe"}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry
        />

        <Pressable
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading || !email.trim() || !password}
        >
          <Text style={styles.submitBtnText}>
            {loading
              ? "Chargement…"
              : mode === "login"
              ? "Se connecter"
              : "Créer mon compte"}
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.switchBtn}
        onPress={() => setMode(mode === "login" ? "signup" : "login")}
      >
        <Text style={styles.switchText}>
          {mode === "login"
            ? "Pas encore de compte ? Créer un compte"
            : "Déjà un compte ? Se connecter"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: 80 },
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