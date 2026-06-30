import { useCallback, useEffect, useRef, useState, useMemo} from "react";
import {
  Alert, Linking, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Switch, Text, TextInput, View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useApp } from "../lib/AppContext";
import { useCabinet } from "../lib/CabinetContext";
import { radii, shadows, spacing, typography, ColorPalette } from "../lib/theme";
import { useColors, useTheme } from "../lib/ThemeContext";
import { useT } from "../lib/useT";
import { AppLanguage } from "../lib/i18n";
import { SafeScreen } from "../components/SafeScreen";
import { CityPicker } from "../components/CityPicker";
import { Icon } from "../lib/icons";
import { DoctorProfile as CabinetDoctorProfile, ActeCode, DocumentSettings, DEFAULT_DOCUMENT_SETTINGS } from "../lib/cabinetTypes";
import { uuid } from "../lib/utils";
import { InviteSecretaryModal } from "../components/InviteSecretaryModal";
import { PRIVACY_POLICY_URL, TERMS_URL } from "../lib/constants";
import { isBiometricAvailable } from "../lib/biometric";
import { ThemeMode } from "../lib/storage";

// ─── Style factories ──────────────────────────────────────────────────────────

const makeModalStyles = (c: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.surface,
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: c.textPrimary },
  headerBtn: { minWidth: 60 },
  cancelText: { fontSize: 15, color: c.textSecondary },
  saveText: { fontSize: 15, fontWeight: "700", color: c.brand, textAlign: "right" },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: 60 },
  label: { fontSize: 13, fontWeight: "600", color: c.textSecondary, marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: c.border, borderRadius: radii.md,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: c.textPrimary, backgroundColor: c.surface,
  },
  hint: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: spacing.xl, padding: spacing.md,
    backgroundColor: c.brandSoft, borderRadius: radii.md,
  },
  hintText: { fontSize: 12, color: c.brand, flex: 1, lineHeight: 18 },
});

const makeRowStyles = (c: ColorPalette) => StyleSheet.create({
  container: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: c.border, gap: spacing.md,
  },
  label: { fontSize: 12, fontWeight: "600", color: c.textSecondary, flexShrink: 0 },
  value: { fontSize: 13, color: c.textPrimary, textAlign: "right", flex: 1 },
  empty: { color: c.textTertiary, fontStyle: "italic" as const },
});

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: spacing.lg, paddingBottom: 40 },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  headerTitle: { fontSize: 26, fontWeight: "800" as const, color: c.textPrimary, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: c.brand, marginTop: 2, fontWeight: "500" as const },

  profileCard: {
    backgroundColor: c.surface, borderRadius: radii.lg,
    padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: c.border, ...shadows.card,
  },
  profileRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  profileAvatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: c.brandSoft,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: c.brand + "30",
  },
  profileAvatarText: { fontSize: 22, fontWeight: "800", color: c.brand },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: "800", color: c.textPrimary, letterSpacing: -0.3 },
  profileMeta: { fontSize: 12, color: c.textSecondary, marginTop: 3 },

  syncPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: radii.pill, borderWidth: 1,
  },
  syncDot: { width: 6, height: 6, borderRadius: 3 },
  syncPillText: { fontSize: 10, fontWeight: "600" },

  section: {
    backgroundColor: c.surface, borderRadius: radii.lg,
    padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: c.border, ...shadows.card,
  },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  sectionTitle: { ...typography.micro, color: c.brand, textTransform: "uppercase", letterSpacing: 0.6 },

  editBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radii.pill, borderWidth: 1, borderColor: c.brand,
  },
  editBtnText: { fontSize: 11, fontWeight: "600", color: c.brand },

  regimeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  regimeBadge: { backgroundColor: c.brandSoft, paddingHorizontal: 12, paddingVertical: 4, borderRadius: radii.pill },
  regimeText: { fontSize: 13, fontWeight: "700", color: c.brand },

  fieldLabel: {
    fontSize: 11, fontWeight: "600", color: c.textTertiary,
    textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6,
  },

  chipRow: { flexDirection: "row", gap: 8, marginBottom: spacing.md, flexWrap: "wrap" },
  chip: {
    flex: 1, paddingVertical: 10, alignItems: "center", justifyContent: "center",
    backgroundColor: c.bg, borderRadius: radii.md, borderWidth: 1.5, borderColor: c.border,
  },
  chipActive: { backgroundColor: c.brand, borderColor: c.brand },
  chipText: { fontSize: 12, fontWeight: "600", color: c.textPrimary },
  chipTextActive: { color: c.textOnDark },

  twoColRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md, alignItems: "flex-start" },
  editableField: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderWidth: 1, borderColor: c.border, borderRadius: radii.md,
    paddingHorizontal: 12, paddingVertical: 11, backgroundColor: c.bg,
  },
  editableText: { fontSize: 13, color: c.textPrimary, flex: 1, marginRight: 4 },

  zoneStack: { gap: 6 },
  zoneChip: {
    paddingVertical: 8, alignItems: "center",
    borderRadius: radii.sm, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.bg,
  },
  zoneChipActive: { backgroundColor: c.brand, borderColor: c.brand },
  zoneChipText: { fontSize: 12, fontWeight: "600", color: c.textPrimary },
  zoneChipTextActive: { color: c.textOnDark },

  counterRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderColor: c.border, borderRadius: radii.md,
    backgroundColor: c.bg, paddingHorizontal: 8, paddingVertical: 6,
  },
  counterBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center",
  },
  counterBtnText: { fontSize: 16, fontWeight: "700", color: c.brand, lineHeight: 20 },
  counterValueBox: { alignItems: "center" },
  counterValue: { fontSize: 17, fontWeight: "800", color: c.textPrimary },
  counterHint: { fontSize: 9, color: c.textTertiary, marginTop: 1 },

  langBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 11, backgroundColor: c.bg,
    borderRadius: radii.md, borderWidth: 1.5, borderColor: c.border,
  },
  langBtnActive: { backgroundColor: c.brand, borderColor: c.brand },
  langFlag: { fontSize: 14 },
  langBtnText: { fontSize: 12, fontWeight: "600", color: c.textPrimary },
  langBtnTextActive: { color: c.textOnDark },

  // Appearance / theme toggle
  themeRow: { gap: spacing.sm },
  themeLabel: { fontSize: 13, fontWeight: "600", color: c.textSecondary },
  themeButtons: { flexDirection: "row", gap: 8 },
  themeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 10, backgroundColor: c.bg,
    borderRadius: radii.md, borderWidth: 1.5, borderColor: c.border,
  },
  themeBtnActive: { backgroundColor: c.brand, borderColor: c.brand },
  themeBtnText: { fontSize: 11, fontWeight: "600", color: c.textSecondary },
  themeBtnTextActive: { color: c.textOnDark },

  syncRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.xs },
  syncText: { fontSize: 13, color: c.textPrimary, fontWeight: "500" },
  syncNote: { fontSize: 11, color: c.textTertiary, fontStyle: "italic", marginBottom: spacing.md },

  logoutBtn: {
    paddingVertical: 13, alignItems: "center",
    borderRadius: radii.md, borderWidth: 1.5, borderColor: c.danger + "66",
    backgroundColor: c.dangerSoft, marginBottom: spacing.md,
    flexDirection: "row", justifyContent: "center", gap: 7,
  },
  logoutBtnText: { fontSize: 14, color: c.danger, fontWeight: "700" },

  legalRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  legalLink: { fontSize: 11, color: c.brand, textDecorationLine: "underline" },
  legalDot: { fontSize: 11, color: c.textTertiary },

  footer: { fontSize: 10, color: c.textTertiary, textAlign: "center", marginTop: spacing.sm },

  letterheadCard: {
    backgroundColor: c.surface, borderRadius: radii.lg,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: c.brand + "44", ...shadows.card,
  },
  letterheadHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.sm },
  letterheadCardTitle: { fontSize: 10, fontWeight: "700", color: c.brand, textTransform: "uppercase", letterSpacing: 0.6 },
  letterheadPreview: {
    backgroundColor: c.surfaceAlt, borderRadius: radii.sm,
    borderWidth: 1, borderColor: c.border, padding: 12,
  },
  letterheadBorder: { borderLeftWidth: 3, borderLeftColor: c.brand, paddingLeft: 10 },
  letterheadDrName: { fontSize: 15, fontWeight: "800", color: c.textPrimary, marginBottom: 3 },
  letterheadMeta: { fontSize: 10, color: c.textSecondary, lineHeight: 16 },

  navRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: spacing.md, gap: spacing.md,
  },
  navRowIcon: {
    width: 40, height: 40, borderRadius: radii.md,
    backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center",
  },
  navRowTitle: { fontSize: 14, fontWeight: "700", color: c.textPrimary, letterSpacing: -0.1 },
  navRowSub: { fontSize: 11, color: c.textSecondary, marginTop: 2 },
  navDivider: { height: 1, backgroundColor: c.border, marginVertical: spacing.xs },

  // ── Acte codes ──
  acteHint: { fontSize: 12, color: c.textSecondary, marginBottom: spacing.sm },
  docToggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, paddingVertical: 4 },
  docToggleLabel: { fontSize: 13, color: c.textPrimary, flex: 1 },
  acteEmpty: { fontSize: 12, color: c.textTertiary, fontStyle: "italic", marginBottom: spacing.sm },
  acteRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border },
  acteCodeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.sm, backgroundColor: c.brandSoft, minWidth: 36, alignItems: "center" },
  acteCodeText: { fontSize: 12, fontWeight: "800", color: c.brand },
  acteLabel: { flex: 1, fontSize: 13, color: c.textPrimary },
  actePrice: { fontSize: 12, fontWeight: "700", color: c.textSecondary },
  acteAddBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, marginTop: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: c.brand + "44", backgroundColor: c.brandSoft },
  acteAddText: { fontSize: 13, fontWeight: "700", color: c.brand },
  acteOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000055" },
  acteSheet: { backgroundColor: c.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
  acteHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: "center", marginBottom: spacing.md },
  acteModalTitle: { ...typography.h3, color: c.textPrimary, marginBottom: spacing.md },
  acteModalLabel: { fontSize: 12, fontWeight: "600", color: c.textSecondary, marginBottom: 6, marginTop: spacing.sm },
  acteInput: { backgroundColor: c.bg, borderRadius: radii.sm, borderWidth: 1, borderColor: c.border, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, color: c.textPrimary },
  acteCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: radii.lg, borderWidth: 1, borderColor: c.border, alignItems: "center" },
  acteCancelText: { fontSize: 15, fontWeight: "600", color: c.textSecondary },
  acteSaveBtn: { flex: 1, paddingVertical: 13, borderRadius: radii.lg, backgroundColor: c.brand, alignItems: "center" },
  acteSaveText: { fontSize: 15, fontWeight: "700", color: c.textOnDark },
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function DoctorEditModal({ visible, initial, onSave, onCancel }: {
  visible: boolean; initial: CabinetDoctorProfile;
  onSave: (d: CabinetDoctorProfile) => void; onCancel: () => void;
}) {
  const { t } = useT();
  const colors = useColors();
  const modal = makeModalStyles(colors);
  const [draft, setDraft] = useState(initial);
  const specialtyRef = useRef<TextInput>(null);
  const inpeRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const accountantPhoneRef = useRef<TextInput>(null);

  useEffect(() => { if (visible) setDraft(initial); }, [visible]);
  const field = (patch: Partial<CabinetDoctorProfile>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <View style={modal.container}>
        <View style={modal.header}>
          <Pressable onPress={onCancel} style={modal.headerBtn}>
            <Text style={modal.cancelText}>{t("cancel")}</Text>
          </Pressable>
          <Text style={modal.headerTitle}>{t("doctor.section")}</Text>
          <Pressable onPress={() => onSave(draft)} style={modal.headerBtn} disabled={!draft.fullName.trim()}>
            <Text style={[modal.saveText, !draft.fullName.trim() && { opacity: 0.4 }]}>{t("save")}</Text>
          </Pressable>
        </View>
        <ScrollView style={modal.scroll} contentContainerStyle={modal.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={modal.label}>{t("doctor.fullName")} *</Text>
          <TextInput style={modal.input} value={draft.fullName} onChangeText={(v) => field({ fullName: v })}
            placeholder={t("doctor.fullNamePlaceholder")} placeholderTextColor={colors.textTertiary}
            autoCapitalize="words" returnKeyType="next" onSubmitEditing={() => specialtyRef.current?.focus()} />
          <Text style={[modal.label, { marginTop: spacing.md }]}>{t("doctor.specialty")}</Text>
          <TextInput ref={specialtyRef} style={modal.input} value={draft.specialtyLabel ?? ""}
            onChangeText={(v) => field({ specialtyLabel: v })} placeholder={t("doctor.specialtyPlaceholder")}
            placeholderTextColor={colors.textTertiary} autoCapitalize="sentences"
            returnKeyType="next" onSubmitEditing={() => inpeRef.current?.focus()} />
          <Text style={[modal.label, { marginTop: spacing.md }]}>{t("doctor.inpe")}</Text>
          <TextInput ref={inpeRef} style={modal.input} value={draft.inpe ?? ""}
            onChangeText={(v) => field({ inpe: v })} placeholder={t("doctor.inpePlaceholder")}
            placeholderTextColor={colors.textTertiary} keyboardType="numbers-and-punctuation"
            returnKeyType="next" onSubmitEditing={() => addressRef.current?.focus()} />
          <Text style={[modal.label, { marginTop: spacing.md }]}>{t("doctor.address")}</Text>
          <TextInput ref={addressRef} style={modal.input} value={draft.address ?? ""}
            onChangeText={(v) => field({ address: v })} placeholder={t("doctor.addressPlaceholder")}
            placeholderTextColor={colors.textTertiary} returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()} />
          <Text style={[modal.label, { marginTop: spacing.md }]}>{t("doctor.phone")}</Text>
          <TextInput ref={phoneRef} style={modal.input} value={draft.phone ?? ""}
            onChangeText={(v) => field({ phone: v })} placeholder={t("doctor.phonePlaceholder")}
            placeholderTextColor={colors.textTertiary} keyboardType="phone-pad" returnKeyType="next"
            onSubmitEditing={() => accountantPhoneRef.current?.focus()} />
          <Text style={[modal.label, { marginTop: spacing.md }]}>{t("doctor.accountantPhone")}</Text>
          <TextInput ref={accountantPhoneRef} style={modal.input} value={draft.accountantPhone ?? ""}
            onChangeText={(v) => field({ accountantPhone: v })} placeholder={t("doctor.accountantPhonePlaceholder")}
            placeholderTextColor={colors.textTertiary} keyboardType="phone-pad" returnKeyType="done" />
          <View style={modal.hint}>
            <Icon name="messageCircle" size={13} color={colors.brand} />
            <Text style={modal.hintText}>{t("doctor.accountantHint")}</Text>
          </View>
          <View style={[modal.hint, { marginTop: spacing.xs }]}>
            <Icon name="pill" size={13} color={colors.brand} />
            <Text style={modal.hintText}>{t("doctor.hint")}</Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function InfoRow({ label, value, placeholder }: { label: string; value?: string; placeholder: string }) {
  const colors = useColors();
  const row = makeRowStyles(colors);
  return (
    <View style={row.container}>
      <Text style={row.label}>{label}</Text>
      <Text style={[row.value, !value && row.empty]} numberOfLines={1} ellipsizeMode="tail">
        {value || placeholder}
      </Text>
    </View>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function ProfileScreen({ navigation }: { navigation?: any }) {
  const { profile, setProfile, result, syncStatus, isAuthenticated, onLogout, biometricEnabled, setBiometricEnabled, eodNotifEnabled, setEodNotifEnabled } = useApp();
  const { doctorProfile, updateDoctorProfile, employees } = useCabinet();
  const colors = useColors();
  const { themeMode, setThemeMode } = useTheme();
const styles = useMemo(() => makeStyles(colors), [colors]);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [acteModalOpen, setActeModalOpen] = useState(false);

  const acteCodes = doctorProfile.acteCodes ?? [];
  const addActe = (a: ActeCode) => {
    updateDoctorProfile({ ...doctorProfile, acteCodes: [...acteCodes, a] });
    setActeModalOpen(false);
  };
  const removeActe = (id: string) =>
    updateDoctorProfile({ ...doctorProfile, acteCodes: acteCodes.filter((a) => a.id !== id) });

  const docSettings = doctorProfile.documentSettings ?? DEFAULT_DOCUMENT_SETTINGS;
  const setDocSetting = (patch: Partial<DocumentSettings>) =>
    updateDoctorProfile({ ...doctorProfile, documentSettings: { ...DEFAULT_DOCUMENT_SETTINGS, ...doctorProfile.documentSettings, ...patch } });
  const { t, currentLang, changeLanguage } = useT();

  useEffect(() => {
    if (Platform.OS !== "web") {
      isBiometricAvailable().then(setBiometricAvailable);
    }
  }, []);

  const specialtyLabels: Record<string, string> = {
    medecin_generaliste: t("onboarding.specialties.medecin_generaliste"),
    medecin_specialiste: t("onboarding.specialties.medecin_specialiste"),
    dentiste: t("onboarding.specialties.dentiste"),
    kinesitherapeute: t("onboarding.specialties.kinesitherapeute"),
    sage_femme: t("onboarding.specialties.sage_femme"),
    autre: t("onboarding.specialties.autre"),
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
    if (selected) setProfile({ ...profile, activityStartDate: selected.toISOString().split("T")[0] });
  };

  const handleSaveDoctor = useCallback((d: CabinetDoctorProfile) => {
    updateDoctorProfile(d);
    setEditModalOpen(false);
  }, [updateDoctorProfile]);

  const syncColor =
    syncStatus === "synced" ? colors.success
    : syncStatus === "syncing" ? colors.warning
    : colors.textTertiary;

  const themeOptions: { mode: ThemeMode; label: string; icon: "monitor" | "sun" | "moon" }[] = [
    { mode: "system", label: t("profile.themeSystem"), icon: "monitor" },
    { mode: "light",  label: t("profile.themeLight"),  icon: "sun" },
    { mode: "dark",   label: t("profile.themeDark"),   icon: "moon" },
  ];

  return (
    <SafeScreen>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t("profile.title")}</Text>
          {doctorProfile.fullName ? (
            <Text style={styles.headerSub}>{doctorProfile.fullName}</Text>
          ) : null}
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Profile summary card */}
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {(doctorProfile.fullName || profile.specialty || "M").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {doctorProfile.fullName || specialtyLabels[profile.specialty || ""] || t("profile.title")}
              </Text>
              <Text style={styles.profileMeta}>{profile.commune} · {result.tax.regime}</Text>
            </View>
            <View style={[styles.syncPill, { borderColor: syncColor }]}>
              <View style={[styles.syncDot, { backgroundColor: syncColor }]} />
              <Text style={[styles.syncPillText, { color: syncColor }]}>
                {syncStatus === "synced" ? t("profile.synced") : syncStatus === "syncing" ? t("profile.syncing") : t("profile.notSynced")}
              </Text>
            </View>
          </View>
        </View>

        {/* 1. Mon cabinet */}
        <Section
          title={t("doctor.section")}
          action={
            <Pressable style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.7 }]} onPress={() => setEditModalOpen(true)}>
              <Icon name="edit" size={12} color={colors.brand} />
              <Text style={styles.editBtnText}>{t("modify")}</Text>
            </Pressable>
          }
        >
          <InfoRow label={t("doctor.fullName")}  value={doctorProfile.fullName}       placeholder={t("doctor.fullNamePlaceholder")} />
          <InfoRow label={t("doctor.specialty")} value={doctorProfile.specialtyLabel} placeholder={t("doctor.specialtyPlaceholder")} />
          <InfoRow label={t("doctor.inpe")}      value={doctorProfile.inpe}           placeholder={t("doctor.inpePlaceholder")} />
          <InfoRow label={t("doctor.address")}   value={doctorProfile.address}        placeholder={t("doctor.addressPlaceholder")} />
          {(() => {
            const row = makeRowStyles(colors);
            return (
              <View style={row.container}>
                <Text style={row.label}>{t("doctor.phone")}</Text>
                <Text style={[row.value, !doctorProfile.phone && row.empty]}>{doctorProfile.phone || t("doctor.phonePlaceholder")}</Text>
              </View>
            );
          })()}
        </Section>

        {/* Letterhead preview */}
        {doctorProfile.fullName ? (
          <View style={styles.letterheadCard}>
            <View style={styles.letterheadHeader}>
              <Icon name="pdf" size={12} color={colors.brand} />
              <Text style={styles.letterheadCardTitle}>{t("doctor.letterheadPreview")}</Text>
            </View>
            <View style={styles.letterheadPreview}>
              <View style={styles.letterheadBorder}>
                <Text style={styles.letterheadDrName}>Dr. {doctorProfile.fullName}</Text>
                {(doctorProfile.specialtyLabel || doctorProfile.inpe) ? (
                  <Text style={styles.letterheadMeta}>
                    {[doctorProfile.specialtyLabel, doctorProfile.inpe ? `N° INPE : ${doctorProfile.inpe}` : ""].filter(Boolean).join("  ·  ")}
                  </Text>
                ) : null}
                {doctorProfile.address ? <Text style={styles.letterheadMeta}>{doctorProfile.address}</Text> : null}
                {doctorProfile.phone  ? <Text style={styles.letterheadMeta}>{doctorProfile.phone}</Text> : null}
              </View>
            </View>
          </View>
        ) : null}

        {/* 2. Situation professionnelle */}
        <Section title={t("profile.fiscalInfo")}>
          <View style={styles.regimeRow}>
            <Text style={styles.fieldLabel}>{t("profile.fiscalRegime")}</Text>
            <View style={styles.regimeBadge}><Text style={styles.regimeText}>{result.tax.regime}</Text></View>
          </View>
          <FieldLabel>{t("profile.practice")}</FieldLabel>
          <View style={styles.chipRow}>
            {(["CABINET_ONLY", "CLINIC_ONLY", "MIXED"] as const).map((pt) => (
              <Pressable key={pt} style={[styles.chip, profile.practiceType === pt && styles.chipActive]}
                onPress={() => setProfile({ ...profile, practiceType: pt })}>
                <Text style={[styles.chipText, profile.practiceType === pt && styles.chipTextActive]}>{practiceLabels[pt]}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.twoColRow}>
            <View style={{ flex: 2 }}>
              <FieldLabel>{t("profile.commune")}</FieldLabel>
              <Pressable style={styles.editableField} onPress={() => setCityPickerOpen(true)}>
                <Text style={styles.editableText} numberOfLines={1}>{profile.commune || t("onboarding.cityPlaceholder")}</Text>
                <Icon name="edit" size={13} color={colors.textTertiary} />
              </Pressable>
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel>{t("profile.zone") || "Zone"}</FieldLabel>
              <View style={styles.zoneStack}>
                {(["URBAN", "RURAL"] as const).map((z) => (
                  <Pressable key={z} style={[styles.zoneChip, profile.communeType === z && styles.zoneChipActive]}
                    onPress={() => setProfile({ ...profile, communeType: z })}>
                    <Text style={[styles.zoneChipText, profile.communeType === z && styles.zoneChipTextActive]}>
                      {z === "URBAN" ? t("profile.urban") : t("profile.rural")}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
          <View style={styles.twoColRow}>
            <View style={{ flex: 1 }}>
              <FieldLabel>{t("profile.activityStart")}</FieldLabel>
              <Pressable style={styles.editableField} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.editableText}>
                  {new Date(profile.activityStartDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                </Text>
                <Icon name="edit" size={13} color={colors.textTertiary} />
              </Pressable>
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel>{t("profile.dependents")}</FieldLabel>
              <View style={styles.counterRow}>
                <Pressable style={styles.counterBtn} onPress={() => setProfile({ ...profile, dependentsCount: Math.max(0, profile.dependentsCount - 1) })}>
                  <Text style={styles.counterBtnText}>−</Text>
                </Pressable>
                <View style={styles.counterValueBox}>
                  <Text style={styles.counterValue}>{profile.dependentsCount}</Text>
                  <Text style={styles.counterHint}>{500 * profile.dependentsCount} MAD</Text>
                </View>
                <Pressable style={styles.counterBtn} onPress={() => setProfile({ ...profile, dependentsCount: Math.min(6, profile.dependentsCount + 1) })}>
                  <Text style={styles.counterBtnText}>+</Text>
                </Pressable>
              </View>
            </View>
          </View>
          {showDatePicker && (
            <DateTimePicker value={new Date(profile.activityStartDate)} mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onDateChange} maximumDate={new Date()} />
          )}
          <CityPicker visible={cityPickerOpen} value={profile.commune}
            onSelect={(city) => setProfile({ ...profile, commune: city })}
            onClose={() => setCityPickerOpen(false)} />
        </Section>

        {/* 2b. Codes actes (medical act codes for billing) */}
        <Section title={t("actes.title")}>
          <Text style={styles.acteHint}>{t("actes.hint")}</Text>
          {acteCodes.length === 0 ? (
            <Text style={styles.acteEmpty}>{t("actes.empty")}</Text>
          ) : (
            acteCodes.map((a) => (
              <View key={a.id} style={styles.acteRow}>
                <View style={styles.acteCodeBadge}><Text style={styles.acteCodeText}>{a.code}</Text></View>
                <Text style={styles.acteLabel} numberOfLines={1}>{a.label}</Text>
                {a.price != null && <Text style={styles.actePrice}>{a.price} MAD</Text>}
                <Pressable hitSlop={8} onPress={() => removeActe(a.id)}>
                  <Icon name="delete" size={15} color={colors.textTertiary} />
                </Pressable>
              </View>
            ))
          )}
          <Pressable style={styles.acteAddBtn} onPress={() => setActeModalOpen(true)}>
            <Icon name="add" size={15} color={colors.brand} />
            <Text style={styles.acteAddText}>{t("actes.add")}</Text>
          </Pressable>
        </Section>

        {/* 2c. Format des documents (facture / ordonnance / certificat) */}
        <Section title={t("docSettings.title")}>
          <Text style={styles.acteHint}>{t("docSettings.hint")}</Text>
          <View style={styles.docToggleRow}>
            <Text style={styles.docToggleLabel}>{t("docSettings.showInpe")}</Text>
            <Switch
              value={docSettings.showInpe !== false}
              onValueChange={(v) => setDocSetting({ showInpe: v })}
              trackColor={{ true: colors.brand }}
            />
          </View>
          <Text style={styles.acteModalLabel}>{t("docSettings.headerNote")}</Text>
          <TextInput
            style={styles.acteInput}
            value={docSettings.headerNote ?? ""}
            onChangeText={(v) => setDocSetting({ headerNote: v.trim() || undefined })}
            placeholder={t("docSettings.headerNotePlaceholder")}
            placeholderTextColor={colors.textTertiary}
          />
          <Text style={styles.acteModalLabel}>{t("docSettings.footerNote")}</Text>
          <TextInput
            style={styles.acteInput}
            value={docSettings.footerNote ?? ""}
            onChangeText={(v) => setDocSetting({ footerNote: v.trim() || undefined })}
            placeholder={t("docSettings.footerNotePlaceholder")}
            placeholderTextColor={colors.textTertiary}
          />
        </Section>

        {/* 3. Langue */}
        <Section title={t("profile.language")}>
          <View style={styles.chipRow}>
            {([
              { id: "fr" as AppLanguage, flag: "🇫🇷", label: t("profile.french") },
              { id: "en" as AppLanguage, flag: "🇬🇧", label: t("profile.english") },
              { id: "ar" as AppLanguage, flag: "🇲🇦", label: t("profile.arabic") },
            ]).map(({ id, label, flag }) => (
              <Pressable key={id} style={[styles.langBtn, currentLang === id && styles.langBtnActive]}
                onPress={() => handleLanguageChange(id)}>
                <Text style={styles.langFlag}>{flag}</Text>
                <Text style={[styles.langBtnText, currentLang === id && styles.langBtnTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </Section>

        {/* 4. Apparence */}
        <Section title={t("profile.appearance")}>
          <View style={styles.themeRow}>
            <Text style={styles.themeLabel}>{t("profile.theme")}</Text>
            <View style={styles.themeButtons}>
              {themeOptions.map(({ mode, label, icon }) => (
                <Pressable key={mode}
                  style={[styles.themeBtn, themeMode === mode && styles.themeBtnActive]}
                  onPress={() => setThemeMode(mode)}>
                  <Icon name={icon} size={14} color={themeMode === mode ? colors.textOnDark : colors.textSecondary} />
                  <Text style={[styles.themeBtnText, themeMode === mode && styles.themeBtnTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Section>

        {/* 5. Statistiques */}
        <Section title="Analytique">
          <Pressable style={styles.navRow} onPress={() => navigation?.navigate("Stats")}>
            <View style={[styles.navRowIcon, { backgroundColor: colors.brandSoft }]}>
              <Icon name="barChart" size={18} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navRowTitle}>Votre cabinet en chiffres</Text>
              <Text style={styles.navRowSub}>Statistiques, records, fidélisation patients</Text>
            </View>
            <View style={{ transform: [{ scaleX: -1 }] }}>
              <Icon name="back" size={14} color={colors.textTertiary} />
            </View>
          </Pressable>
        </Section>

        {/* 6. Personnel & Accès */}
        <Section title={t("payroll.title")}>
          <Pressable style={styles.navRow} onPress={() => navigation?.navigate("Payroll")}>
            <View style={styles.navRowIcon}>
              <Icon name="users" size={18} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navRowTitle}>{t("payroll.title")}</Text>
              <Text style={styles.navRowSub}>
                {employees.length > 0
                  ? `${employees.length} employé${employees.length > 1 ? "s" : ""} · ${t("payroll.subtitle")}`
                  : t("payroll.noEmployees")}
              </Text>
            </View>
            <View style={{ transform: [{ scaleX: -1 }] }}>
              <Icon name="back" size={16} color={colors.textTertiary} />
            </View>
          </Pressable>
          <View style={styles.navDivider} />
          <Pressable style={styles.navRow} onPress={() => navigation?.navigate("Stock")}>
            <View style={[styles.navRowIcon, { backgroundColor: colors.brandSoft }]}>
              <Icon name="pill" size={18} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navRowTitle}>{t("stock.title")}</Text>
              <Text style={styles.navRowSub}>{t("stock.navSub")}</Text>
            </View>
            <View style={{ transform: [{ scaleX: -1 }] }}>
              <Icon name="back" size={16} color={colors.textTertiary} />
            </View>
          </Pressable>
          <View style={styles.navDivider} />
          <Pressable style={styles.navRow} onPress={() => navigation?.navigate("Teleconsult")}>
            <View style={[styles.navRowIcon, { backgroundColor: colors.brandSoft }]}>
              <Icon name="monitor" size={18} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navRowTitle}>{t("tele.title")}</Text>
              <Text style={styles.navRowSub}>{t("tele.navSub")}</Text>
            </View>
            <View style={{ transform: [{ scaleX: -1 }] }}>
              <Icon name="back" size={16} color={colors.textTertiary} />
            </View>
          </Pressable>
          <View style={styles.navDivider} />
          <Pressable style={styles.navRow} onPress={() => navigation?.navigate("Notes")}>
            <View style={[styles.navRowIcon, { backgroundColor: colors.brandSoft }]}>
              <Icon name="clipboard" size={18} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navRowTitle}>{t("notes.title")}</Text>
              <Text style={styles.navRowSub}>{t("notes.navSub")}</Text>
            </View>
            <View style={{ transform: [{ scaleX: -1 }] }}>
              <Icon name="back" size={16} color={colors.textTertiary} />
            </View>
          </Pressable>
          <View style={styles.navDivider} />
          <Pressable style={styles.navRow} onPress={() => navigation?.navigate("WaTemplates")}>
            <View style={[styles.navRowIcon, { backgroundColor: colors.successSoft }]}>
              <Icon name="messageCircle" size={18} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navRowTitle}>{t("waTpl.title")}</Text>
              <Text style={styles.navRowSub}>{t("waTpl.navSub")}</Text>
            </View>
            <View style={{ transform: [{ scaleX: -1 }] }}>
              <Icon name="back" size={16} color={colors.textTertiary} />
            </View>
          </Pressable>
          <View style={styles.navDivider} />
          <Pressable style={styles.navRow} onPress={() => setInviteModalOpen(true)}>
            <View style={[styles.navRowIcon, { backgroundColor: colors.successSoft }]}>
              <Icon name="phone" size={18} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navRowTitle}>{t("secretary.inviteTitle")}</Text>
              <Text style={styles.navRowSub}>{t("secretary.inviteSubtitle")}</Text>
            </View>
            <Icon name="add" size={16} color={colors.success} />
          </Pressable>
        </Section>

        {/* 6. Sécurité */}
        {biometricAvailable && (
          <Section title={t("profile.security")}>
            <View style={styles.navRow}>
              <View style={[styles.navRowIcon, { backgroundColor: colors.brandSoft }]}>
                <Icon name="lock" size={18} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.navRowTitle}>{t("profile.biometricLock")}</Text>
                <Text style={styles.navRowSub}>{t("profile.biometricLockSub")}</Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={(v) => setBiometricEnabled(v)}
                trackColor={{ false: colors.borderStrong, true: colors.brand + "80" }}
                thumbColor={biometricEnabled ? colors.brand : colors.textTertiary}
              />
            </View>
          </Section>
        )}

        {/* 7. Notifications */}
        <Section title="Notifications">
          <View style={styles.navRow}>
            <View style={[styles.navRowIcon, { backgroundColor: colors.warningSoft }]}>
              <Icon name="bell" size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navRowTitle}>Bilan de fin de journée</Text>
              <Text style={styles.navRowSub}>Résumé à 19h : patients, recettes, remboursements</Text>
            </View>
            <Switch
              value={eodNotifEnabled}
              onValueChange={(v) => setEodNotifEnabled(v)}
              trackColor={{ false: colors.borderStrong, true: colors.brand + "80" }}
              thumbColor={eodNotifEnabled ? colors.brand : colors.textTertiary}
            />
          </View>
        </Section>

        {/* 8. Compte */}
        <Section title={t("profile.cloudAccount")}>
          <View style={styles.syncRow}>
            <View style={[styles.syncDot, { backgroundColor: syncColor }]} />
            <Text style={styles.syncText}>
              {syncStatus === "synced" ? t("profile.synced") : syncStatus === "syncing" ? t("profile.syncing") : t("profile.notSynced")}
            </Text>
          </View>
          <Text style={styles.syncNote}>{t("profile.autoSync")}</Text>
          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <Icon name="close" size={14} color={colors.danger} />
            <Text style={styles.logoutBtnText}>{t("profile.logout")}</Text>
          </Pressable>
          <View style={styles.legalRow}>
            <Pressable onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
              <Text style={styles.legalLink}>{t("profile.privacyPolicy")}</Text>
            </Pressable>
            <Text style={styles.legalDot}>·</Text>
            <Pressable onPress={() => Linking.openURL(TERMS_URL)}>
              <Text style={styles.legalLink}>{t("profile.terms")}</Text>
            </Pressable>
          </View>
        </Section>

        <Text style={styles.footer}>Blackpine Cabinet · Config {result.configVersion}</Text>

      </ScrollView>

      <DoctorEditModal visible={editModalOpen} initial={doctorProfile}
        onSave={handleSaveDoctor} onCancel={() => setEditModalOpen(false)} />
      <InviteSecretaryModal visible={inviteModalOpen} onClose={() => setInviteModalOpen(false)} t={t} />
      <ActeCodeModal visible={acteModalOpen} onSave={addActe} onClose={() => setActeModalOpen(false)} t={t} />
    </SafeScreen>
  );
}

// ─── Acte code modal ───────────────────────────────────────────────────────────

function ActeCodeModal({
  visible, onSave, onClose, t,
}: {
  visible: boolean;
  onSave: (a: ActeCode) => void;
  onClose: () => void;
  t: (k: string) => string;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [code, setCode]   = useState("");
  const [label, setLabel] = useState("");
  const [price, setPrice] = useState("");
  useEffect(() => { if (visible) { setCode(""); setLabel(""); setPrice(""); } }, [visible]);
  const valid = code.trim() && label.trim();
  const submit = () => {
    if (!valid) return;
    const p = parseFloat(price.replace(",", "."));
    onSave({ id: uuid(), code: code.trim(), label: label.trim(), price: Number.isFinite(p) ? p : undefined });
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.acteOverlay}>
        <View style={styles.acteSheet}>
          <View style={styles.acteHandle} />
          <Text style={styles.acteModalTitle}>{t("actes.add")}</Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.acteModalLabel}>{t("actes.code")}</Text>
              <TextInput style={styles.acteInput} value={code} onChangeText={setCode}
                placeholder="C, CS, K50…" placeholderTextColor={colors.textTertiary} autoCapitalize="characters" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.acteModalLabel}>{t("actes.price")}</Text>
              <TextInput style={styles.acteInput} value={price} onChangeText={setPrice}
                keyboardType="numeric" placeholder="MAD" placeholderTextColor={colors.textTertiary} />
            </View>
          </View>
          <Text style={styles.acteModalLabel}>{t("actes.label")}</Text>
          <TextInput style={styles.acteInput} value={label} onChangeText={setLabel}
            placeholder={t("actes.labelPlaceholder")} placeholderTextColor={colors.textTertiary} />
          <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.lg }}>
            <Pressable style={styles.acteCancelBtn} onPress={onClose}>
              <Text style={styles.acteCancelText}>{t("cancel")}</Text>
            </Pressable>
            <Pressable style={[styles.acteSaveBtn, !valid && { opacity: 0.5 }]} disabled={!valid} onPress={submit}>
              <Text style={styles.acteSaveText}>{t("save")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
