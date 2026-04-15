import { StatusBar } from "expo-status-bar";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  computeTaxFromTransactions,
  DoctorProfile,
  Transaction,
} from "blackpine-engine";

const profile: DoctorProfile = {
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

const transactions: Transaction[] = [
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

const result = computeTaxFromTransactions(profile, transactions, 2026, "2026-12-31");

const fmt = (n: number) => n.toLocaleString("fr-FR") + " MAD";

export default function App() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Blackpine Cabinet</Text>
      <Text style={styles.subtitle}>Démo moteur fiscal</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Impôt à payer</Text>
        <Text style={styles.bigNumber}>{fmt(result.tax.taxDue)}</Text>
        <Text style={styles.cardMeta}>Régime: {result.tax.regime}  ·  Règle: {result.tax.payableRule}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Résultat fiscal</Text>
        <Row label="Recettes" value={fmt(result.breakdown.totalRecettes)} />
        <Row label="Charges" value={fmt(result.breakdown.totalCharges)} />
        <Row label="Charges déductibles" value={fmt(result.breakdown.totalChargesDeductibles)} />
        <Row label="Réintégrations" value={fmt(result.breakdown.totalReintegrations)} />
        <Row label="Résultat fiscal" value={fmt(result.breakdown.resultatFiscal)} bold />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Calcul de l'impôt</Text>
        <Row label="IR brut" value={fmt(result.tax.ir.grossIR)} />
        <Row label="Déduction familiale" value={`− ${fmt(result.tax.familyDeduction)}`} />
        <Row label="CM due" value={fmt(result.tax.cm.cmDue)} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Détail du calcul</Text>
        {result.tax.trace.map((line, i) => (
          <Text key={i} style={styles.traceLine}>{line}</Text>
        ))}
      </View>

      <Text style={styles.footer}>
        Config fiscale: {result.configVersion}
      </Text>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f7f5" },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: "700", color: "#1a1a1a" },
  subtitle: { fontSize: 14, color: "#888", marginBottom: 24 },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  cardLabel: { color: "#aaa", fontSize: 13, marginBottom: 8 },
  bigNumber: { color: "#fff", fontSize: 36, fontWeight: "700" },
  cardMeta: { color: "#999", fontSize: 12, marginTop: 12 },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  rowLabel: { fontSize: 15, color: "#444" },
  rowValue: { fontSize: 15, color: "#1a1a1a" },
  bold: { fontWeight: "700" },
  traceLine: {
    fontSize: 12,
    color: "#666",
    paddingVertical: 3,
    fontFamily: "Courier",
  },
  footer: {
    fontSize: 11,
    color: "#aaa",
    textAlign: "center",
    marginTop: 12,
  },
});