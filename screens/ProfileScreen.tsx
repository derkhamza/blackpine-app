import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
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
import { SyncIndicator } from "../components/SyncIndicator";
import { getStoredUser} from "../lib/api";
import { colors, radii, shadows, spacing, typography } from "../lib/theme";
import { useT } from "../lib/useT";
import { AppLanguage } from "../lib/i18n";
import { applyRTL } from "../lib/rtl";
import { SafeScreen } from "../components/SafeScreen";
import { CityPicker } from "../components/CityPicker";

export function ProfileScreen() {
  const { profile, setProfile, result, saving, lastSavedAt, syncStatus, lastSyncedAt, isAuthenticated, onLogout } = useApp();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { t, currentLang, changeLanguage } = useT();
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  useEffect(() => {
    (async () => {
      const user = await getStoredUser();
    })();
  }, []);



  const practiceLabel = (type: string): string => {
    if (type === "CABINET_ONLY") return t("profile.cabinetOnly");
    if (type === "CLINIC_ONLY") return t("profile.clinicOnly");
    if (type === "MIXED") return t("profile.mixed");
    return type;
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

  const onDateChange = (_: unknown, selected?: Date) => {
    if (Platform.OS !== "ios") setShowDatePicker(false);
    if (selected) {
      setProfile({ ...profile, activityStartDate: selected.toISOString().split("T")[0] });
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      t("profile.logout"),
      t("profile.resetWarning"),
      [
        { text: t("cancel"), style: "cancel" },
        { text: t("profile.logout"), style: "destructive", onPress: onLogout },
      ]
    );
  };

  return (
  <SafeScreen>
  <ScrollView
    style={styles.container}
    contentContainerStyle={styles.content}
    keyboardShouldPersistTaps="handled"
  >
    <ScrollView style={styles.container} contentContainerStyle={styles.content}></ScrollView>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>{t("profile.title")}</Text>
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
          <Text style={styles.sectionTitle}>{t("profile.cloudAccount")}</Text>
          <SyncIndicator
            saving={saving}
            lastSavedAt={lastSavedAt}
            syncStatus={syncStatus}
            lastSyncedAt={lastSyncedAt}
            isAuthenticated={isAuthenticated}
          />
          <Text style={styles.syncNote}>{t("profile.autoSync")}</Text>
          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>{t("profile.logout")}</Text>
          </Pressable>
        </View>

      {/* PROFILE INFO */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("profile.fiscalInfo")}</Text>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t("profile.dependents")}</Text>
            <Text style={styles.fieldLabel}>{t("profile.commune")}</Text>
            <Pressable style={styles.editableInput} onPress={() => setCityPickerOpen(true)}>
              <Text style={{ fontSize: 15, color: profile.commune ? colors.textPrimary : colors.textTertiary }}>
                {profile.commune || t("onboarding.cityPlaceholder")}
              </Text>
            </Pressable>

            <CityPicker
              visible={cityPickerOpen}
              value={profile.commune}
              onSelect={(city) => setProfile({ ...profile, commune: city })}
              onClose={() => setCityPickerOpen(false)}
            />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t("profile.activityStart")}</Text>
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
        <Text style={styles.sectionTitle}>{t("profile.fiscalRegime")}</Text>
        <Row label={t("profile.regime")} value={result.tax.regime} />

        <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>{t("profile.practice")}</Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: spacing.md, flexWrap: "wrap" }}>
          {(["CABINET_ONLY", "CLINIC_ONLY", "MIXED"] as const).map((pt) => (
            <Pressable
              key={pt}
              style={[styles.langBtn, profile.practiceType === pt && styles.langBtnActive]}
              onPress={() => setProfile({ ...profile, practiceType: pt })}
            >
              <Text style={[styles.langBtnText, profile.practiceType === pt && styles.langBtnTextActive]}>
                {practiceLabel(pt)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>{t("profile.commune")}</Text>
        <Pressable style={styles.editableInput} onPress={() => setCityPickerOpen(true)}>
          <Text style={{ fontSize: 15, color: profile.commune ? colors.textPrimary : colors.textTertiary }}>
            {profile.commune || t("onboarding.cityPlaceholder")}
          </Text>
        </Pressable>

        <View style={{ flexDirection: "row", gap: 8, marginTop: spacing.sm }}>
          {(["URBAN", "RURAL"] as const).map((z) => (
            <Pressable
              key={z}
              style={[styles.langBtn, profile.communeType === z && styles.langBtnActive]}
              onPress={() => setProfile({ ...profile, communeType: z })}
            >
              <Text style={[styles.langBtnText, profile.communeType === z && styles.langBtnTextActive]}>
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
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("profile.language")}</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            style={[styles.langBtn, currentLang === "fr" && styles.langBtnActive]}
            onPress={() => handleLanguageChange("fr")}
          >
            <Text style={[styles.langBtnText, currentLang === "fr" && styles.langBtnTextActive]}>
              {t("profile.french")}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.langBtn, currentLang === "en" && styles.langBtnActive]}
            onPress={() => handleLanguageChange("en")}
          >
            <Text style={[styles.langBtnText, currentLang === "en" && styles.langBtnTextActive]}>
              {t("profile.english")}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.langBtn, currentLang === "ar" && styles.langBtnActive]}
            onPress={() => handleLanguageChange("ar")}
          >
            <Text style={[styles.langBtnText, currentLang === "ar" && styles.langBtnTextActive]}>
              {t("profile.arabic")}
            </Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.footer}>
        Blackpine Cabinet · Config fiscale {result.configVersion}
      </Text>
    </ScrollView>
  </ScrollView>
  </SafeScreen>
);
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
  chipBtn: {
  paddingVertical: 8,
  paddingHorizontal: 14,
  borderRadius: radii.pill,
  backgroundColor: colors.surface,
  borderWidth: 1.5,
  borderColor: colors.border,
  alignItems: "center",
  justifyContent: "center",
},
chipBtnActive: {
  backgroundColor: colors.brand,
  borderColor: colors.brand,
},
chipBtnText: {
  fontSize: 13,
  fontWeight: "600",
  color: colors.textPrimary,
  textAlign: "center",
},
chipBtnTextActive: {
  color: colors.textOnDark,
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
  editableInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
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
langBtn: {
  flex: 1,
  paddingVertical: 12,
  paddingHorizontal: 14,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.surface,
  borderRadius: radii.sm,
  borderWidth: 1.5,
  borderColor: colors.border,
},
  langBtnActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  langBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "center",
  },
  langBtnTextActive: {
    color: colors.textOnDark,
  },

});