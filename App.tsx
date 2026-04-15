import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  computeTaxFromTransactions,
  DoctorProfile,
  Transaction,
  TransactionType,
  DeductibilityStatus,
} from "blackpine-engine";

const initialProfile: DoctorProfile = {
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

const initialTransactions: Transaction[] = [
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

const fmt = (n: number) => n.toLocaleString("fr-FR") + " MAD";
const newId = () => Math.random().toString(36).slice(2, 9);

export default function App() {
  const [profile, setProfile] = useState<DoctorProfile>(initialProfile);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [showTrace, setShowTrace] = useState(false);

  const result = useMemo(
    () => computeTaxFromTransactions(profile, transactions, 2026, "2026-12-31"),
    [profile, transactions]
  );

  const addTransaction = (type: TransactionType) => {
    setTransactions((prev) => [
      ...prev,
      {
        id: newId(),
        type,
        amount: 0,
        date: "2026-12-31",
        category: type === "RECETTE" ? "consultation" : "autre",
        deductibilityStatus: type === "CHARGE" ? "FULLY_DEDUCTIBLE" : undefined,
      },
    ]);
  };

  const updateTransaction = (id: string, patch: Partial<Transaction>) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Blackpine Cabinet</Text>
      <Text style={styles.subtitle}>Démo interactive du moteur fiscal</Text>

      {/* HERO RESULT */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Impôt à payer (estimé)</Text>
        <Text style={styles.heroNumber}>{fmt(result.tax.taxDue)}</Text>
        <Text style={styles.heroMeta}>
          Régime: {result.tax.regime}  ·  Règle: {result.tax.payableRule}
        </Text>
      </View>

      {/* PROFILE */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profil du médecin</Text>

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
          <Text style={styles.fieldLabel}>Date début activité (AAAA-MM-JJ)</Text>
          <TextInput
            style={styles.input}
            value={profile.activityStartDate}
            onChangeText={(v) => setProfile({ ...profile, activityStartDate: v })}
          />
        </View>
      </View>

      {/* TRANSACTIONS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transactions</Text>

        {transactions.map((t) => (
          <TransactionRow
            key={t.id}
            transaction={t}
            onChange={(patch) => updateTransaction(t.id, patch)}
            onDelete={() => deleteTransaction(t.id)}
          />
        ))}

        <View style={styles.addRow}>
          <Pressable
            style={[styles.addBtn, styles.addRecette]}
            onPress={() => addTransaction("RECETTE")}
          >
            <Text style={styles.addBtnText}>+ Recette</Text>
          </Pressable>
          <Pressable
            style={[styles.addBtn, styles.addCharge]}
            onPress={() => addTransaction("CHARGE")}
          >
            <Text style={styles.addBtnText}>+ Charge</Text>
          </Pressable>
        </View>
      </View>

      {/* BREAKDOWN */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Résultat fiscal</Text>
        <Row label="Recettes" value={fmt(result.breakdown.totalRecettes)} />
        <Row label="Charges" value={fmt(result.breakdown.totalCharges)} />
        <Row label="Charges déductibles" value={fmt(result.breakdown.totalChargesDeductibles)} />
        <Row label="Réintégrations" value={fmt(result.breakdown.totalReintegrations)} />
        <Row label="Résultat fiscal" value={fmt(result.breakdown.resultatFiscal)} bold />
      </View>

      {/* TAX */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Calcul de l'impôt</Text>
        <Row label="IR brut" value={fmt(result.tax.ir.grossIR)} />
        <Row label="Déduction familiale" value={`− ${fmt(result.tax.familyDeduction)}`} />
        <Row label="CM due" value={fmt(result.tax.cm.cmDue)} />
        {result.tax.cm.exempted && (
          <Text style={styles.note}>CM exemptée (moins de 36 mois d'activité)</Text>
        )}
      </View>

      {/* WARNINGS */}
      {result.tax.warnings.length > 0 && (
        <View style={[styles.section, styles.warningSection]}>
          <Text style={styles.sectionTitle}>⚠ Avertissements</Text>
          {result.tax.warnings.map((w, i) => (
            <Text key={i} style={styles.warningText}>{w}</Text>
          ))}
        </View>
      )}

      {/* TRACE TOGGLE */}
      <Pressable style={styles.traceToggle} onPress={() => setShowTrace((s) => !s)}>
        <Text style={styles.traceToggleText}>
          {showTrace ? "Masquer" : "Voir"} le détail du calcul
        </Text>
      </Pressable>

      {showTrace && (
        <View style={styles.section}>
          {result.tax.trace.map((line, i) => (
            <Text key={i} style={styles.traceLine}>{line}</Text>
          ))}
        </View>
      )}

      <Text style={styles.footer}>Config fiscale: {result.configVersion}</Text>

      <StatusBar style="auto" />
    </ScrollView>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

function TransactionRow({
  transaction,
  onChange,
  onDelete,
}: {
  transaction: Transaction;
  onChange: (patch: Partial<Transaction>) => void;
  onDelete: () => void;
}) {
  const isRecette = transaction.type === "RECETTE";
  const ratio = transaction.professionalUseRatio ?? 1;

  return (
    <View style={[styles.txRow, isRecette ? styles.txRecette : styles.txCharge]}>
      <View style={styles.txTop}>
        <Text style={[styles.txBadge, isRecette ? styles.badgeRecette : styles.badgeCharge]}>
          {isRecette ? "RECETTE" : "CHARGE"}
        </Text>
        <Pressable onPress={onDelete} hitSlop={10}>
          <Text style={styles.deleteBtn}>×</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.txCategory}
        value={transaction.category}
        onChangeText={(v) => onChange({ category: v })}
        placeholder="Catégorie"
      />

      <TextInput
        style={styles.txAmount}
        value={String(transaction.amount)}
        keyboardType="numeric"
        onChangeText={(v) => onChange({ amount: parseFloat(v) || 0 })}
        placeholder="0"
      />

      {!isRecette && (
        <View style={styles.txDeductibility}>
          <Text style={styles.txDeductLabel}>Déductibilité:</Text>
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
                    {status === "FULLY_DEDUCTIBLE" ? "100%" : status === "PARTIALLY_DEDUCTIBLE" ? "Partiel" : "Aucune"}
                  </Text>
                </Pressable>
              )
            )}
          </View>
          {transaction.deductibilityStatus === "PARTIALLY_DEDUCTIBLE" && (
            <View style={styles.ratioRow}>
              <Text style={styles.txDeductLabel}>Part pro (0–1):</Text>
              <TextInput
                style={styles.ratioInput}
                value={String(ratio)}
                keyboardType="decimal-pad"
                onChangeText={(v) =>
                  onChange({ professionalUseRatio: Math.min(1, Math.max(0, parseFloat(v) || 0)) })
                }
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f7f5" },
  content: { padding: 20, paddingTop: 60, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: "700", color: "#1a1a1a" },
  subtitle: { fontSize: 14, color: "#888", marginBottom: 20 },

  heroCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  heroLabel: { color: "#aaa", fontSize: 13, marginBottom: 8 },
  heroNumber: { color: "#fff", fontSize: 34, fontWeight: "700" },
  heroMeta: { color: "#999", fontSize: 12, marginTop: 12 },

  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    marginBottom: 12,
    letterSpacing: 0.5,
  },

  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, color: "#666", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
  },

  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  rowLabel: { fontSize: 15, color: "#444" },
  rowValue: { fontSize: 15, color: "#1a1a1a" },
  bold: { fontWeight: "700" },

  txRow: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  txRecette: { backgroundColor: "#f0f9f0", borderColor: "#cfe7cf" },
  txCharge: { backgroundColor: "#fbf5f0", borderColor: "#ead8c6" },
  txTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  txBadge: {
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: "hidden",
  },
  badgeRecette: { backgroundColor: "#2d6a2d", color: "#fff" },
  badgeCharge: { backgroundColor: "#8a4a1f", color: "#fff" },
  deleteBtn: { fontSize: 22, color: "#999", paddingHorizontal: 6 },
  txCategory: {
    borderWidth: 1, borderColor: "#ddd", borderRadius: 6,
    padding: 8, marginBottom: 6, backgroundColor: "#fff", fontSize: 14,
  },
  txAmount: {
    borderWidth: 1, borderColor: "#ddd", borderRadius: 6,
    padding: 10, backgroundColor: "#fff", fontSize: 17, fontWeight: "600",
  },
  txDeductibility: { marginTop: 10 },
  txDeductLabel: { fontSize: 12, color: "#666", marginBottom: 6 },
  pillRow: { flexDirection: "row", gap: 6 },
  pill: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd",
  },
  pillActive: { backgroundColor: "#1a1a1a", borderColor: "#1a1a1a" },
  pillText: { fontSize: 12, color: "#444" },
  pillTextActive: { color: "#fff", fontWeight: "600" },
  ratioRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 8 },
  ratioInput: {
    borderWidth: 1, borderColor: "#ddd", borderRadius: 6,
    padding: 6, backgroundColor: "#fff", fontSize: 14, width: 70,
  },

  addRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  addBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: "center" },
  addRecette: { backgroundColor: "#2d6a2d" },
  addCharge: { backgroundColor: "#8a4a1f" },
  addBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  warningSection: { backgroundColor: "#fff8e6", borderWidth: 1, borderColor: "#f0d878" },
  warningText: { fontSize: 13, color: "#7a5800", paddingVertical: 3 },
  note: { fontSize: 12, color: "#888", marginTop: 6, fontStyle: "italic" },

  traceToggle: {
    padding: 12, alignItems: "center",
    backgroundColor: "#eee", borderRadius: 8, marginBottom: 14,
  },
  traceToggleText: { fontSize: 13, color: "#444", fontWeight: "600" },

  traceLine: {
    fontSize: 11, color: "#666", paddingVertical: 2,
    fontFamily: "Courier",
  },

  footer: { fontSize: 11, color: "#aaa", textAlign: "center", marginTop: 12 },
});