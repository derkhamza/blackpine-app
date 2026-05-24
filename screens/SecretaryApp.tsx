/**
 * SecretaryApp — restricted interface for the doctor's secretary.
 *
 * Access granted:
 *   ✅ Today's agenda + upcoming appointments (can add, edit status)
 *   ✅ Patient list (name + phone only)
 *   ✅ Add new appointment
 *   ✅ Add new patient (name + phone)
 *
 * Access blocked:
 *   ❌ Financial data / transactions
 *   ❌ Medical notes / ordonnances / certificats
 *   ❌ Payroll / employees
 *   ❌ Doctor fiscal profile
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApp } from "../lib/AppContext";
import { radii, shadows, spacing, typography, colors, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { Icon } from "../lib/icons";
import { Appointment, Patient } from "../lib/cabinetTypes";
import { AppointmentModal, TYPE_COLORS, STATUS_COLORS } from "../components/AppointmentModal";
import {
  pullCabinetSnapshot,
  pushSecretaryAppointments,
  pushSecretaryPatients,
} from "../lib/inviteApi";
import { uuid, todayIso } from "../lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type SecretaryTab = "agenda" | "patients";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayISO = todayIso;

function formatDateHeader(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  });
}

// ─── Add patient modal (name + phone only) ────────────────────────────────────

function AddPatientModal({
  visible,
  onSave,
  onCancel,
}: {
  visible: boolean;
  onSave: (p: Patient) => void;
  onCancel: () => void;
}) {
  const colors = useColors();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [phone, setPhone]         = useState("");

  useEffect(() => {
    if (visible) { setFirstName(""); setLastName(""); setPhone(""); }
  }, [visible]);

  const canSave = firstName.trim().length > 0 && lastName.trim().length > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={pm.overlay}>
        <View style={pm.sheet}>
          <View style={pm.handle} />
          <View style={pm.header}>
            <Text style={pm.title}>Nouveau patient</Text>
            <Pressable onPress={onCancel} hitSlop={10}>
              <Icon name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
          <View style={pm.body}>
            <Text style={pm.label}>Prénom *</Text>
            <TextInput
              style={pm.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Prénom"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
            />
            <Text style={[pm.label, { marginTop: spacing.md }]}>Nom *</Text>
            <TextInput
              style={pm.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Nom de famille"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
            />
            <Text style={[pm.label, { marginTop: spacing.md }]}>Téléphone</Text>
            <TextInput
              style={pm.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="06XXXXXXXX"
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
            />
            <Pressable
              style={[pm.saveBtn, !canSave && { opacity: 0.4 }]}
              disabled={!canSave}
              onPress={() => {
                onSave({
                  id: uuid(),
                  firstName: firstName.trim(),
                  lastName: lastName.trim(),
                  phone: phone.trim() || undefined,
                  createdAt: new Date().toISOString(),
                });
              }}
            >
              <Text style={pm.saveBtnText}>Enregistrer</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Appointment row ───────────────────────────────────────────────────────────

function ApptRow({
  appt,
  onToggleDone,
  onEdit,
}: {
  appt: Appointment;
  onToggleDone: () => void;
  onEdit: () => void;
}) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const typeColor   = TYPE_COLORS[appt.type];
  const statusColor = STATUS_COLORS[appt.status];
  const isDone      = appt.status === "completed";

  return (
    <Pressable
      style={[styles.apptRow, isDone && { opacity: 0.55 }]}
      onPress={onEdit}
    >
      <View style={[styles.apptAccent, { backgroundColor: isDone ? colors.border : typeColor }]} />
      <View style={styles.apptBody}>
        <Text style={[styles.apptTime, isDone && { color: colors.textTertiary }]}>
          {appt.startTime} – {appt.endTime}
        </Text>
        <Text style={[styles.apptName, isDone && { color: colors.textTertiary }]} numberOfLines={1}>
          {appt.patientName}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {appt.status === "scheduled" ? "Prévu"
              : appt.status === "completed" ? "Vu"
              : appt.status === "cancelled" ? "Annulé"
              : "Absent"}
          </Text>
        </View>
      </View>
      <Pressable
        style={[styles.checkBtn, isDone && { backgroundColor: colors.success }]}
        onPress={onToggleDone}
        hitSlop={10}
      >
        <Icon name="check" size={14} color={isDone ? colors.textOnDark : colors.textTertiary} />
      </Pressable>
    </Pressable>
  );
}

// ─── Patient row ───────────────────────────────────────────────────────────────

function PatientRow({ patient }: { patient: Patient }) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const initials = `${patient.firstName[0] ?? ""}${patient.lastName[0] ?? ""}`.toUpperCase();
  return (
    <View style={styles.patRow}>
      <View style={styles.patAvatar}>
        <Text style={styles.patInitials}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.patName}>{patient.firstName} {patient.lastName}</Text>
        {patient.phone ? (
          <Text style={styles.patPhone}>{patient.phone}</Text>
        ) : (
          <Text style={styles.patPhoneMuted}>Aucun téléphone</Text>
        )}
      </View>
    </View>
  );
}

// ─── Main SecretaryApp ────────────────────────────────────────────────────────

export function SecretaryApp() {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const { secretarySession, onSecretaryLogout } = useApp();

  const [tab, setTab]               = useState<SecretaryTab>("agenda");
  const [appointments, setAppts]    = useState<Appointment[]>([]);
  const [patients, setPatients]     = useState<Patient[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [apptModal, setApptModal]   = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [patModal, setPatModal]     = useState(false);
  const [searchPat, setSearchPat]   = useState("");

  const token      = secretarySession?.secretaryToken ?? "";
  const ownerName  = secretarySession?.ownerName ?? "Cabinet médical";
  const todayStr   = todayISO();

  // ── Load data from server ──────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      const snap = await pullCabinetSnapshot(token);
      setAppts(snap.appointments ?? []);
      setPatients(snap.patients ?? []);
    } catch (err: any) {
      if (err.message?.includes("401") || err.message?.includes("revoked")) {
        Alert.alert(
          "Accès révoqué",
          "Le médecin a révoqué votre accès. Contactez le cabinet.",
          [{ text: "OK", onPress: onSecretaryLogout }],
        );
      }
      // else: offline — keep local data
    } finally {
      setRefreshing(false);
    }
  }, [token, onSecretaryLogout]);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Appointments split by date ────────────────────────────────────────────
  const todayAppts = useMemo(
    () => appointments.filter((a) => a.date === todayStr).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [appointments, todayStr],
  );

  const upcomingAppts = useMemo(
    () => appointments.filter((a) => a.date > todayStr).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)),
    [appointments, todayStr],
  );

  // ── Appointment mutations ─────────────────────────────────────────────────
  const saveAppt = useCallback(async (appt: Appointment) => {
    setAppts((prev) => {
      const idx = prev.findIndex((a) => a.id === appt.id);
      const next = idx >= 0 ? prev.map((a) => (a.id === appt.id ? appt : a)) : [...prev, appt];
      pushSecretaryAppointments(token, next).catch(() => {});
      return next;
    });
    setApptModal(false);
    setEditingAppt(null);
  }, [token]);

  const toggleDone = useCallback((appt: Appointment) => {
    const updated: Appointment = {
      ...appt,
      status: appt.status === "completed" ? "scheduled" : "completed",
    };
    saveAppt(updated);
  }, [saveAppt]);

  // ── Patient mutations ─────────────────────────────────────────────────────
  const savePatient = useCallback(async (patient: Patient) => {
    setPatients((prev) => {
      const next = [...prev, patient];
      pushSecretaryPatients(token, next).catch(() => {});
      return next;
    });
    setPatModal(false);
  }, [token]);

  // ── Filtered patients ─────────────────────────────────────────────────────
  const filteredPatients = useMemo(() => {
    const q = searchPat.toLowerCase().trim();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        (p.phone ?? "").includes(q),
    );
  }, [patients, searchPat]);

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert(
      "Déconnexion",
      "Quitter l'accès secrétaire ?",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Déconnecter", style: "destructive", onPress: onSecretaryLogout },
      ],
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>SEC</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Secrétaire</Text>
            <Text style={styles.headerSub} numberOfLines={1}>{ownerName}</Text>
          </View>
        </View>
        <Pressable onPress={handleLogout} hitSlop={8} style={styles.logoutBtn}>
          <Icon name="close" size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* ── Tab bar ── */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === "agenda" && styles.tabActive]}
          onPress={() => setTab("agenda")}
        >
          <Icon name="calendar" size={16} color={tab === "agenda" ? colors.brand : colors.textTertiary} />
          <Text style={[styles.tabText, tab === "agenda" && styles.tabTextActive]}>Agenda</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === "patients" && styles.tabActive]}
          onPress={() => setTab("patients")}
        >
          <Icon name="users" size={16} color={tab === "patients" ? colors.brand : colors.textTertiary} />
          <Text style={[styles.tabText, tab === "patients" && styles.tabTextActive]}>
            Patients
            {patients.length > 0 && (
              <Text style={styles.tabCount}> {patients.length}</Text>
            )}
          </Text>
        </Pressable>
      </View>

      {/* ══════════════ AGENDA TAB ══════════════ */}
      {tab === "agenda" && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Today section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Aujourd'hui · {formatDateHeader(todayStr)}</Text>
            <Pressable
              style={styles.addApptBtn}
              onPress={() => { setEditingAppt(null); setApptModal(true); }}
            >
              <Icon name="add" size={14} color={colors.textOnDark} />
              <Text style={styles.addApptBtnText}>Ajouter</Text>
            </Pressable>
          </View>

          {todayAppts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Icon name="calendar" size={32} color={colors.textTertiary} />
              <Text style={styles.emptyText}>Aucun rendez-vous aujourd'hui</Text>
            </View>
          ) : (
            <View style={styles.apptList}>
              {todayAppts.map((appt) => (
                <ApptRow
                  key={appt.id}
                  appt={appt}
                  onToggleDone={() => toggleDone(appt)}
                  onEdit={() => { setEditingAppt(appt); setApptModal(true); }}
                />
              ))}
            </View>
          )}

          {/* Upcoming section */}
          {upcomingAppts.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>
                À venir
              </Text>
              <View style={styles.apptList}>
                {upcomingAppts.slice(0, 20).map((appt) => (
                  <ApptRow
                    key={appt.id}
                    appt={appt}
                    onToggleDone={() => toggleDone(appt)}
                    onEdit={() => { setEditingAppt(appt); setApptModal(true); }}
                  />
                ))}
              </View>
            </>
          )}

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      )}

      {/* ══════════════ PATIENTS TAB ══════════════ */}
      {tab === "patients" && (
        <View style={{ flex: 1 }}>
          <View style={styles.searchRow}>
            <Icon name="search" size={16} color={colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              value={searchPat}
              onChangeText={setSearchPat}
              placeholder="Chercher un patient…"
              placeholderTextColor={colors.textTertiary}
            />
            <Pressable
              style={styles.addPatBtn}
              onPress={() => setPatModal(true)}
            >
              <Icon name="add" size={14} color={colors.textOnDark} />
            </Pressable>
          </View>

          <FlatList
            data={filteredPatients}
            keyExtractor={(p) => p.id}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} />}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Icon name="users" size={32} color={colors.textTertiary} />
                <Text style={styles.emptyText}>
                  {searchPat ? "Aucun résultat" : "Aucun patient enregistré"}
                </Text>
              </View>
            }
            renderItem={({ item }) => <PatientRow patient={item} />}
          />
        </View>
      )}

      {/* ── Appointment modal ── */}
      <AppointmentModal
        visible={apptModal}
        initial={editingAppt}
        selectedDate={todayStr}
        patients={patients}
        onSave={saveAppt}
        onClose={() => { setApptModal(false); setEditingAppt(null); }}
        t={(k) => {
          const m: Record<string, string> = {
            "agenda.editAppointment": "Modifier le RDV",
            "agenda.addAppointment": "Nouveau RDV",
            "agenda.patientName": "Patient",
            "agenda.patientNamePlaceholder": "Nom du patient",
            "agenda.date": "Date",
            "agenda.startTime": "Début",
            "agenda.endTime": "Fin",
            "agenda.type": "Type",
            "agenda.notes": "Notes",
            "agenda.notesPlaceholder": "Remarques…",
            "agenda.showClinical": "Notes cliniques",
            "agenda.hideClinical": "Masquer les notes",
            "agenda.types.consultation": "Consultation",
            "agenda.types.suivi": "Suivi",
            "agenda.types.procedure": "Procédure",
            "agenda.types.urgence": "Urgence",
            "agenda.types.autre": "Autre",
            "locations.name": "Cabinet / Lieu",
            "cancel": "Annuler",
            "save": "Enregistrer",
          };
          return m[k] ?? k;
        }}
      />

      {/* ── Add patient modal ── */}
      <AddPatientModal
        visible={patModal}
        onSave={savePatient}
        onCancel={() => setPatModal(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const pm = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: colors.surfaceDark + "40" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginTop: 10, marginBottom: spacing.md },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  title: { ...typography.h3, color: colors.textPrimary },
  body: {},
  label: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.3 },
  input: { backgroundColor: colors.bg, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15, color: colors.textPrimary },
  saveBtn: { backgroundColor: colors.brand, borderRadius: radii.lg, paddingVertical: 14, alignItems: "center", marginTop: spacing.lg },
  saveBtnText: { color: colors.textOnDark, fontWeight: "700", fontSize: 15 },
});

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  headerBadge: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: colors.brandSoft,
    alignItems: "center", justifyContent: "center",
  },
  headerBadgeText: { fontSize: 10, fontWeight: "800", color: colors.brand, letterSpacing: 1 },
  headerTitle: { ...typography.h3, color: colors.textPrimary },
  headerSub: { fontSize: 11, color: colors.textSecondary, marginTop: 1, maxWidth: 220 },
  logoutBtn: { padding: 8 },

  // Tabs
  tabs: {
    flexDirection: "row", backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.xs, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: colors.brand },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.textTertiary },
  tabTextActive: { color: colors.brand },
  tabCount: { fontSize: 11, color: colors.textTertiary },

  // Content
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: colors.brand, textTransform: "uppercase", letterSpacing: 0.5 },
  addApptBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.brand, borderRadius: radii.pill,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  addApptBtnText: { fontSize: 11, fontWeight: "700", color: colors.textOnDark },

  emptyCard: { alignItems: "center", paddingVertical: spacing.xl * 2, gap: spacing.md },
  emptyText: { fontSize: 13, color: colors.textTertiary },

  // Appointment rows
  apptList: {
    backgroundColor: colors.surface, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border, overflow: "hidden",
    ...shadows.card,
  },
  apptRow: { flexDirection: "row", alignItems: "center" },
  apptAccent: { width: 4, alignSelf: "stretch" },
  apptBody: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: 12 },
  apptTime: { fontSize: 11, fontWeight: "600", color: colors.textSecondary, marginBottom: 2 },
  apptName: { fontSize: 14, fontWeight: "700", color: colors.textPrimary, marginBottom: 4 },
  statusBadge: { borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" },
  statusText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  checkBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center", marginRight: spacing.md,
  },

  // Patient rows
  searchRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary, paddingVertical: 6 },
  addPatBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.brand, alignItems: "center", justifyContent: "center",
  },
  patRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm,
    ...shadows.card,
  },
  patAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center",
  },
  patInitials: { fontSize: 14, fontWeight: "800", color: colors.brand },
  patName: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  patPhone: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  patPhoneMuted: { fontSize: 12, color: colors.textTertiary, marginTop: 2, fontStyle: "italic" },
});
