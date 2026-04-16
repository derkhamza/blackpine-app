import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import {
  computeTaxFromTransactions,
  DoctorProfile,
  Transaction,
  TransactionType,
  DeductibilityStatus,
} from "blackpine-engine";
import { loadState, saveState, clearState } from "./lib/storage";
import { colors, radii, shadows, spacing, typography } from "./lib/theme";
import { formatMAD, formatTime } from "./lib/format";
import { CategoryPicker } from "./components/CategoryPicker";
import {
  applyCategoryDefaults,
  getCategoryById,
  Category,
} from "blackpine-engine";
import { AddTransactionModal } from "./components/AddTransactionModal";
import { useDatePicker } from "./lib/useDatePicker";
import { ExplainScreen } from "./components/ExplainScreen";

function getCategoryLabel(categoryId: string): string {
  const cat = getCategoryById(2026, categoryId);
  return cat?.labelFr ?? categoryId;
}

const defaultProfile: DoctorProfile = {
  id: "demo",
  legalForm: "PERSONNE_PHYSIQUE",
  practiceType: "CABINET_ONLY",
  activityStartDate: "2018-03-01",
  commune: "Casablanca",
  communeType: "URBAN",
  maritalStatus: "MARRIED",
  dependentsCount: 2,
  tpRegistered: true,
};

const defaultTransactions: Transaction[] = [
  { id: "r1", type: "RECETTE", amount: 460000, date: "2026-12-31", category: "consultation" },
  { id: "c1", type: "CHARGE", amount: 60000, date: "2026-12-31", category: "loyer" },
  { id: "c2", type: "CHARGE", amount: 72000, date: "2026-12-31", category: "salaires" },
  { id: "c3", type: "CHARGE", amount: 18000, date: "2026-12-31", category: "consommables" },
  {
    id: "c4", type: "CHARGE", amount: 12000, date: "2026-12-31", category: "carburant",
    deductibilityStatus: "PARTIALLY_DEDUCTIBLE", professionalUseRatio: 0.6,
  },
  { id: "c5", type: "CHARGE", amount: 8000, date: "2026-12-31", category: "assurance" },
  { id: "c6", type: "CHARGE", amount: 18000, date: "2026-12-31", category: "honoraires_comptable" },
];

const newId = () => Math.random().toString(36).slice(2, 9);

export default function App() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<DoctorProfile>(defaultProfile);
  const [transactions, setTransactions] = useState<Transaction[]>(defaultTransactions);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [addModalType, setAddModalType] = useState<TransactionType | null>(null);
  const [pickerOpenForExisting, setPickerOpenForExisting] = useState<{ txId: string; type: TransactionType } | null>(null);
  const transactionDatePicker = useDatePicker();
  const [explainOpen, setExplainOpen] = useState(false);
  useEffect(() => {
    (async () => {
      const persisted = await loadState();
      if (persisted.profile) setProfile(persisted.profile);
      if (persisted.transactions.length > 0) setTransactions(persisted.transactions);
      setLastSavedAt(persisted.lastSavedAt);
      setLoading(false);
    })();
  }, []);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (loading) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      try {
        const ts = await saveState(profile, transactions);
        setLastSavedAt(ts);
      } catch (err) {
        console.warn("save failed", err);
      } finally {
        setSaving(false);
      }
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [profile, transactions, loading]);

  const result = useMemo(
    () => computeTaxFromTransactions(profile, transactions, 2026, "2026-12-31"),
    [profile, transactions]
  );

  const recettes = transactions.filter((t) => t.type === "RECETTE");
  const charges = transactions.filter((t) => t.type === "CHARGE");

const handleCreate = (tx: Omit<Transaction, "id">) => {
  setTransactions((prev) => [...prev, { ...tx, id: newId() }]);
};

const handleCategoryChange = (txId: string, category: Category) => {
  const defaults = applyCategoryDefaults(category.id, result.tax.regime, 2026);
  updateTransaction(txId, {
    category: category.id,
    deductibilityStatus: defaults.deductibilityStatus,
    professionalUseRatio: defaults.professionalUseRatio,
  });
};

  const updateTransaction = (id: string, patch: Partial<Transaction>) => {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleReset = () => {
    Alert.alert(
      "Réinitialiser ?",
      "Toutes vos données seront effacées et remplacées par les données de démonstration.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Réinitialiser",
          style: "destructive",
          onPress: async () => {
            await clearState();
            setProfile(defaultProfile);
            setTransactions(defaultTransactions);
            setLastSavedAt(null);
          },
        },
      ]
    );
  };

  const onDateChange = (_: unknown, selected?: Date) => {
    if (Platform.OS !== "ios") setShowDatePicker(false);
    if (selected) {
      const iso = selected.toISOString().split("T")[0];
      setProfile({ ...profile, activityStartDate: iso });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={styles.loadingText}>Chargement de vos données…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandMark}>BLACKPINE</Text>
          <Text style={styles.brandSub}>Cabinet · Démo moteur fiscal</Text>
        </View>
        <SaveIndicator saving={saving} lastSavedAt={lastSavedAt} />
      </View>

      {/* HERO RESULT */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Impôt à payer · estimation 2026</Text>
        <Text style={styles.heroNumber}>{formatMAD(result.tax.taxDue)}</Text>
        <View style={styles.heroChips}>
          <Chip label={`Régime ${result.tax.regime}`} />
          <Chip label={`Calculé sur ${result.tax.payableRule}`} />
        </View>
      </View>

      {/* QUICK STATS */}
      <View style={styles.statsRow}>
        <StatCard
          label="Recettes"
          value={formatMAD(result.breakdown.totalRecettes)}
          accent={colors.recette}
        />
        <StatCard
          label="Charges"
          value={formatMAD(result.breakdown.totalCharges)}
          accent={colors.charge}
        />
      </View>

      {/* PROFILE */}
      <Section title="Profil">
        <Field label="Personnes à charge">
          <TextInput
            style={styles.input}
            value={String(profile.dependentsCount)}
            keyboardType="number-pad"
            onChangeText={(v) =>
              setProfile({ ...profile, dependentsCount: Math.max(0, parseInt(v) || 0) })
            }
          />
        </Field>

        <Field label="Date de début d'activité">
          <Pressable
            style={styles.input}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.inputText}>
              {new Date(profile.activityStartDate).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
          </Pressable>
        </Field>

        {showDatePicker && (
          <DateTimePicker
            value={new Date(profile.activityStartDate)}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}
      </Section>

      {/* TRANSACTIONS */}
      <Section title={`Transactions · ${transactions.length}`}>
        {transactions.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Aucune transaction</Text>
            <Text style={styles.emptyText}>
              Commencez par ajouter votre première recette ou charge.
            </Text>
          </View>
        )}        
        {recettes.length > 0 && (
          <Text style={styles.groupLabel}>Recettes ({recettes.length})</Text>
        )}
        {recettes.map((t) => (
          <TransactionRow
            key={t.id}
            transaction={t}
            onChange={(patch) => updateTransaction(t.id, patch)}
            onDelete={() => deleteTransaction(t.id)}
            onPickCategory={() => setPickerOpenForExisting({ txId: t.id, type: t.type })}
            onPickDate={() =>
              transactionDatePicker.show(t.date, (iso) => updateTransaction(t.id, { date: iso }))
            }
          />
        ))}

        {charges.length > 0 && (
          <Text style={[styles.groupLabel, { marginTop: spacing.md }]}>
            Charges ({charges.length})
          </Text>
        )}
        {charges.map((t) => (
          <TransactionRow
            key={t.id}
            transaction={t}
            onChange={(patch) => updateTransaction(t.id, patch)}
            onDelete={() => deleteTransaction(t.id)}
            onPickCategory={() => setPickerOpenForExisting({ txId: t.id, type: t.type })}
            onPickDate={() =>
              transactionDatePicker.show(t.date, (iso) => updateTransaction(t.id, { date: iso }))
            }
          />
        ))}

        <View style={styles.addRow}>
          <Pressable
            style={[styles.addBtn, { backgroundColor: colors.recette }]}
            onPress={() => setAddModalType("RECETTE")}
          >
            <Text style={styles.addBtnText}>+ Recette</Text>
          </Pressable>
          <Pressable
            style={[styles.addBtn, { backgroundColor: colors.charge }]}
            onPress={() => setAddModalType("CHARGE")}
          >
            <Text style={styles.addBtnText}>+ Charge</Text>
          </Pressable>
        </View>
      </Section>

      {/* BREAKDOWN */}
      <Section title="Résultat fiscal">
        <Row label="Total recettes" value={formatMAD(result.breakdown.totalRecettes)} />
        <Row label="Total charges" value={formatMAD(result.breakdown.totalCharges)} />
        <Row
          label="Charges déductibles"
          value={formatMAD(result.breakdown.totalChargesDeductibles)}
        />
        <Row
          label="Réintégrations"
          value={formatMAD(result.breakdown.totalReintegrations)}
          muted
        />
        <Divider />
        <Row label="Résultat fiscal" value={formatMAD(result.breakdown.resultatFiscal)} bold />
      </Section>

      {/* TAX */}
      <Section title="Calcul de l'impôt">
        <Row label="IR brut" value={formatMAD(result.tax.ir.grossIR)} />
        <Row
          label="Déduction familiale"
          value={`− ${formatMAD(result.tax.familyDeduction)}`}
        />
        <Row label="Cotisation minimale" value={formatMAD(result.tax.cm.cmDue)} />
        {result.tax.cm.exempted && (
          <Text style={styles.note}>CM exemptée — moins de 36 mois d'activité</Text>
        )}
      </Section>

      {result.tax.warnings.length > 0 && (
        <View style={[styles.section, styles.warningSection]}>
          <Text style={styles.sectionTitle}>Avertissements</Text>
          {result.tax.warnings.map((w, i) => (
            <Text key={i} style={styles.warningText}>
              · {w}
            </Text>
          ))}
        </View>
      )}

      <Pressable
        style={styles.explainBtn}
        onPress={() => setExplainOpen(true)}
      >
        <Text style={styles.explainBtnText}>Comprendre mon impôt →</Text>
      </Pressable>

      {showTrace && (
        <View style={styles.section}>
          {result.tax.trace.map((line, i) => (
            <Text key={i} style={styles.traceLine}>
              {line}
            </Text>
          ))}
        </View>
      )}

      <Pressable style={styles.resetBtn} onPress={handleReset}>
        <Text style={styles.resetBtnText}>Réinitialiser les données</Text>
      </Pressable>

      <Text style={styles.footer}>Config fiscale · {result.configVersion}</Text>

      <StatusBar style="dark" />
      {addModalType && (
        <AddTransactionModal
          visible={true}
          type={addModalType}
          regime={result.tax.regime}
          fiscalYear={2026}
          onClose={() => setAddModalType(null)}
          onCreate={handleCreate}
        />
      )}

      {pickerOpenForExisting && (
        <CategoryPicker
          visible={true}
          type={pickerOpenForExisting.type}
          fiscalYear={2026}
          onClose={() => setPickerOpenForExisting(null)}
          onSelect={(cat) => handleCategoryChange(pickerOpenForExisting.txId, cat)}
        />
      )}

      {transactionDatePicker.isVisible && transactionDatePicker.pickerProps && (
        <DateTimePicker {...transactionDatePicker.pickerProps} />
      )}

      <ExplainScreen
        visible={explainOpen}
        onClose={() => setExplainOpen(false)}
        computation={result}
      />
    </ScrollView>
  );
}

/* -------- Building blocks -------- */

function SaveIndicator({ saving, lastSavedAt }: { saving: boolean; lastSavedAt: string | null }) {
  if (saving) {
    return (
      <View style={styles.saveIndicator}>
        <ActivityIndicator size="small" color={colors.textTertiary} />
        <Text style={styles.saveText}>Sauvegarde…</Text>
      </View>
    );
  }
  if (!lastSavedAt) return null;
  return (
    <View style={styles.saveIndicator}>
      <View style={styles.dot} />
      <Text style={styles.saveText}>Sauvegardé · {formatTime(lastSavedAt)}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statAccent, { backgroundColor: accent }]} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.rowBold, muted && styles.rowMuted]}>
        {label}
      </Text>
      <Text style={[styles.rowValue, bold && styles.rowBold, muted && styles.rowMuted]}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function TransactionRow({
  transaction,
  onChange,
  onDelete,
  onPickCategory,
  onPickDate,
}: {
  transaction: Transaction;
  onChange: (patch: Partial<Transaction>) => void;
  onDelete: () => void;
  onPickCategory: () => void;
  onPickDate: () => void;
}) {
  const isRecette = transaction.type === "RECETTE";
  const ratio = transaction.professionalUseRatio ?? 1;

  return (
    <View style={styles.txRow}>
      <View style={[styles.txAccent, { backgroundColor: isRecette ? colors.recette : colors.charge }]} />
      <View style={styles.txContent}>
        <View style={styles.txTop}>
          <Pressable
            style={styles.txCategoryBtn}
            onPress={onPickCategory}
          >
            <Text style={styles.txCategoryText}>
              {getCategoryLabel(transaction.category)}
            </Text>
            <Text style={styles.txCategoryEdit}>Modifier</Text>
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={12} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>×</Text>
          </Pressable>
        </View>

        <Pressable style={styles.txDateBtn} onPress={onPickDate}>
          <Text style={styles.txDateText}>
            📅 {new Date(transaction.date).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Text>
        </Pressable>

        {!isRecette && (
          <View style={styles.txDeductibility}>
            <View style={styles.pillRow}>
              {(["FULLY_DEDUCTIBLE", "PARTIALLY_DEDUCTIBLE", "NOT_DEDUCTIBLE"] as DeductibilityStatus[]).map(
                (status) => (
                  <Pressable
                    key={status}
                    style={[
                      styles.pill,
                      transaction.deductibilityStatus === status && styles.pillActive,
                    ]}
                    onPress={() => onChange({ deductibilityStatus: status })}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        transaction.deductibilityStatus === status && styles.pillTextActive,
                      ]}
                    >
                      {status === "FULLY_DEDUCTIBLE"
                        ? "Déductible"
                        : status === "PARTIALLY_DEDUCTIBLE"
                        ? "Partielle"
                        : "Non déductible"}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
            {transaction.deductibilityStatus === "PARTIALLY_DEDUCTIBLE" && (
              <View style={styles.ratioRow}>
                <Text style={styles.ratioLabel}>Part professionnelle</Text>
                <TextInput
                  style={styles.ratioInput}
                  value={String(ratio)}
                  keyboardType="decimal-pad"
                  onChangeText={(v) =>
                    onChange({
                      professionalUseRatio: Math.min(1, Math.max(0, parseFloat(v) || 0)),
                    })
                  }
                />
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

/* -------- Styles -------- */

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    ...typography.caption,
  },

  container: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: spacing.lg,
    paddingTop: 64,
    paddingBottom: 64,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: spacing.xl,
  },
  brandMark: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.brand,
  },
  brandSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },

  saveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: 4,
  },
  saveText: { fontSize: 11, color: colors.textTertiary },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },

  heroCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.hero,
  },
  heroLabel: {
    color: colors.textOnDarkMuted,
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  heroNumber: {
    color: colors.textOnDark,
    ...typography.display,
  },
  heroChips: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  chip: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  chipText: {
    color: colors.textOnDark,
    fontSize: 11,
    fontWeight: "500",
  },

  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    overflow: "hidden",
    ...shadows.card,
  },
  statAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  statLabel: {
    color: colors.textSecondary,
    ...typography.caption,
    marginBottom: 4,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
  },

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

  field: { marginBottom: spacing.md },
  fieldLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  inputText: {
    fontSize: 15,
    color: colors.textPrimary,
  },

  groupLabel: {
    ...typography.micro,
    color: colors.textTertiary,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
  },
  rowLabel: { fontSize: 14, color: colors.textPrimary },
  rowValue: { fontSize: 14, color: colors.textPrimary },
  rowBold: { fontWeight: "700" },
  rowMuted: { color: colors.textSecondary },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },

  txRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  txAccent: { width: 3 },
  txContent: { flex: 1, padding: spacing.md },
  txTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  txCategory: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    paddingVertical: 4,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.sm,
  },
  deleteBtnText: {
    fontSize: 22,
    color: colors.textTertiary,
    lineHeight: 24,
  },
  txAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  txDeductibility: { marginTop: spacing.md },
  pillRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  pillText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  pillTextActive: {
    color: colors.textOnDark,
    fontWeight: "600",
  },
  ratioRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  ratioLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  ratioInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xs,
    padding: 6,
    backgroundColor: colors.surface,
    fontSize: 13,
    width: 70,
    color: colors.textPrimary,
  },

  addRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  addBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.sm,
    alignItems: "center",
  },
  addBtnText: {
    color: colors.textOnDark,
    fontWeight: "600",
    fontSize: 14,
  },

  warningSection: {
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: "#E8C470",
  },
  warningText: {
    fontSize: 13,
    color: colors.warning,
    paddingVertical: 3,
  },

  note: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 6,
    fontStyle: "italic",
  },

  traceToggle: {
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.brandSoft,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
  },
  traceToggleText: {
    fontSize: 13,
    color: colors.brand,
    fontWeight: "600",
  },

  traceLine: {
    ...typography.mono,
    color: colors.textSecondary,
    paddingVertical: 2,
  },

  resetBtn: {
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.dangerSoft,
  },
  resetBtnText: {
    fontSize: 13,
    color: colors.danger,
    fontWeight: "600",
  },

  footer: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: "center",
    marginTop: spacing.md,
  },

  txCategoryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  txCategoryText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    flex: 1,
  },
  txCategoryEdit: {
    fontSize: 11,
    color: colors.brand,
    fontWeight: "600",
  },
  txDateBtn: {
    marginTop: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  txDateText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  emptyState: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
  explainBtn: {
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: colors.brand,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  explainBtnText: {
    color: colors.textOnDark,
    fontWeight: "600",
    fontSize: 15,
    letterSpacing: 0.3,
  },
});