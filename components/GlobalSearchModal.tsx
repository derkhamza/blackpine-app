/**
 * GlobalSearchModal — cross-entity patient search.
 *
 * Searches across: patient names/phones, consultation note content
 * (motif, diagnosis, examination, treatment), ordonnance medications,
 * and certificat types.
 *
 * Results are grouped by entity type, limited to 6 per section.
 * Tapping any result calls `onOpenPatient` which the parent uses to
 * open PatientHistoryModal at the appropriate tab.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "./SafeScreen";
import {
  Appointment,
  CertificatMedical,
  Ordonnance,
  Patient,
} from "../lib/cabinetTypes";
import { Icon, IconName } from "../lib/icons";
import { radii, shadows, spacing, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { initials, avatarColor } from "../lib/patientHelpers";
import { formatDateShort } from "../lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

export type HistoryTab = "all" | "appts" | "ordonnances" | "certificats";

export interface GlobalSearchModalProps {
  visible: boolean;
  onClose: () => void;
  patients: Patient[];
  appointments: Appointment[];
  ordonnances: Ordonnance[];
  certificats: CertificatMedical[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (k: string) => any;
  onOpenPatient: (patient: Patient, tab?: HistoryTab) => void;
  /**
   * When provided, tapping a consultation-note hit calls this with the
   * appointment id instead of resolving the patient and calling onOpenPatient.
   * Use this from AgendaScreen to navigate directly to AppointmentDetail.
   */
  onOpenAppointment?: (appointmentId: string) => void;
}

// ─── Highlight matching text ──────────────────────────────────────────────────

function HighlightText({
  text,
  query,
  style,
  highlightStyle,
}: {
  text: string;
  query: string;
  style: StyleProp<TextStyle>;
  highlightStyle: StyleProp<TextStyle>;
}) {
  if (!text) return null;
  if (!query) return <Text style={style}>{text}</Text>;
  const lower = text.toLowerCase();
  const qLower = query.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx < 0) return <Text style={style} numberOfLines={2}>{text}</Text>;
  return (
    <Text style={style} numberOfLines={2}>
      {text.slice(0, idx)}
      <Text style={highlightStyle}>{text.slice(idx, idx + query.length)}</Text>
      {text.slice(idx + query.length)}
    </Text>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  count,
  color,
}: {
  icon: IconName;
  title: string;
  count: number;
  color: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: spacing.lg,
        paddingVertical: 9,
        backgroundColor: color + "0D",
        borderBottomWidth: 1,
        borderBottomColor: color + "22",
        marginBottom: 4,
      }}
    >
      <Icon name={icon} size={11} color={color} />
      <Text
        style={{
          fontSize: 10,
          fontWeight: "700",
          color,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          flex: 1,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          backgroundColor: color + "22",
          borderRadius: 8,
          paddingHorizontal: 7,
          paddingVertical: 2,
        }}
      >
        <Text style={{ fontSize: 10, fontWeight: "800", color }}>{count}</Text>
      </View>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Find a Patient object from any record (by id then by exact name match). */
function resolvePatient(
  patients: Patient[],
  patientId?: string,
  patientName?: string,
): Patient | undefined {
  if (patientId) {
    const found = patients.find((p) => p.id === patientId);
    if (found) return found;
  }
  if (patientName) {
    const q = patientName.toLowerCase().trim();
    return patients.find(
      (p) => `${p.firstName} ${p.lastName}`.toLowerCase() === q,
    );
  }
  return undefined;
}

/**
 * Return the first consultation note field that contains `q`, truncated to
 * a 100-char snippet around the match.
 */
function noteSnippet(appt: Appointment, q: string): string {
  const note = appt.consultationNote;
  if (!note) return "";
  for (const field of [
    note.diagnosis,
    note.motif,
    note.examination,
    note.treatment,
  ]) {
    if (!field) continue;
    const idx = field.toLowerCase().indexOf(q);
    if (idx >= 0) {
      const start = Math.max(0, idx - 20);
      const raw = (start > 0 ? "…" : "") + field.slice(start, idx + 80);
      return raw;
    }
  }
  return "";
}

/** Comma-joined medications that matched `q`; falls back to all meds. */
function matchedMeds(ordo: Ordonnance, q: string): string {
  const matched = ordo.lines
    .filter((l) => l.medication.toLowerCase().includes(q))
    .map((l) => l.medication)
    .filter(Boolean);
  if (matched.length > 0) return matched.join(", ");
  return ordo.lines
    .map((l) => l.medication)
    .filter(Boolean)
    .join(", ");
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GlobalSearchModal({
  visible,
  onClose,
  patients,
  appointments,
  ordonnances,
  certificats,
  t,
  onOpenPatient,
  onOpenAppointment,
}: GlobalSearchModalProps) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const topInset = useTopInset();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState("");

  // Clear query when modal closes so it starts fresh next time
  useEffect(() => {
    if (!visible) setQuery("");
  }, [visible]);

  const q = query.toLowerCase().trim();

  // ── Search results ────────────────────────────────────────────────────────

  const results = useMemo(() => {
    if (!q) return null;

    const patientHits = patients
      .filter(
        (p) =>
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
          (p.phone && p.phone.includes(q)) ||
          (p.cin && p.cin.toLowerCase().includes(q)) ||
          (p.cnopsNumber && p.cnopsNumber.toLowerCase().includes(q)),
      )
      .slice(0, 6);

    const consultationHits = appointments
      .filter(
        (a) =>
          a.consultationNote &&
          (a.consultationNote.motif?.toLowerCase().includes(q) ||
            a.consultationNote.diagnosis?.toLowerCase().includes(q) ||
            a.consultationNote.examination?.toLowerCase().includes(q) ||
            a.consultationNote.treatment?.toLowerCase().includes(q)),
      )
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);

    const ordoHits = ordonnances
      .filter(
        (o) =>
          o.patientName.toLowerCase().includes(q) ||
          o.lines.some((l) => l.medication.toLowerCase().includes(q)),
      )
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);

    const certHits = certificats
      .filter((c) => c.patientName.toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);

    return { patientHits, consultationHits, ordoHits, certHits };
  }, [q, patients, appointments, ordonnances, certificats]);

  const totalHits = results
    ? results.patientHits.length +
      results.consultationHits.length +
      results.ordoHits.length +
      results.certHits.length
    : 0;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openFromAppointment = (appt: Appointment) => {
    if (onOpenAppointment) {
      onOpenAppointment(appt.id);
      onClose();
      return;
    }
    const p = resolvePatient(patients, appt.patientId, appt.patientName);
    if (p) onOpenPatient(p, "appts");
    else onClose();
  };

  const openFromOrdonnance = (ordo: Ordonnance) => {
    const p = resolvePatient(patients, ordo.patientId, ordo.patientName);
    if (p) onOpenPatient(p, "ordonnances");
    else onClose();
  };

  const openFromCertificat = (cert: CertificatMedical) => {
    const p = resolvePatient(patients, cert.patientId, cert.patientName);
    if (p) onOpenPatient(p, "certificats");
    else onClose();
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: topInset }]}>

        {/* ── Search bar row ───────────────────────────────────────────── */}
        <View style={styles.searchRow}>
          <Pressable style={styles.backBtn} onPress={onClose} hitSlop={10}>
            <Icon name="back" size={20} color={colors.brand} />
          </Pressable>
          <View style={styles.searchBar}>
            <Icon name="search" size={15} color={colors.textTertiary} />
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Patient, médicament, diagnostic, motif…"
              placeholderTextColor={colors.textTertiary}
              autoFocus
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery("")} hitSlop={10}>
                <Icon name="close" size={14} color={colors.textTertiary} />
              </Pressable>
            )}
          </View>
        </View>

        {/* ── Empty query — stats overview ─────────────────────────────── */}
        {!q ? (
          <View style={styles.emptyQuery}>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Icon name="users" size={22} color={colors.brand} />
                <Text style={styles.statNum}>{patients.length}</Text>
                <Text style={styles.statLabel}>Patients</Text>
              </View>
              <View style={styles.statCard}>
                <Icon name="calendar" size={22} color={colors.success} />
                <Text style={[styles.statNum, { color: colors.success }]}>
                  {appointments.length}
                </Text>
                <Text style={styles.statLabel}>Consultations</Text>
              </View>
              <View style={styles.statCard}>
                <Icon name="pill" size={22} color={colors.brand} />
                <Text style={styles.statNum}>{ordonnances.length}</Text>
                <Text style={styles.statLabel}>Ordonnances</Text>
              </View>
              <View style={styles.statCard}>
                <Icon name="award" size={22} color={colors.gold} />
                <Text style={[styles.statNum, { color: colors.gold }]}>
                  {certificats.length}
                </Text>
                <Text style={styles.statLabel}>Certificats</Text>
              </View>
            </View>
            <Text style={styles.hintText}>
              Tapez un nom de patient, un médicament, un diagnostic, un
              traitement ou un motif de consultation.
            </Text>
          </View>

        /* ── No results ──────────────────────────────────────────────── */
        ) : totalHits === 0 ? (
          <View style={styles.noResults}>
            <Text style={styles.noResultsEmoji}>🔍</Text>
            <Text style={styles.noResultsTitle}>Aucun résultat</Text>
            <Text style={styles.noResultsSub}>
              Aucune correspondance pour «{query}»
            </Text>
          </View>

        /* ── Results list ─────────────────────────────────────────────── */
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.resultsContent,
              {
                paddingBottom:
                  Math.max(insets.bottom, spacing.xl) + spacing.lg,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ─ Patients ─────────────────────────────────────────────── */}
            {results!.patientHits.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  icon="users"
                  title="Patients"
                  count={results!.patientHits.length}
                  color={colors.brand}
                />
                {results!.patientHits.map((patient) => {
                  const col = avatarColor(patient.firstName + patient.lastName);
                  return (
                    <Pressable
                      key={patient.id}
                      style={({ pressed }) => [
                        styles.resultRow,
                        pressed && styles.resultRowPressed,
                      ]}
                      onPress={() => onOpenPatient(patient)}
                    >
                      <View style={[styles.avatar, { backgroundColor: col + "22" }]}>
                        <Text style={[styles.avatarText, { color: col }]}>
                          {initials(patient)}
                        </Text>
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <HighlightText
                          text={`${patient.firstName} ${patient.lastName}`}
                          query={query}
                          style={styles.resultName}
                          highlightStyle={styles.highlight}
                        />
                        {patient.phone ? (
                          <HighlightText
                            text={patient.phone}
                            query={query}
                            style={styles.resultSub}
                            highlightStyle={[styles.highlight, { fontSize: 12 }]}
                          />
                        ) : null}
                      </View>
                      <View style={{ transform: [{ scaleX: -1 }] }}>
                        <Icon name="back" size={14} color={colors.textTertiary} />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* ─ Consultation notes ────────────────────────────────────── */}
            {results!.consultationHits.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  icon="clipboard"
                  title="Notes de consultation"
                  count={results!.consultationHits.length}
                  color={colors.success}
                />
                {results!.consultationHits.map((appt) => {
                  const snippet = noteSnippet(appt, q);
                  return (
                    <Pressable
                      key={appt.id}
                      style={({ pressed }) => [
                        styles.resultRow,
                        pressed && styles.resultRowPressed,
                      ]}
                      onPress={() => openFromAppointment(appt)}
                    >
                      <View style={[styles.iconBox, { backgroundColor: colors.successSoft }]}>
                        <Icon name="clipboard" size={16} color={colors.success} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.resultName} numberOfLines={1}>
                          {appt.patientName}
                        </Text>
                        <HighlightText
                          text={snippet}
                          query={query}
                          style={styles.resultSub}
                          highlightStyle={[styles.highlight, { fontSize: 12 }]}
                        />
                        <Text style={styles.resultDate}>
                          {formatDateShort(appt.date)}
                          {" · "}
                          {t(`agenda.types.${appt.type}`)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* ─ Ordonnances ───────────────────────────────────────────── */}
            {results!.ordoHits.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  icon="pill"
                  title="Ordonnances"
                  count={results!.ordoHits.length}
                  color={colors.brand}
                />
                {results!.ordoHits.map((ordo) => {
                  const meds = matchedMeds(ordo, q);
                  return (
                    <Pressable
                      key={ordo.id}
                      style={({ pressed }) => [
                        styles.resultRow,
                        pressed && styles.resultRowPressed,
                      ]}
                      onPress={() => openFromOrdonnance(ordo)}
                    >
                      <View style={[styles.iconBox, { backgroundColor: colors.brandSoft }]}>
                        <Icon name="pill" size={16} color={colors.brand} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.resultName} numberOfLines={1}>
                          {ordo.patientName}
                        </Text>
                        <HighlightText
                          text={meds}
                          query={query}
                          style={styles.resultSub}
                          highlightStyle={[styles.highlight, { fontSize: 12 }]}
                        />
                        <Text style={styles.resultDate}>
                          {formatDateShort(ordo.date)}
                          {" · "}
                          {ordo.lines.filter((l) => l.medication.trim()).length}{" "}
                          médicament(s)
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* ─ Certificats ───────────────────────────────────────────── */}
            {results!.certHits.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  icon="award"
                  title="Certificats médicaux"
                  count={results!.certHits.length}
                  color={colors.gold}
                />
                {results!.certHits.map((cert) => (
                  <Pressable
                    key={cert.id}
                    style={({ pressed }) => [
                      styles.resultRow,
                      pressed && styles.resultRowPressed,
                    ]}
                    onPress={() => openFromCertificat(cert)}
                  >
                    <View
                      style={[
                        styles.iconBox,
                        { backgroundColor: colors.goldSoft ?? "#FBF0DD" },
                      ]}
                    >
                      <Icon name="award" size={16} color={colors.gold} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.resultName} numberOfLines={1}>
                        {cert.patientName}
                      </Text>
                      <Text style={styles.resultSub}>
                        {t(`certificat.${cert.type}`)}
                        {cert.durationDays ? ` · ${cert.durationDays}j` : ""}
                      </Text>
                      <Text style={styles.resultDate}>
                        {formatDateShort(cert.date)}
                      </Text>
                    </View>
                  </Pressable>
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

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },

    // Search bar row
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      ...shadows.card,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: radii.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.brandSoft,
    },
    searchBar: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: colors.bg,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      borderColor: colors.brand + "55",
      paddingHorizontal: spacing.md,
      paddingVertical: 11,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
      fontWeight: "500",
    },

    // Empty query state
    emptyQuery: {
      flex: 1,
      padding: spacing.xl,
      gap: spacing.xl,
      alignItems: "center",
    },
    statsGrid: {
      flexDirection: "row",
      gap: spacing.sm,
      width: "100%",
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xs,
      alignItems: "center",
      gap: 4,
      ...shadows.card,
    },
    statNum: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.brand,
    },
    statLabel: {
      fontSize: 9,
      fontWeight: "700",
      color: colors.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      textAlign: "center",
    },
    hintText: {
      fontSize: 13,
      color: colors.textTertiary,
      textAlign: "center",
      lineHeight: 20,
      maxWidth: 300,
    },

    // No results state
    noResults: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.md,
      padding: spacing.xxl,
    },
    noResultsEmoji: { fontSize: 44 },
    noResultsTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    noResultsSub: {
      fontSize: 13,
      color: colors.textTertiary,
      textAlign: "center",
    },

    // Results
    resultsContent: { gap: spacing.sm, paddingTop: spacing.xs },
    section: {},

    resultRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.surface,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.xs,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      ...shadows.card,
    },
    resultRowPressed: { opacity: 0.75 },

    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { fontSize: 14, fontWeight: "800" },
    iconBox: {
      width: 42,
      height: 42,
      borderRadius: radii.md,
      alignItems: "center",
      justifyContent: "center",
    },

    resultName: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
    resultSub: { fontSize: 12, color: colors.textSecondary, lineHeight: 16 },
    resultDate: { fontSize: 10, fontWeight: "600", color: colors.textTertiary },
    highlight: {
      backgroundColor: colors.gold + "44",
      color: colors.textPrimary,
      fontWeight: "800",
    },
  });
