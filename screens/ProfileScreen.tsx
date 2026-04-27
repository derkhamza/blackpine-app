import { useState } from "react";
import {
  Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import Svg, { Circle, Polygon, Rect } from "react-native-svg";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useApp } from "../lib/AppContext";
import { colors, radii, shadows, spacing, typography } from "../lib/theme";
import { useT } from "../lib/useT";
import { AppLanguage } from "../lib/i18n";
import { SafeScreen } from "../components/SafeScreen";
import { CityPicker } from "../components/CityPicker";
import { Icon } from "../lib/icons";
export function ProfileScreen() {
  const { profile, setProfile, result, saving, lastSavedAt, syncStatus, lastSyncedAt, isAuthenticated, onLogout } = useApp();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const { t, currentLang, changeLanguage } = useT();

  const specialtyLabels: Record<string, string> = {
    medecin_generaliste: t("profile.generalPractitioner") || "Médecin généraliste",
    medecin_specialiste: t("profile.specialist") || "Médecin spécialiste",
    dentiste: t("profile.dentist") || "Dentiste",
    kinesitherapeute: t("profile.physiotherapist") || "Kinésithérapeute",
    sage_femme: t("profile.midwife") || "Sage-femme",
    autre: t("profile.other") || "Autre",
  };

  const practiceLabels: Record<string, string> = {
    CABINET_ONLY: t("profile.cabinetOnly") || "Cabinet",
    CLINIC_ONLY: t("profile.clinicOnly") || "Clinique",
    MIXED: t("profile.mixed") || "Mixte",
  };

  const handleLanguageChange = async (lang: AppLanguage) => {
    await changeLanguage(lang);
    Alert.alert(
      lang === "ar" ? "تغيير اللغة" : lang === "en" ? "Language changed" : "Changement de langue",
      lang === "ar"
        ? "أعد تشغيل التطبيق لتطبيق الاتجاه الجديد."
        : lang === "en"
        ? "Restart the app to apply the new layout direction."
        : "Redémarrez l'application pour appliquer la nouvelle direction.",
    );
  };

  const handleLogout = () => {
    Alert.alert(t("profile.logout"), t("profile.resetWarning"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("profile.logout"), style: "destructive", onPress: onLogout },
    ]);
  };

  const onDateChange = (_: unknown, selected?: Date) => {
    if (Platform.OS !== "ios") setShowDatePicker(false);
    if (selected) {
      setProfile({ ...profile, activityStartDate: selected.toISOString().split("T")[0] });
    }
  };

  return (
    <SafeScreen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Brand header */}
        <View style={styles.brandHeader}>
          <Text style={styles.brandMark}>BLACKPINE</Text>
          <Text style={styles.brandSub}>CABINET</Text>
          <Text style={styles.brandMotto}>Votre partenaire fiscal au Maroc</Text>
        </View>

        {/* Profile summary card */}
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {(profile.specialty || "M").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {specialtyLabels[profile.specialty || ""] || t("profile.title")}
              </Text>
              <Text style={styles.profileMeta}>
                {profile.commune} · {result.tax.regime}
              </Text>
            </View>
          </View>
        </View>

        {/* Fiscal info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>{t("profile.fiscalInfo")}</Text>
          </View>

          <Text style={styles.fieldLabel}>{t("profile.dependents")}</Text>
          <View style={styles.counterRow}>
            <Pressable
              style={styles.counterBtn}
              onPress={() => setProfile({ ...profile, dependentsCount: Math.max(0, profile.dependentsCount - 1) })}
            >
              <Text style={styles.counterBtnText}>−</Text>
            </Pressable>
            <Text style={styles.counterValue}>{profile.dependentsCount}</Text>
            <Pressable
              style={styles.counterBtn}
              onPress={() => setProfile({ ...profile, dependentsCount: Math.min(6, profile.dependentsCount + 1) })}
            >
              <Text style={styles.counterBtnText}>+</Text>
            </Pressable>
            <Text style={styles.counterHint}>max 6 · {500 * profile.dependentsCount} MAD</Text>
          </View>

          <Text style={styles.fieldLabel}>{t("profile.activityStart")}</Text>
          <Pressable style={styles.editableField} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.editableText}>
              {new Date(profile.activityStartDate).toLocaleDateString("fr-FR", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </Text>
            <Icon name="edit" size={14} color={colors.textTertiary} />
          </Pressable>
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

        {/* Practice & location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>{t("profile.fiscalRegime")}</Text>
          </View>

          <View style={styles.regimeBadge}>
            <Text style={styles.regimeText}>{result.tax.regime}</Text>
          </View>

          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>{t("profile.practice")}</Text>
          <View style={styles.chipRow}>
            {(["CABINET_ONLY", "CLINIC_ONLY", "MIXED"] as const).map((pt) => (
              <Pressable
                key={pt}
                style={[styles.chip, profile.practiceType === pt && styles.chipActive]}
                onPress={() => setProfile({ ...profile, practiceType: pt })}
              >
                <Text style={[styles.chipText, profile.practiceType === pt && styles.chipTextActive]}>
                  {practiceLabels[pt]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>{t("profile.commune")}</Text>
          <Pressable style={styles.editableField} onPress={() => setCityPickerOpen(true)}>
            <Text style={styles.editableText}>
              {profile.commune || t("onboarding.cityPlaceholder")}
            </Text>
            <Icon name="edit" size={14} color={colors.textTertiary} />
          </Pressable>

          <View style={styles.chipRow}>
            {(["URBAN", "RURAL"] as const).map((z) => (
              <Pressable
                key={z}
                style={[styles.chip, profile.communeType === z && styles.chipActive]}
                onPress={() => setProfile({ ...profile, communeType: z })}
              >
                <Text style={[styles.chipText, profile.communeType === z && styles.chipTextActive]}>
                  {z === "URBAN" ? t("profile.urban") : t("profile.rural")}
                </Text>
              </Pressable>
            ))}
          </View>

          <CityPicker
            visible={cityPickerOpen}
            value={profile.commune}
            onSelect={(city) => setProfile({ ...profile, commune: city })}
            onClose={() => setCityPickerOpen(false)}
          />
        </View>

        {/* Language */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>{t("profile.language")}</Text>
          </View>
          <View style={styles.chipRow}>
{([
  { id: "fr" as AppLanguage, flag: "FR" },
  { id: "en" as AppLanguage,  flag: "EN" },
  { id: "ar" as AppLanguage,  flag: "AR" },
]).map(({ id, label, flag }) => (
  <Pressable
    key={id}
    style={[styles.langBtn, currentLang === id && styles.langBtnActive]}
    onPress={() => handleLanguageChange(id)}
  >
    <Text style={[styles.langFlag, currentLang === id && { color: colors.textOnDark }]}>{flag}</Text>
    <Text style={[styles.langBtnText, currentLang === id && styles.langBtnTextActive]}>
      {label}
    </Text>
  </Pressable>
))}
          </View>
        </View>

        {/* Account & legal */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>{t("profile.cloudAccount")}</Text>
          </View>

          <View style={styles.syncRow}>
            <View style={[styles.syncDot, { backgroundColor: syncStatus === "synced" ? colors.success : syncStatus === "syncing" ? colors.warning : colors.textTertiary }]} />
            <Text style={styles.syncText}>
              {syncStatus === "synced" ? t("profile.synced") || "Synchronisé" : syncStatus === "syncing" ? t("profile.syncing") || "Synchronisation..." : t("profile.notSynced") || "Non synchronisé"}
            </Text>
          </View>
          <Text style={styles.syncNote}>{t("profile.autoSync")}</Text>

          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>{t("profile.logout")}</Text>
          </Pressable>
        </View>

        {/* Legal links */}
        <View style={styles.legalRow}>
          <Pressable onPress={() => Linking.openURL("https://derkhamza.github.io/blackpine-legal/")}>
            <Text style={styles.legalLink}>{t("profile.privacyPolicy")}</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable onPress={() => Linking.openURL("https://derkhamza.github.io/blackpine-legal/terms.html")}>
            <Text style={styles.legalLink}>{t("profile.terms")}</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>
          Blackpine Cabinet · Config {result.configVersion}
        </Text>

      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: 40 },

  // Brand
  brandHeader: { alignItems: "center", marginBottom: spacing.md },
  brandMark: { fontSize: 22, fontWeight: "800", letterSpacing: 5, color: colors.brand, marginTop: spacing.sm },
  brandSub: { fontSize: 10, letterSpacing: 4, color: colors.gold, marginTop: 2 },
  brandMotto: { fontSize: 11, color: colors.textTertiary, marginTop: 6, fontStyle: "italic" },

  // Profile card
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  profileRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: { fontSize: 18, fontWeight: "700", color: colors.brand },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  profileMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  // Sections
  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.md,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand },
  sectionTitle: {
    ...typography.micro,
    color: colors.textSecondary,
    textTransform: "uppercase",
  },

  // Fields
  fieldLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: "600", marginBottom: 6 },
  editableField: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.bg,
    marginBottom: spacing.md,
  },
  editableText: { fontSize: 15, color: colors.textPrimary },
  editIcon: { fontSize: 14, color: colors.brand },

  // Counter
  counterRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  counterBtnText: { fontSize: 18, fontWeight: "700", color: colors.brand },
  counterValue: { fontSize: 20, fontWeight: "800", color: colors.textPrimary, minWidth: 30, textAlign: "center" },
  counterHint: { fontSize: 11, color: colors.textTertiary, marginLeft: spacing.sm },

  // Regime
  regimeBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.pill,
    marginBottom: spacing.sm,
  },
  regimeText: { fontSize: 14, fontWeight: "700", color: colors.brand },

  // Chips
  chipRow: { flexDirection: "row", gap: 8, marginBottom: spacing.md, flexWrap: "wrap" },
  chip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  chipTextActive: { color: colors.textOnDark },

  // Language
  langBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  langBtnActive: { backgroundColor: colors.brand, borderColor: colors.brand },
langFlag: { fontSize: 13, fontWeight: "700", color: colors.textTertiary },
  langBtnText: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  langBtnTextActive: { color: colors.textOnDark },

  // Sync
  syncRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.xs },
  syncDot: { width: 8, height: 8, borderRadius: 4 },
  syncText: { fontSize: 13, color: colors.textPrimary, fontWeight: "500" },
  syncNote: { fontSize: 11, color: colors.textTertiary, fontStyle: "italic", marginBottom: spacing.md },

  // Logout
  logoutBtn: {
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  logoutBtnText: { fontSize: 13, color: colors.danger, fontWeight: "600" },

  // Legal
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.sm,
  },
  legalLink: { fontSize: 12, color: colors.brand, textDecorationLine: "underline" },
  legalDot: { fontSize: 12, color: colors.textTertiary },

  footer: { fontSize: 10, color: colors.textTertiary, textAlign: "center", marginTop: spacing.sm },
});