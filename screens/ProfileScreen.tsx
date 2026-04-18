import { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useApp } from "../lib/AppContext";
import { AuthScreen } from "../components/AuthScreen";
import { SyncIndicator } from "../components/SyncIndicator";
import { AuthUser, getStoredUser, logout } from "../lib/api";
import { colors, radii, shadows, spacing, typography } from "../lib/theme";

export function ProfileScreen() {
  const {
    profile,
    setProfile,
    reset,
    result,
    saving,
    lastSavedAt,
    syncStatus,
    lastSyncedAt,
    isAuthenticated,
    onAuthChange,
    forcePull,
  } = useApp();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    (async () => {
      const user = await getStoredUser();
      if (user) setAuthUser(user);
      setCheckingAuth(false);
    })();
  }, []);

  const onDateChange = (_: unknown, selected?: Date) => {
    if (Platform.OS !== "ios") setShowDatePicker(false);
    if (selected) {
      setProfile({ ...profile, activityStartDate: selected.toISOString().split("T")[0] });
    }
  };

  const handleAuth = async (user: AuthUser) => {
    setAuthUser(user);
    await onAuthChange();
  };

  const handleLogout = async () => {
    await logout();
    setAuthUser(null);
    await onAuthChange();
  };

  const handleReset = () => {
    Alert.alert(
      "Réinitialiser ?",
      "Toutes vos données locales seront effacées.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Réinitialiser", style: "destructive", onPress: reset },
      ]
    );
  };

  if (checkingAuth) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Profil</Text>
        <SyncIndicator
          saving={saving}
          lastSavedAt={lastSavedAt}
          syncStatus={syncStatus}
          lastSyncedAt={lastSyncedAt}
          isAuthenticated={isAuthenticated}
        />
      </View>

      {/* CLOUD ACCOUNT */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compte Cloud</Text>
        {authUser ? (
          <>
            <Row label="Email" value={authUser.email} />
            <Text style={styles.syncNote}>
              {isAuthenticated
                ? "Vos données se synchronisent automatiquement."
                : "Connectez-vous pour activer la synchronisation."}
            </Text>

            <Pressable
              style={styles.pullBtn}
              onPress={forcePull}
              disabled={syncStatus === "syncing"}
            >
              <Text style={styles.pullBtnText}>
                {syncStatus === "syncing" ? "Synchronisation…" : "⬇ Récupérer depuis le cloud"}
              </Text>
            </Pressable>

            <Pressable style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutBtnText}>Se déconnecter</Text>
            </Pressable>
          </>
        ) : (
          <AuthScreen onAuth={handleAuth} />
        )}
      </View>

      {/* PROFILE INFO */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations fiscales</Text>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Personnes à charge</Text>
          <TextInput
            style={styles.input}
            value={String(profile.dependentsCount)}
            keyboardType="number-pad"
            onChangeText={(v) =>
              setProfile({ ...profile, dependentsCount: Math.max(0, parseInt(v) || 0) })
            }
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Date de début d'activité</Text>
          <Pressable style={styles.input} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.inputText}>
              {new Date(profile.activityStartDate).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
          </Pressable>
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={new Date(profile.activityStartDate)}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Régime fiscal</Text>
        <Row label="Régime" value={result.tax.regime} />
        <Row label="Pratique" value={practiceLabel(profile.practiceType)} />
        <Row
          label="Commune"
          value={`${profile.commune} (${profile.communeType === "URBAN" ? "urbain" : "rural"})`}
        />
      </View>

      <Pressable style={styles.resetBtn} onPress={handleReset}>
        <Text style={styles.resetBtnText}>Réinitialiser les données</Text>
      </Pressable>

      <Text style={styles.footer}>
        Blackpine Cabinet · Config fiscale {result.configVersion}
      </Text>
    </ScrollView>
  );
}

function practiceLabel(type: string): string {
  if (type === "CABINET_ONLY") return "Cabinet uniquement";
  if (type === "CLINIC_ONLY") return "Clinique uniquement";
  if (type === "MIXED") return "Cabinet + Clinique";
  return type;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: 20, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: spacing.lg,
  },
  screenTitle: { ...typography.h1, color: colors.textPrimary },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  sectionTitle: {
    ...typography.micro,
    color: colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: spacing.md,
  },
  syncNote: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    fontStyle: "italic",
  },
  pullBtn: {
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: colors.brandSoft,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
  },
  pullBtnText: { fontSize: 13, color: colors.brand, fontWeight: "600" },
  logoutBtn: {
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutBtnText: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
  field: { marginBottom: spacing.md },
  fieldLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.bg,
  },
  inputText: { fontSize: 15, color: colors.textPrimary },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7 },
  rowLabel: { fontSize: 14, color: colors.textSecondary },
  rowValue: { fontSize: 14, color: colors.textPrimary, fontWeight: "500" },
  resetBtn: {
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.dangerSoft,
  },
  resetBtnText: { fontSize: 13, color: colors.danger, fontWeight: "600" },
  footer: { fontSize: 11, color: colors.textTertiary, textAlign: "center", marginTop: spacing.md },
});