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
import {
  AuthUser,
  getStoredUser,
  isLoggedIn,
  logout,
  pushData,
  pullData,
} from "../lib/api";
import { colors, radii, shadows, spacing, typography } from "../lib/theme";

export function ProfileScreen() {
  const { profile, setProfile, transactions, reset, result } = useApp();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [syncing, setSyncing] = useState(false);
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
      const iso = selected.toISOString().split("T")[0];
      setProfile({ ...profile, activityStartDate: iso });
    }
  };

  const handleSync = async (direction: "push" | "pull") => {
    setSyncing(true);
    try {
      if (direction === "push") {
        await pushData(profile, transactions);
        Alert.alert("Synchronisé", "Vos données ont été envoyées au serveur.");
      } else {
        const data = await pullData();
        if (data.profile) setProfile(data.profile);
        Alert.alert("Récupéré", "Vos données ont été chargées depuis le serveur.");
      }
    } catch (err: any) {
      Alert.alert("Erreur", err.message || "Erreur de synchronisation");
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setAuthUser(null);
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
      <Text style={styles.screenTitle}>Profil</Text>

      {/* CLOUD ACCOUNT */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compte Cloud</Text>
        {authUser ? (
          <>
            <Row label="Email" value={authUser.email} />
            <View style={styles.syncRow}>
              <Pressable
                style={[styles.syncBtn, syncing && styles.syncBtnDisabled]}
                onPress={() => handleSync("push")}
                disabled={syncing}
              >
                <Text style={styles.syncBtnText}>
                  {syncing ? "…" : "⬆ Envoyer"}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.syncBtn, syncing && styles.syncBtnDisabled]}
                onPress={() => handleSync("pull")}
                disabled={syncing}
              >
                <Text style={styles.syncBtnText}>
                  {syncing ? "…" : "⬇ Récupérer"}
                </Text>
              </Pressable>
            </View>
            <Pressable style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutBtnText}>Se déconnecter</Text>
            </Pressable>
          </>
        ) : (
          <AuthScreen onAuth={setAuthUser} />
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
        <Row label="Commune" value={`${profile.commune} (${profile.communeType === "URBAN" ? "urbain" : "rural"})`} />
      </View>

      <Pressable style={styles.resetBtn} onPress={handleReset}>
        <Text style={styles.resetBtnText}>Réinitialiser les données</Text>
      </Pressable>

      <Text style={styles.footer}>Blackpine Cabinet · Config fiscale {result.configVersion}</Text>
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
  screenTitle: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.lg },
  section: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.md, ...shadows.card },
  sectionTitle: { ...typography.micro, color: colors.textSecondary, textTransform: "uppercase", marginBottom: spacing.md },
  field: { marginBottom: spacing.md },
  fieldLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.bg },
  inputText: { fontSize: 15, color: colors.textPrimary },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7 },
  rowLabel: { fontSize: 14, color: colors.textSecondary },
  rowValue: { fontSize: 14, color: colors.textPrimary, fontWeight: "500" },

  syncRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  syncBtn: {
    flex: 1, paddingVertical: 10, alignItems: "center",
    backgroundColor: colors.brand, borderRadius: radii.sm,
  },
  syncBtnDisabled: { backgroundColor: colors.borderStrong },
  syncBtnText: { color: colors.textOnDark, fontWeight: "600", fontSize: 13 },
  logoutBtn: {
    marginTop: spacing.md, paddingVertical: 10, alignItems: "center",
    borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border,
  },
  logoutBtnText: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },

  resetBtn: { paddingVertical: 12, alignItems: "center", backgroundColor: colors.surface, borderRadius: radii.sm, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.dangerSoft },
  resetBtnText: { fontSize: 13, color: colors.danger, fontWeight: "600" },
  footer: { fontSize: 11, color: colors.textTertiary, textAlign: "center", marginTop: spacing.md },
});