import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "./SafeScreen";
import {
  Appointment,
  CertificatMedical,
  Ordonnance,
  Patient,
  VitalSigns,
} from "../lib/cabinetTypes";
import { Icon } from "../lib/icons";
import { radii, shadows, spacing, typography, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { formatDateShort } from "../lib/format";
import { VitalsTrendChart } from "./VitalsTrendChart";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "all" | "appts" | "ordonnances" | "certificats" | "vitaux";

interface Props {
  visible: boolean;
  patient: Patient;
  appointments: Appointment[];
  ordonnances: Ordonnance[];
  certificats: CertificatMedical[];
  onClose: () => void;
  initialTab?: Tab;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string) => any;
}

// ─── Vital sign display helper ────────────────────────────────────────────────

function VitalsSummary({ vs, colors }: { vs: VitalSigns; colors: ColorPalette }) {
  const items: { label: string; value: string; danger?: boolean }[] = [];

  if (vs.bpSys != null && vs.bpDia != null) {
    const abnormal = vs.bpSys > 140 || vs.bpSys < 90 || vs.bpDia > 90 || vs.bpDia < 60;
    items.push({ label: "TA", value: `${vs.bpSys}/${vs.bpDia}`, danger: abnormal });
  }
  if (vs.hr != null) items.push({ label: "FC", value: `${vs.hr}bpm`, danger: vs.hr > 100 || vs.hr < 50 });
  if (vs.temp != null) items.push({ label: "T°", value: `${vs.temp}°C`, danger: vs.temp > 38.5 || vs.temp < 36 });
  if (vs.spo2 != null) items.push({ label: "SpO2", value: `${vs.spo2}%`, danger: vs.spo2 < 95 });
  if (vs.weight != null) items.push({ label: "Poids", value: `${vs.weight}kg` });

  if (items.length === 0) return null;
const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.vitalsSummaryRow}>
      {items.map((item) => (
        <View
          key={item.label}
          style={[styles.vitalsPill, item.danger && styles.vitalsPillDanger]}
        >
          <Text style={styles.vitalsPillLabel}>{item.label}</Text>
          <Text style={[styles.vitalsPillValue, item.danger && { color: colors.danger }]}>
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Appointment card ─────────────────────────────────────────────────────────

function ApptCard({ appt, colors, t }: { appt: Appointment; colors: ColorPalette; t: (k: string) => string }) {
  const [expanded, setExpanded] = useState(false);
const styles = useMemo(() => makeStyles(colors), [colors]);

  const hasNotes = !!(
    appt.consultationNote?.motif ||
    appt.consultationNote?.diagnosis ||
    appt.consultationNote?.examination ||
    appt.consultationNote?.treatment
  );
  const hasVitals = !!(appt.vitalSigns && Object.values(appt.vitalSigns).some((v) => v != null));
  const isExpandable = hasNotes || hasVitals;

  return (
    <Pressable
      style={styles.historyCard}
      onPress={() => isExpandable && setExpanded((e) => !e)}
      disabled={!isExpandable}
    >
      {/* Card header */}
      <View style={styles.historyCardHeader}>
        <View style={styles.historyDateBadge}>
          <Text style={styles.historyDateDay}>
            {new Date(appt.date + "T12:00:00").getDate()}
          </Text>
          <Text style={styles.historyDateMonth}>
            {new Date(appt.date + "T12:00:00").toLocaleDateString("fr-FR", { month: "short" })}
          </Text>
        </View>
        <View style={styles.historyCardBody}>
          <Text style={styles.historyCardTitle}>
            {t(`agenda.types.${appt.type}`)} · {appt.startTime}
          </Text>
          <View style={styles.historyCardMeta}>
            <Text style={[styles.historyStatusDot, {
              color: appt.status === "completed" ? colors.success
                : appt.status === "cancelled" ? colors.danger
                : colors.gold,
            }]}>●</Text>
            <Text style={styles.historyCardMetaText}>
              {t(`agenda.statuses.${appt.status}`)}
            </Text>
            {appt.billedAt && (
              <>
                <Text style={styles.historyCardMetaSep}>·</Text>
                <Icon name="fileCheck" size={10} color={colors.gold} />
                <Text style={[styles.historyCardMetaText, { color: colors.gold }]}>
                  {t("agenda.billed")}
                </Text>
              </>
            )}
          </View>
        </View>
        {isExpandable && (
          <Icon
            name={expanded ? "chevronUp" : "chevronDown"}
            size={14}
            color={colors.textTertiary}
          />
        )}
      </View>

      {/* Vitals summary (always visible if present) */}
      {hasVitals && appt.vitalSigns && (
        <VitalsSummary vs={appt.vitalSigns} colors={colors} />
      )}

      {/* Expandable clinical notes */}
      {expanded && hasNotes && (
        <View style={styles.historyNotes}>
          {appt.consultationNote?.motif ? (
            <View style={styles.historyNoteField}>
              <Text style={styles.historyNoteLabel}>{t("agenda.motif")}</Text>
              <Text style={styles.historyNoteText}>{appt.consultationNote.motif}</Text>
            </View>
          ) : null}
          {appt.consultationNote?.diagnosis ? (
            <View style={styles.historyNoteField}>
              <Text style={styles.historyNoteLabel}>{t("agenda.diagnosis")}</Text>
              <Text style={styles.historyNoteText}>{appt.consultationNote.diagnosis}</Text>
            </View>
          ) : null}
          {appt.consultationNote?.examination ? (
            <View style={styles.historyNoteField}>
              <Text style={styles.historyNoteLabel}>{t("agenda.examination")}</Text>
              <Text style={styles.historyNoteText}>{appt.consultationNote.examination}</Text>
            </View>
          ) : null}
          {appt.consultationNote?.treatment ? (
            <View style={styles.historyNoteField}>
              <Text style={styles.historyNoteLabel}>{t("agenda.treatment")}</Text>
              <Text style={styles.historyNoteText}>{appt.consultationNote.treatment}</Text>
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

// ─── Ordonnance card ──────────────────────────────────────────────────────────

function OrdonnanceCard({ ordo, colors, t }: { ordo: Ordonnance; colors: ColorPalette; t: (k: string) => string }) {
const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.historyCard}>
      <View style={styles.historyCardHeader}>
        <View style={[styles.historyDateBadge, { backgroundColor: colors.brand + "22" }]}>
          <Icon name="pill" size={18} color={colors.brand} />
        </View>
        <View style={styles.historyCardBody}>
          <Text style={styles.historyCardTitle}>
            {t("patients.ordonnanceDated")} {formatDateShort(ordo.date)}
          </Text>
          <Text style={styles.historyCardMetaText} numberOfLines={1}>
            {ordo.lines.map((l) => l.medication).filter(Boolean).join(", ")}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Certificat card ──────────────────────────────────────────────────────────

function CertificatCard({ cert, colors, t }: { cert: CertificatMedical; colors: ColorPalette; t: (k: string) => string }) {
const styles = useMemo(() => makeStyles(colors), [colors]);
  const typeKey = `certificat.${cert.type}` as const;
  return (
    <View style={styles.historyCard}>
      <View style={styles.historyCardHeader}>
        <View style={[styles.historyDateBadge, { backgroundColor: colors.success + "22" }]}>
          <Icon name="award" size={18} color={colors.success} />
        </View>
        <View style={styles.historyCardBody}>
          <Text style={styles.historyCardTitle}>
            {t("patients.certificatDated")} {formatDateShort(cert.date)}
          </Text>
          <Text style={styles.historyCardMetaText}>
            {t(typeKey) || cert.type}
            {cert.durationDays ? ` · ${cert.durationDays}j` : ""}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PatientHistoryModal({
  visible, patient, appointments, ordonnances, certificats, onClose, initialTab, t,
}: Props) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const topInset = useTopInset();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab ?? "all");

  // Re-apply initialTab whenever the modal opens
  useEffect(() => {
    if (visible) setActiveTab(initialTab ?? "all");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Filter to this patient's records, sorted newest first
  const patientAppts = useMemo(
    () =>
      appointments
        .filter((a) => a.patientId === patient.id)
        .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime)),
    [appointments, patient.id],
  );

  const patientOrdos = useMemo(
    () =>
      ordonnances
        .filter((o) => o.patientId === patient.id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [ordonnances, patient.id],
  );

  const patientCerts = useMemo(
    () =>
      certificats
        .filter((c) => c.patientId === patient.id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [certificats, patient.id],
  );

  const isEmpty = patientAppts.length === 0 && patientOrdos.length === 0 && patientCerts.length === 0;

  // Determine if any appointment has at least one vital recorded
  const hasVitals = useMemo(
    () =>
      patientAppts.some(
        (a) => a.vitalSigns && Object.values(a.vitalSigns).some((v) => v != null),
      ),
    [patientAppts],
  );

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: "all", label: "Tout", count: patientAppts.length + patientOrdos.length + patientCerts.length },
    { id: "appts", label: t("agenda.historyAppts"), count: patientAppts.length },
    { id: "ordonnances", label: t("agenda.historyOrdonnances"), count: patientOrdos.length },
    { id: "certificats", label: t("agenda.historyCertificats"), count: patientCerts.length },
    ...(hasVitals ? [{ id: "vitaux" as Tab, label: "📊 Tendances", count: 0 }] : []),
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: topInset }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
            <Icon name="close" size={18} color={colors.textSecondary} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {patient.firstName} {patient.lastName}
            </Text>
            <Text style={styles.headerSub}>{t("agenda.patientHistory")}</Text>
          </View>
        </View>

        {/* Patient summary bar */}
        <View style={styles.patientBar}>
          {patient.dateOfBirth ? (
            <View style={styles.patientBarItem}>
              <Icon name="calendar" size={12} color={colors.textTertiary} />
              <Text style={styles.patientBarText}>
                {(() => {
                  const dob = new Date(patient.dateOfBirth);
                  const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
                  return `${age} ans`;
                })()}
              </Text>
            </View>
          ) : null}
          {patient.bloodType ? (
            <View style={styles.patientBarItem}>
              <Text style={styles.patientBarBadge}>{patient.bloodType}</Text>
            </View>
          ) : null}
          {patient.allergies ? (
            <View style={[styles.patientBarItem, styles.patientBarAllergyItem]}>
              <Icon name="alertCircle" size={12} color={colors.danger} />
              <Text style={[styles.patientBarText, { color: colors.danger }]} numberOfLines={1}>
                {patient.allergies}
              </Text>
            </View>
          ) : null}
          {patient.currentMedications ? (
            <View style={styles.patientBarItem}>
              <Icon name="pill" size={12} color={colors.brand} />
              <Text style={styles.patientBarText} numberOfLines={1}>
                {patient.currentMedications}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {TABS.filter((tab) => tab.id === "all" || tab.id === "vitaux" || tab.count > 0).map((tab) => (
            <Pressable
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View style={[styles.tabCount, activeTab === tab.id && styles.tabCountActive]}>
                  <Text style={[styles.tabCountText, activeTab === tab.id && styles.tabCountTextActive]}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>

        {/* Content */}
        {activeTab === "vitaux" ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, spacing.xl) + spacing.lg }]}
            showsVerticalScrollIndicator={false}
          >
            <VitalsTrendChart appointments={patientAppts} />
          </ScrollView>
        ) : isEmpty ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>{t("agenda.historyEmpty")}</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, spacing.xl) + spacing.lg }]}
            showsVerticalScrollIndicator={false}
          >
            {(activeTab === "all" || activeTab === "appts") && patientAppts.length > 0 && (
              <View style={styles.group}>
                {activeTab === "all" && (
                  <Text style={styles.groupTitle}>{t("agenda.historyAppts")}</Text>
                )}
                {patientAppts.map((appt) => (
                  <ApptCard key={appt.id} appt={appt} colors={colors} t={t} />
                ))}
              </View>
            )}

            {(activeTab === "all" || activeTab === "ordonnances") && patientOrdos.length > 0 && (
              <View style={styles.group}>
                {activeTab === "all" && (
                  <Text style={styles.groupTitle}>{t("agenda.historyOrdonnances")}</Text>
                )}
                {patientOrdos.map((o) => (
                  <OrdonnanceCard key={o.id} ordo={o} colors={colors} t={t} />
                ))}
              </View>
            )}

            {(activeTab === "all" || activeTab === "certificats") && patientCerts.length > 0 && (
              <View style={styles.group}>
                {activeTab === "all" && (
                  <Text style={styles.groupTitle}>{t("agenda.historyCertificats")}</Text>
                )}
                {patientCerts.map((c) => (
                  <CertificatCard key={c.id} cert={c} colors={colors} t={t} />
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.card,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: radii.md,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.border + "66",
  },
  headerText: { flex: 1 },
  headerTitle: { ...typography.h3, color: colors.textPrimary, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },

  patientBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.brandSoft + "55",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  patientBarItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  patientBarAllergyItem: { borderColor: colors.danger + "44", backgroundColor: colors.danger + "11" },
  patientBarText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary, maxWidth: 140 },
  patientBarBadge: {
    fontSize: 11, fontWeight: "800", color: colors.danger,
  },

  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  tabText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  tabTextActive: { color: colors.textOnDark },
  tabCount: {
    backgroundColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: "center",
  },
  tabCountActive: { backgroundColor: colors.textOnDark + "33" },
  tabCountText: { fontSize: 10, fontWeight: "700", color: colors.textSecondary },
  tabCountTextActive: { color: colors.textOnDark },

  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, gap: spacing.lg },

  group: { gap: spacing.sm },
  groupTitle: {
    fontSize: 11, fontWeight: "700", color: colors.brand,
    textTransform: "uppercase", letterSpacing: 0.5,
  },

  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  historyCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  historyDateBadge: {
    width: 44, height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  historyDateDay: {
    fontSize: 17, fontWeight: "800", color: colors.brand, lineHeight: 19,
  },
  historyDateMonth: {
    fontSize: 9, fontWeight: "700", color: colors.brand,
    textTransform: "uppercase", letterSpacing: 0.3,
  },
  historyCardBody: { flex: 1, gap: 2 },
  historyCardTitle: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  historyCardMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  historyStatusDot: { fontSize: 8, lineHeight: 14 },
  historyCardMetaText: { fontSize: 12, color: colors.textSecondary },
  historyCardMetaSep: { fontSize: 12, color: colors.textTertiary },

  historyNotes: {
    backgroundColor: colors.successSoft + "33",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.success + "22",
    padding: spacing.sm,
    gap: spacing.xs,
  },
  historyNoteField: { gap: 2 },
  historyNoteLabel: {
    fontSize: 9, fontWeight: "700", color: colors.success,
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  historyNoteText: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },

  // Vitals pills inside history cards
  vitalsSummaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingTop: 2,
  },
  vitalsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brandSoft,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.brand + "33",
  },
  vitalsPillDanger: {
    backgroundColor: colors.danger + "11",
    borderColor: colors.danger + "44",
  },
  vitalsPillLabel: { fontSize: 9, fontWeight: "700", color: colors.textTertiary, textTransform: "uppercase" },
  vitalsPillValue: { fontSize: 11, fontWeight: "700", color: colors.brand },

  emptyState: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md,
  },
  emptyIcon: { fontSize: 42 },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: "center" },
});
