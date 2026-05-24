import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "../components/SafeScreen";
import { PatientModal } from "../components/PatientModal";
import { OrdonnanceModal } from "../components/OrdonnanceModal";
import { buildOrdonnanceHTML } from "../components/OrdonnanceModal";
import { CertificatModal } from "../components/CertificatModal";
import { buildCertificatHTML } from "../components/CertificatModal";
import { useCabinet } from "../lib/CabinetContext";
import { useApp } from "../lib/AppContext";
import { formatMAD } from "../lib/format";
import { BloodType, CertificatMedical, Ordonnance, Patient } from "../lib/cabinetTypes";
import { VitalsTrendChart } from "../components/VitalsTrendChart";
import { Icon } from "../lib/icons";
import { radii, shadows, spacing, typography, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { useT } from "../lib/useT";
import { calcAge, initials, avatarColor } from "../lib/patientHelpers";
import { formatDateShort } from "../lib/format";

const BLOOD_TYPES: BloodType[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// ─── PatientDetailScreen ─────────────────────────────────────────────────────

export function PatientDetailScreen({ route, navigation }: any) {
  const { patientId } = route.params as { patientId: string };
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();
  const { patients, appointments, ordonnances, certificats, updatePatient, deletePatient, doctorProfile, addOrdonnance, addCertificat } = useCabinet();
  const { transactions } = useApp();
  const insets = useSafeAreaInsets();
  const topInset = useTopInset();

  const patient = patients.find((p) => p.id === patientId);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [ordonnanceVisible, setOrdonnanceVisible] = useState(false);
  const [certificatVisible, setCertificatVisible] = useState(false);

  // Inline dossier state
  const [dBloodType, setDBloodType] = useState<BloodType | "">("");
  const [dAllergies, setDAllergies] = useState("");
  const [dAntecedents, setDAntecedents] = useState("");
  const [dMedications, setDMedications] = useState("");
  const [dNotes, setDNotes] = useState("");

  // Sync dossier state when patient changes
  useEffect(() => {
    if (patient) {
      setDBloodType(patient.bloodType || "");
      setDAllergies(patient.allergies || "");
      setDAntecedents(patient.antecedents || "");
      setDMedications(patient.currentMedications || "");
      setDNotes(patient.notes || "");
    }
  }, [patient?.id]);

  const saveDossier = (overrides?: Partial<{
    bloodType: BloodType | "";
    allergies: string;
    antecedents: string;
    currentMedications: string;
    notes: string;
  }>) => {
    if (!patient) return;
    const bt = (overrides?.bloodType ?? dBloodType) as BloodType | undefined;
    updatePatient({
      ...patient,
      bloodType: bt || undefined,
      allergies: (overrides?.allergies ?? dAllergies).trim() || undefined,
      antecedents: (overrides?.antecedents ?? dAntecedents).trim() || undefined,
      currentMedications: (overrides?.currentMedications ?? dMedications).trim() || undefined,
      notes: (overrides?.notes ?? dNotes).trim() || undefined,
    });
  };

  const setBloodTypeAndSave = (bt: BloodType) => {
    const next = dBloodType === bt ? "" : bt;
    setDBloodType(next);
    if (!patient) return;
    updatePatient({ ...patient, bloodType: next as BloodType || undefined });
  };

  const patientAppointments = useMemo(
    () => appointments.filter((a) => a.patientId === patientId),
    [appointments, patientId],
  );

  const lastAppointmentDate = useMemo(() => {
    if (patientAppointments.length === 0) return undefined;
    return [...patientAppointments].sort((a, b) => b.date.localeCompare(a.date))[0].date;
  }, [patientAppointments]);

  const recentAppts = useMemo(
    () => [...patientAppointments].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3),
    [patientAppointments],
  );

  const patientOrdonnances = useMemo(
    () => [...ordonnances.filter((o) => o.patientId === patientId || o.patientName === `${patient?.firstName} ${patient?.lastName}`)]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5),
    [ordonnances, patientId, patient],
  );

  const patientCertificats = useMemo(
    () => [...certificats.filter((c) => c.patientId === patientId || c.patientName === `${patient?.firstName} ${patient?.lastName}`)]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5),
    [certificats, patientId, patient],
  );

  const patientFullName = patient ? `${patient.firstName} ${patient.lastName}` : "";

  // Revenue derived from consultation transactions whose description matches this patient
  const patientRevenue = useMemo(() => {
    if (!patientFullName) return 0;
    return transactions
      .filter(
        (tx) =>
          tx.type === "RECETTE" &&
          tx.category === "consultation" &&
          tx.description === patientFullName
      )
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions, patientFullName]);

  // Billed consultation count from appointments
  const billedApptCount = useMemo(
    () => patientAppointments.filter((a) => !!a.billedAt).length,
    [patientAppointments],
  );

  const avgPerConsult =
    billedApptCount > 0 ? Math.round(patientRevenue / billedApptCount) : 0;

  const [sharingDocId, setSharingDocId] = useState<string | null>(null);

  const shareOrdonnance = async (ord: Ordonnance) => {
    setSharingDocId(ord.id);
    try {
      const html = buildOrdonnanceHTML(ord.patientName, ord.lines, ord.notes ?? "", doctorProfile);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Ordonnance – ${ord.patientName}`,
        UTI: "com.adobe.pdf",
      });
    } catch {
      // cancelled
    } finally {
      setSharingDocId(null);
    }
  };

  const shareCertificat = async (cert: CertificatMedical) => {
    setSharingDocId(cert.id);
    try {
      const CERT_TYPE_LABELS: Record<string, string> = {
        arret_travail: t("certificat.arret_travail"),
        aptitude: t("certificat.aptitude"),
        presence: t("certificat.presence"),
        autre: t("certificat.autre"),
      };
      const duration = cert.durationDays ?? 3;
      const toDate = cert.fromDate
        ? (() => { const d = new Date(cert.fromDate + "T12:00:00"); d.setDate(d.getDate() + duration - 1); return d.toISOString().slice(0, 10); })()
        : cert.date;
      const html = buildCertificatHTML(
        cert.type, cert.patientName, undefined,
        cert.fromDate ?? cert.date, duration, toDate,
        cert.notes ?? "", doctorProfile, t,
      );
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Certificat – ${cert.patientName}`,
        UTI: "com.adobe.pdf",
      });
    } catch {
      // cancelled
    } finally {
      setSharingDocId(null);
    }
  };

  if (!patient) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
            <Icon name="back" size={22} color={colors.brand} />
          </Pressable>
          <Text style={styles.headerTitle}>{t("patients.patient")}</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t("patients.notFound")}</Text>
          <Pressable style={styles.backBtnLarge} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnLargeText}>{t("back")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const age = calcAge(patient.dateOfBirth);
  const color = avatarColor(patient.firstName + patient.lastName);

  const callPatient = () => {
    if (!patient.phone) return;
    Linking.openURL(`tel:${patient.phone.replace(/\s/g, "")}`);
  };

  const handleDelete = () => {
    Alert.alert(t("patients.deleteConfirm"), t("patients.deleteWarning"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: () => {
          deletePatient(patient.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
          <Icon name="back" size={22} color={colors.brand} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("patients.patient")}</Text>
        <Pressable style={styles.editBtn} onPress={() => setEditModalVisible(true)} hitSlop={8}>
          <Icon name="edit" size={17} color={colors.brand} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.xl) + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Avatar + name ────────────────────────────────────────── */}
        <View style={styles.heroSection}>
          <View style={[styles.avatar, { backgroundColor: color + "22" }]}>
            <Text style={[styles.avatarText, { color }]}>{initials(patient)}</Text>
          </View>
          <Text style={styles.patientName}>{patient.firstName} {patient.lastName}</Text>
          <Text style={styles.patientMeta}>
            {patient.gender === "M" ? t("patients.male") : patient.gender === "F" ? t("patients.female") : ""}
            {age !== null ? `  ·  ${age} ${t("patients.age")}` : ""}
          </Text>
        </View>

        {/* ── Stats row ────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{patientAppointments.length}</Text>
            <Text style={styles.statLabel}>{t("patients.appointments")}</Text>
          </View>
          {lastAppointmentDate && (
            <View style={styles.statBox}>
              <Text style={styles.statVal}>
                {lastAppointmentDate.slice(8, 10)}/{lastAppointmentDate.slice(5, 7)}
              </Text>
              <Text style={styles.statLabel}>{t("patients.lastSeen")}</Text>
            </View>
          )}
          {patient.phone && (
            <View style={styles.statBox}>
              <Text style={[styles.statVal, { fontSize: 13 }]}>{patient.phone}</Text>
              <Text style={styles.statLabel}>{t("patients.phone")}</Text>
            </View>
          )}
        </View>

        {/* ── Call button ──────────────────────────────────────────── */}
        {patient.phone && (
          <Pressable style={styles.callBtn} onPress={callPatient}>
            <Icon name="phone" size={16} color={colors.success} />
            <Text style={styles.callBtnText}>{patient.phone}</Text>
          </Pressable>
        )}

        {/* ── Finances ─────────────────────────────────────────────── */}
        {patientRevenue > 0 && (
          <View style={styles.financeCard}>
            <View style={styles.financeTitleRow}>
              <Icon name="dollarSign" size={13} color={colors.success} />
              <Text style={styles.financeTitle}>Finances</Text>
            </View>
            <View style={styles.financeRow}>
              <View style={styles.financeBox}>
                <Text style={[styles.financeValue, { color: colors.success }]}>
                  {formatMAD(patientRevenue)}
                </Text>
                <Text style={styles.financeLabel}>Total facturé</Text>
              </View>
              <View style={styles.financeDivider} />
              <View style={styles.financeBox}>
                <Text style={styles.financeValue}>{billedApptCount}</Text>
                <Text style={styles.financeLabel}>Consultation{billedApptCount > 1 ? "s" : ""}</Text>
              </View>
              <View style={styles.financeDivider} />
              <View style={styles.financeBox}>
                <Text style={styles.financeValue}>{formatMAD(avgPerConsult)}</Text>
                <Text style={styles.financeLabel}>Moy. / séance</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Vitals trend charts ──────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Icon name="heartPulse" size={13} color={colors.danger} />
            <Text style={styles.sectionTitle}>Évolution des constantes</Text>
          </View>
          <VitalsTrendChart appointments={patientAppointments} />
        </View>

        {/* ── Documents ────────────────────────────────────────────── */}
        <View style={styles.actionRow}>
          <Pressable style={styles.actionBtn} onPress={() => setOrdonnanceVisible(true)}>
            <Icon name="pill" size={18} color={colors.brand} />
            <Text style={styles.actionBtnText}>{t("patients.newOrdonnance")}</Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, { borderColor: colors.gold + "66" }]} onPress={() => setCertificatVisible(true)}>
            <Icon name="award" size={18} color={colors.gold} />
            <Text style={[styles.actionBtnText, { color: colors.gold }]}>{t("patients.newCertificat")}</Text>
          </Pressable>
        </View>

        {/* ── Medical Dossier — fully editable inline ──────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Icon name="stethoscope" size={13} color={colors.brand} />
            <Text style={styles.sectionTitle}>{t("patients.medicalDossier")}</Text>
          </View>
          <View style={styles.medCard}>
            {/* Blood type chips */}
            <View style={styles.medFieldBlock}>
              <View style={styles.medFieldRow}>
                <Text style={styles.medFieldLabel}>{t("patients.bloodType")}</Text>
                {dBloodType ? (
                  <View style={styles.bloodTypeBadge}>
                    <Text style={styles.bloodTypeBadgeText}>{dBloodType}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.bloodTypeChips}>
                {BLOOD_TYPES.map((bt) => (
                  <Pressable
                    key={bt}
                    style={[styles.btChip, dBloodType === bt && styles.btChipActive]}
                    onPress={() => setBloodTypeAndSave(bt)}
                  >
                    <Text style={[styles.btChipText, dBloodType === bt && styles.btChipTextActive]}>
                      {bt}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Allergies */}
            <View style={[styles.medFieldBlock, styles.medFieldBorder]}>
              <Text style={[styles.medFieldLabel, { color: colors.danger }]}>
                ⚠ {t("patients.allergies")}
              </Text>
              <TextInput
                style={styles.medInput}
                value={dAllergies}
                onChangeText={setDAllergies}
                onBlur={() => saveDossier()}
                placeholder={t("patients.allergiesPlaceholder")}
                placeholderTextColor={colors.textTertiary}
                multiline
              />
            </View>

            {/* Antécédents */}
            <View style={[styles.medFieldBlock, styles.medFieldBorder]}>
              <Text style={styles.medFieldLabel}>{t("patients.antecedents")}</Text>
              <TextInput
                style={styles.medInput}
                value={dAntecedents}
                onChangeText={setDAntecedents}
                onBlur={() => saveDossier()}
                placeholder={t("patients.antecedentsPlaceholder")}
                placeholderTextColor={colors.textTertiary}
                multiline
              />
            </View>

            {/* Médicaments en cours */}
            <View style={[styles.medFieldBlock, styles.medFieldBorder]}>
              <Text style={styles.medFieldLabel}>{t("patients.currentMedications")}</Text>
              <TextInput
                style={styles.medInput}
                value={dMedications}
                onChangeText={setDMedications}
                onBlur={() => saveDossier()}
                placeholder={t("patients.currentMedicationsPlaceholder")}
                placeholderTextColor={colors.textTertiary}
                multiline
              />
            </View>

            {/* Notes générales */}
            <View style={[styles.medFieldBlock, styles.medFieldBorder]}>
              <Text style={styles.medFieldLabel}>{t("patients.notes")}</Text>
              <TextInput
                style={styles.medInput}
                value={dNotes}
                onChangeText={setDNotes}
                onBlur={() => saveDossier()}
                placeholder={t("patients.notesPlaceholder")}
                placeholderTextColor={colors.textTertiary}
                multiline
              />
            </View>
          </View>
        </View>

        {/* ── Recent appointments ───────────────────────────────────── */}
        {recentAppts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("patients.recentAppts")}</Text>
            <View style={styles.recentCard}>
              {recentAppts.map((a, i) => (
                <View
                  key={a.id}
                  style={[styles.recentApptRow, i < recentAppts.length - 1 && styles.recentApptRowBorder]}
                >
                  <Text style={styles.recentApptDate}>{formatDateShort(a.date)}</Text>
                  <Text style={styles.recentApptTime}>{a.startTime} – {a.endTime}</Text>
                  <Text style={styles.recentApptType}>{t(`agenda.types.${a.type}`)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Recent documents ─────────────────────────────────────── */}
        {(patientOrdonnances.length > 0 || patientCertificats.length > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Icon name="clipboard" size={13} color={colors.brand} />
              <Text style={styles.sectionTitle}>{t("patients.recentDocs")}</Text>
            </View>
            <View style={styles.recentCard}>
              {patientOrdonnances.map((ord, i) => (
                <View
                  key={ord.id}
                  style={[styles.docRow, (i < patientOrdonnances.length - 1 || patientCertificats.length > 0) && styles.docRowBorder]}
                >
                  <View style={[styles.docIcon, { backgroundColor: colors.brandSoft }]}>
                    <Icon name="pill" size={13} color={colors.brand} />
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={styles.docTitle}>{t("patients.ordonnanceDated")} {formatDateShort(ord.date)}</Text>
                    <Text style={styles.docSub}>{ord.lines.filter(l => l.medication.trim()).length} médicament(s)</Text>
                  </View>
                  <Pressable
                    style={[styles.shareDocBtn, sharingDocId === ord.id && { opacity: 0.5 }]}
                    onPress={() => shareOrdonnance(ord)}
                    disabled={sharingDocId !== null}
                  >
                    <Icon name="share" size={13} color={colors.brand} />
                    <Text style={styles.shareDocText}>{sharingDocId === ord.id ? "…" : t("patients.shareDoc")}</Text>
                  </Pressable>
                </View>
              ))}
              {patientCertificats.map((cert, i) => (
                <View
                  key={cert.id}
                  style={[styles.docRow, i < patientCertificats.length - 1 && styles.docRowBorder]}
                >
                  <View style={[styles.docIcon, { backgroundColor: colors.goldSoft ?? "#fffbeb" }]}>
                    <Icon name="award" size={13} color={colors.gold} />
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={styles.docTitle}>{t("patients.certificatDated")} {formatDateShort(cert.date)}</Text>
                    <Text style={styles.docSub}>{t(`certificat.${cert.type}`)}</Text>
                  </View>
                  <Pressable
                    style={[styles.shareDocBtn, sharingDocId === cert.id && { opacity: 0.5 }]}
                    onPress={() => shareCertificat(cert)}
                    disabled={sharingDocId !== null}
                  >
                    <Icon name="share" size={13} color={colors.gold} />
                    <Text style={[styles.shareDocText, { color: colors.gold }]}>{sharingDocId === cert.id ? "…" : t("patients.shareDoc")}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Delete ───────────────────────────────────────────────── */}
        <Pressable style={styles.deleteBtn} onPress={handleDelete}>
          <Icon name="delete" size={16} color={colors.danger} />
          <Text style={styles.deleteBtnText}>{t("patients.deletePatient")}</Text>
        </Pressable>
      </ScrollView>

      {/* Modals */}
      <PatientModal
        visible={editModalVisible}
        initial={patient}
        onSave={(updated) => updatePatient(updated)}
        onClose={() => setEditModalVisible(false)}
        t={t}
      />
      <OrdonnanceModal
        visible={ordonnanceVisible}
        patientName={`${patient.firstName} ${patient.lastName}`}
        patientId={patient.id}
        doctorProfile={doctorProfile}
        onSave={addOrdonnance}
        onClose={() => setOrdonnanceVisible(false)}
        t={t}
      />
      <CertificatModal
        visible={certificatVisible}
        patientName={`${patient.firstName} ${patient.lastName}`}
        patientGender={patient.gender}
        doctorProfile={doctorProfile}
        onSave={addCertificat}
        onClose={() => setCertificatVisible(false)}
        t={t}
      />
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border, ...shadows.card,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radii.md,
    alignItems: "center", justifyContent: "center", backgroundColor: colors.brandSoft,
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.3 },
  editBtn: {
    width: 40, height: 40, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center", backgroundColor: colors.bg,
  },

  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },

  heroSection: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10, shadowRadius: 8, elevation: 4,
  },
  avatarText: { fontSize: 30, fontWeight: "800" },
  patientName: { fontSize: 22, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.5 },
  patientMeta: { ...typography.body, color: colors.textSecondary },

  statsRow: {
    flexDirection: "row", backgroundColor: colors.surface,
    borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, gap: spacing.lg, ...shadows.card,
  },
  statBox: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
  statLabel: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },

  callBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, paddingVertical: 13, borderRadius: radii.lg,
    borderWidth: 1.5, borderColor: colors.success + "55",
    backgroundColor: colors.successSoft,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18, shadowRadius: 6, elevation: 3,
  },
  callBtnText: { fontSize: 14, fontWeight: "700", color: colors.success },

  actionRow: { flexDirection: "row", gap: spacing.md },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, paddingVertical: 13,
    borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.brand + "44",
    backgroundColor: colors.brandSoft,
  },
  actionBtnText: { fontSize: 13, fontWeight: "700", color: colors.brand },

  section: { gap: spacing.sm },
  sectionTitle: {
    fontSize: 11, fontWeight: "700", color: colors.brand,
    textTransform: "uppercase", letterSpacing: 0.4,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },

  // ── Dossier card ─────────────────────────────────────────────────────────
  medCard: {
    backgroundColor: colors.surface, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border, overflow: "hidden", ...shadows.card,
  },
  medFieldBlock: { padding: spacing.md, gap: spacing.sm },
  medFieldBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  medFieldRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  medFieldLabel: {
    fontSize: 10, fontWeight: "700", color: colors.brand,
    textTransform: "uppercase", letterSpacing: 0.4,
  },
  medInput: {
    fontSize: 14, color: colors.textPrimary, lineHeight: 20,
    minHeight: 36, padding: 0,
  },

  // Blood type chips
  bloodTypeBadge: {
    paddingHorizontal: 10, paddingVertical: 3,
    backgroundColor: colors.dangerSoft, borderRadius: radii.sm,
    borderWidth: 1, borderColor: colors.danger + "44",
  },
  bloodTypeBadgeText: { fontSize: 13, fontWeight: "800", color: colors.danger },
  bloodTypeChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  btChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.bg,
  },
  btChipActive: { backgroundColor: colors.danger, borderColor: colors.danger },
  btChipText: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  btChipTextActive: { color: colors.textOnDark },

  recentCard: {
    backgroundColor: colors.surface, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border, overflow: "hidden", ...shadows.card,
  },
  recentApptRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm,
  },
  recentApptRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  recentApptDate: { fontSize: 13, color: colors.textSecondary, fontWeight: "600", width: 64 },
  recentApptTime: { fontSize: 12, color: colors.textTertiary, flex: 1 },
  recentApptType: { fontSize: 12, color: colors.brand, fontWeight: "600" },

  // ── Finances card ─────────────────────────────────────────────────────────
  financeCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.success + "44",
    overflow: "hidden",
    ...shadows.card,
  },
  financeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.successSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.success + "33",
  },
  financeTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.success,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  financeRow: {
    flexDirection: "row",
    padding: spacing.md,
  },
  financeBox: {
    flex: 1,
    alignItems: "center",
  },
  financeDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  financeValue: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  financeLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 2,
    fontWeight: "600",
    textAlign: "center",
  },

  deleteBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, paddingVertical: 13, borderRadius: radii.lg,
    borderWidth: 1.5, borderColor: colors.danger + "44",
    backgroundColor: colors.dangerSoft, marginTop: spacing.md,
  },
  deleteBtnText: { fontSize: 14, fontWeight: "700", color: colors.danger },

  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  notFoundText: { ...typography.h3, color: colors.textSecondary },
  backBtnLarge: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    backgroundColor: colors.brand, borderRadius: radii.lg,
  },
  backBtnLargeText: { color: colors.textOnDark, fontWeight: "700", fontSize: 15 },

  // ── Documents ─────────────────────────────────────────────────────────────
  docRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  docRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  docIcon: {
    width: 32, height: 32, borderRadius: radii.sm,
    alignItems: "center", justifyContent: "center",
  },
  docInfo: { flex: 1 },
  docTitle: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  docSub: { fontSize: 11, color: colors.textTertiary, marginTop: 1 },
  shareDocBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radii.pill, borderWidth: 1, borderColor: colors.brand + "44",
    backgroundColor: colors.brandSoft,
  },
  shareDocText: { fontSize: 11, fontWeight: "600", color: colors.brand },
});
