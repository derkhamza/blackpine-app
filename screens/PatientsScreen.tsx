import React, { useMemo, useState, useCallback } from "react";
import {
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeScreen } from "../components/SafeScreen";
import { PatientModal } from "../components/PatientModal";
import { PatientHistoryModal } from "../components/PatientHistoryModal";
import { GlobalSearchModal, HistoryTab } from "../components/GlobalSearchModal";
import { useCabinet } from "../lib/CabinetContext";
import { track } from "../lib/analytics";
import { Patient } from "../lib/cabinetTypes";
import { findOrphanAppts } from "../lib/orphanAppts";
import { Icon } from "../lib/icons";
import { radii, shadows, spacing, typography, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { useT } from "../lib/useT";
import { calcAge, initials, avatarColor } from "../lib/patientHelpers";
import { tapLight, tapSuccess } from "../lib/haptics";
import { FadeInView } from "../components/FadeInView";
import { ScalePressable } from "../components/ScalePressable";
import { PatientStatsCard } from "../components/PatientStatsCard";

// ─── Patient row ─────────────────────────────────────────────────────────────

function PatientRow({
  patient, appointmentCount, onPress, onCall, t,
}: {
  patient: Patient; appointmentCount: number; onPress: () => void;
  onCall?: () => void; t: (k: string) => string;
}) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const age = calcAge(patient.dateOfBirth);
  const color = avatarColor(patient.firstName + patient.lastName);

  return (
    <ScalePressable scaleTo={0.97} style={styles.patientRow} onPress={() => { tapLight(); onPress(); }}>
      <View style={[styles.avatar, { backgroundColor: color + "22" }]}>
        <Text style={[styles.avatarText, { color }]}>{initials(patient)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.patientName}>{patient.firstName} {patient.lastName}</Text>
        <Text style={styles.patientSub}>
          {patient.gender === "M" ? "♂" : patient.gender === "F" ? "♀" : ""}
          {age !== null ? `  ${age} ${t("patients.age")}` : ""}
          {patient.phone ? `  ·  ${patient.phone}` : ""}
        </Text>
      </View>
      {patient.bloodType && (
        <View style={styles.bloodTypeMini}>
          <Text style={styles.bloodTypeMiniText}>{patient.bloodType}</Text>
        </View>
      )}
      {appointmentCount > 0 && (
        <View style={styles.apptCountBadge}>
          <Text style={styles.apptCountText}>{appointmentCount}</Text>
        </View>
      )}
      {onCall && (
        <Pressable
          style={({ pressed }) => [styles.callBtn, pressed && { opacity: 0.7 }]}
          onPress={(e) => { e.stopPropagation?.(); onCall(); }}
          hitSlop={8}
        >
          <Icon name="phone" size={15} color={colors.success} />
        </Pressable>
      )}
      <View style={{ transform: [{ scaleX: -1 }] }}>
        <Icon name="back" size={16} color={colors.textTertiary} />
      </View>
    </ScalePressable>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function PatientsScreen({ navigation }: any) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();
  const { patients, appointments, ordonnances, certificats, addPatient, updatePatient, deletePatient, updateAppointment, reload } =
    useCabinet();

  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Global search
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);

  // Patient history modal (opened from global search results)
  const [historyPatient, setHistoryPatient] = useState<Patient | null>(null);
  const [historyTab, setHistoryTab] = useState<HistoryTab>("all");
  const [historyVisible, setHistoryVisible] = useState(false);

  const handleOpenPatient = useCallback(
    (patient: Patient, tab: HistoryTab = "all") => {
      setHistoryPatient(patient);
      setHistoryTab(tab);
      setGlobalSearchOpen(false);
      setHistoryVisible(true);
    },
    [],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q))
    );
  }, [patients, search]);

  const sections = useMemo(() => {
    const groups: Record<string, Patient[]> = {};
    const sorted = [...filtered].sort((a, b) =>
      `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`)
    );
    for (const p of sorted) {
      const letter = (p.lastName[0] ?? "#").toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(p);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, data]) => ({ title, data }));
  }, [filtered]);

  const apptCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of appointments) {
      if (a.patientId) map[a.patientId] = (map[a.patientId] ?? 0) + 1;
    }
    return map;
  }, [appointments]);

  const openAdd = () => { setEditingPatient(null); setModalVisible(true); };

  const handleSave = (p: Patient) => {
    tapSuccess();
    if (editingPatient) {
      updatePatient(p);
    } else {
      addPatient(p);
      track("action:create_patient");
      // Attach appointments booked under this name before the record existed.
      const fullName = `${p.firstName} ${p.lastName}`.trim();
      const orphans = findOrphanAppts(appointments, fullName);
      orphans.forEach((a) => updateAppointment({ ...a, patientId: p.id }));
      if (orphans.length > 0) {
        Alert.alert(t("patients.addPatient"), t("orphan.linkedN").replace("{n}", String(orphans.length)));
      }
    }
  };

  const handleCall = (phone: string) => {
    tapLight();
    Linking.openURL(`tel:${phone.replace(/\s/g, "")}`);
  };

  return (
    <SafeScreen>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t("patients.title")}</Text>
          <Text style={styles.headerSub}>{patients.length} {t("patients.title").toLowerCase()}</Text>
        </View>
        <View style={styles.headerActions}>
          <ScalePressable
            scaleTo={0.90}
            style={styles.searchBtn}
            onPress={() => { tapLight(); setGlobalSearchOpen(true); }}
          >
            <Icon name="search" size={18} color={colors.brand} />
          </ScalePressable>
          <ScalePressable scaleTo={0.90} style={styles.addBtn} onPress={() => { tapLight(); openAdd(); }}>
            <Icon name="add" size={20} color={colors.textOnDark} />
          </ScalePressable>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Icon name="search" size={16} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={t("patients.searchPlaceholder")}
          placeholderTextColor={colors.textTertiary}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Icon name="close" size={14} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {/* Stats */}
      <PatientStatsCard patients={patients} apptCountMap={apptCountMap} />

      {/* List */}
      {patients.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Icon name="users" size={32} color={colors.brand} />
          </View>
          <Text style={styles.emptyTitle}>{t("patients.noPatients")}</Text>
          <Text style={styles.emptyHint}>{t("patients.addFirst")}</Text>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{t("transactions.noResults")}</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{title}</Text>
            </View>
          )}
          renderItem={({ item, index }) => (
            <FadeInView index={index}>
              <PatientRow
                patient={item}
                appointmentCount={apptCountMap[item.id] ?? 0}
                onPress={() => navigation.navigate("PatientDetail", { patientId: item.id })}
                onCall={item.phone ? () => handleCall(item.phone!) : undefined}
                t={t}
              />
            </FadeInView>
          )}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.brand}
              colors={[colors.brand]}
            />
          }
        />
      )}

      {/* Patient form modal */}
      <PatientModal
        visible={modalVisible}
        initial={editingPatient}
        onSave={handleSave}
        onClose={() => setModalVisible(false)}
        t={t}
      />

      {/* Global search */}
      <GlobalSearchModal
        visible={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
        patients={patients}
        appointments={appointments}
        ordonnances={ordonnances}
        certificats={certificats}
        t={t}
        onOpenPatient={handleOpenPatient}
      />

      {/* Patient history (opened from search results) */}
      {historyPatient && (
        <PatientHistoryModal
          visible={historyVisible}
          patient={historyPatient}
          appointments={appointments}
          ordonnances={ordonnances}
          certificats={certificats}
          onClose={() => setHistoryVisible(false)}
          initialTab={historyTab}
          t={t}
        />
      )}
    </SafeScreen>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.5 },
  headerSub: { ...typography.caption, color: colors.brand, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  searchBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.brandSoft,
    borderWidth: 1, borderColor: colors.brand + "33",
    alignItems: "center", justifyContent: "center",
  },
  addBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.brand, alignItems: "center", justifyContent: "center",
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },

  searchBar: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg, marginVertical: spacing.md,
    borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 13,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.textPrimary, fontWeight: "500" },

  listContent: { paddingBottom: spacing.xxl },
  sectionHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
  sectionHeaderText: {
    fontSize: 12, fontWeight: "700", color: colors.brand,
    letterSpacing: 1, textTransform: "uppercase",
  },

  patientRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg, marginBottom: spacing.xs,
    borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    ...shadows.card,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 15, fontWeight: "800" },
  patientName: { ...typography.body, color: colors.textPrimary, fontWeight: "700" },
  patientSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  bloodTypeMini: {
    paddingHorizontal: 6, paddingVertical: 2,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.xs,
    borderWidth: 1, borderColor: colors.danger + "44",
  },
  bloodTypeMiniText: { fontSize: 10, fontWeight: "800", color: colors.danger },
  apptCountBadge: {
    minWidth: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.brandSoft,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  apptCountText: { fontSize: 11, fontWeight: "700", color: colors.brand },
  callBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.successSoft,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.success + "33",
  },

  empty: {
    flex: 1, alignItems: "center", justifyContent: "center",
    padding: spacing.xxl, gap: spacing.md,
  },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.brandSoft,
    alignItems: "center", justifyContent: "center",
    marginBottom: spacing.sm,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.textPrimary, textAlign: "center" },
  emptyHint: { fontSize: 13, color: colors.textTertiary, textAlign: "center", lineHeight: 20 },
});
