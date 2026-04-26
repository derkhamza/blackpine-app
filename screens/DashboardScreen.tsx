import { ScrollView, StyleSheet, Text, View, ActivityIndicator, Pressable } from "react-native";
import { useApp } from "../lib/AppContext";
import { colors, radii, shadows, spacing, typography } from "../lib/theme";
import { formatMAD, formatTime } from "../lib/format";
import { MonthlyChart } from "../components/MonthlyChart";
import { CategoryDonut } from "../components/CategoryDonut";
import { getMonthlyData, getActiveMonths, getCategoryBreakdown } from "../lib/chartHelpers";
import { SyncIndicator } from "../components/SyncIndicator";
import { ExportButtons } from "../components/ExportButtons";
import { useT } from "../lib/useT";
import { SafeScreen } from "../components/SafeScreen";
import { FilingsSection } from "../components/FilingsSection";
import { OptimizationSection } from "../components/OptimizationSection";

export function DashboardScreen({ navigation }: any) {
  const { loading, saving, lastSavedAt, result, transactions, syncStatus, lastSyncedAt, isAuthenticated, fiscalYear, setFiscalYear } = useApp();  
  const monthlyData = getActiveMonths(getMonthlyData(result.breakdown.totalRecettes > 0 ? transactions.filter((tx) => tx.date.startsWith(String(fiscalYear))) : [], fiscalYear));
  const categorySlices = getCategoryBreakdown(transactions);
  const { t } = useT();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={styles.statLabel}>{t("dashboard.charges")}</Text>
      </View>
    );
  }

  return (
  <SafeScreen>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brandMark}>{t("dashboard.brand")}</Text>
          <Text style={styles.brandSub}>{t("dashboard.brandSub")}</Text>
        </View>
        <View style={styles.yearRow}>
          <Pressable onPress={() => setFiscalYear(fiscalYear - 1)}>
            <Text style={styles.yearArrow}>‹</Text>
          </Pressable>
          <Text style={styles.yearLabel}>{fiscalYear}</Text>
          <Pressable onPress={() => setFiscalYear(fiscalYear + 1)}>
            <Text style={styles.yearArrow}>›</Text>
          </Pressable>
        </View>
        <SyncIndicator
          saving={saving}
          lastSavedAt={lastSavedAt}
          syncStatus={syncStatus}
          lastSyncedAt={lastSyncedAt}
          isAuthenticated={isAuthenticated}
        />
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>{t("dashboard.taxToPay")} {fiscalYear}</Text>
        <Text style={styles.heroNumber}>{formatMAD(result.tax.taxDue)}</Text>
        <View style={styles.heroChips}>
          <Text style={styles.chipText}>{t("dashboard.regime")} {result.tax.regime}</Text>
          <View style={styles.chip}><Text style={styles.chipText}>{t("dashboard.calculatedOn")} {result.tax.payableRule}</Text></View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statAccent, { backgroundColor: colors.recette }]} />
          <Text style={styles.statLabel}>{t("dashboard.recettes")}</Text>
          <Text style={styles.statValue}>{formatMAD(result.breakdown.totalRecettes)}</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statAccent, { backgroundColor: colors.charge }]} />
          <Text style={styles.statLabel}>{t("dashboard.charges")}</Text>
          <Text style={styles.statValue}>{formatMAD(result.breakdown.totalCharges)}</Text>
        </View>
      </View>

      <MonthlyChart data={monthlyData} />
      <CategoryDonut slices={categorySlices} totalCharges={result.breakdown.totalCharges} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("dashboard.resultatFiscal")}</Text>
        <Row label={t("dashboard.totalRecettes")} value={formatMAD(result.breakdown.totalRecettes)} />
        <Row label={t("dashboard.totalCharges")} value={formatMAD(result.breakdown.totalCharges)} />
        <Row label={t("dashboard.chargesDeductibles")} value={formatMAD(result.breakdown.totalChargesDeductibles)} />
        <Row label={t("dashboard.reintegrations")} value={formatMAD(result.breakdown.totalReintegrations)} muted />
        <View style={styles.divider} />
        <Row label={t("dashboard.resultatFiscal")} value={formatMAD(result.breakdown.resultatFiscal)} bold />
      </View>

      <OptimizationSection />

      <ExportButtons />
      
      <FilingsSection />

      <Pressable
        style={styles.explainBtn}
        onPress={() => navigation.navigate("Expliquer")}
      >
        <Text style={styles.explainBtnText}>{t("dashboard.understandTax")}</Text>
      </Pressable>

      <Pressable
        style={styles.secondaryBtn}
        onPress={() => navigation.navigate("Transactions")}
      >
        <Text style={styles.secondaryBtnText}>{t("dashboard.manageTransactions")}</Text>
      </Pressable>
    </ScrollView>
  </SafeScreen>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.rowBold, muted && styles.rowMuted]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.rowBold, muted && styles.rowMuted]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  loadingText: { marginTop: spacing.md, color: colors.textSecondary, ...typography.caption },

  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: 20, paddingBottom: 40 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: spacing.xl },
  brandMark: { fontSize: 14, fontWeight: "700", letterSpacing: 2, color: colors.brand },
  brandSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },

  saveIndicator: { flexDirection: "row", alignItems: "center", gap: 6, paddingBottom: 4 },
  saveText: { fontSize: 11, color: colors.textTertiary },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },

  heroCard: { backgroundColor: colors.surfaceDark, borderRadius: radii.lg, padding: spacing.xl, marginBottom: spacing.lg, ...shadows.hero },
  heroLabel: { color: colors.textOnDarkMuted, ...typography.caption, marginBottom: spacing.sm },
  heroNumber: { color: colors.textOnDark, ...typography.display },
  heroChips: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  chip: { backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill },
  chipText: { color: colors.textOnDark, fontSize: 11, fontWeight: "500" },

  statsRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.lg, overflow: "hidden", ...shadows.card },
  statAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 3 },
  statLabel: { color: colors.textSecondary, ...typography.caption, marginBottom: 4 },
  statValue: { color: colors.textPrimary, fontSize: 17, fontWeight: "700" },

  section: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.md, ...shadows.card },
  sectionTitle: { ...typography.micro, color: colors.textSecondary, textTransform: "uppercase", marginBottom: spacing.md },

  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7 },
  rowLabel: { fontSize: 14, color: colors.textPrimary },
  rowValue: { fontSize: 14, color: colors.textPrimary },
  rowBold: { fontWeight: "700" },
  rowMuted: { color: colors.textSecondary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },

  explainBtn: { paddingVertical: 16, alignItems: "center", backgroundColor: colors.brand, borderRadius: radii.md, marginBottom: spacing.sm, ...shadows.card },
  explainBtnText: { color: colors.textOnDark, fontWeight: "600", fontSize: 15, letterSpacing: 0.3 },
  secondaryBtn: { paddingVertical: 14, alignItems: "center", backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border },
  secondaryBtnText: { color: colors.textPrimary, fontWeight: "600", fontSize: 14 },
yearRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 20,
  marginBottom: spacing.lg,
},
yearArrow: {
  fontSize: 24,
  fontWeight: "700",
  color: colors.brand,
  paddingHorizontal: 12,
},
yearLabel: {
  fontSize: 18,
  fontWeight: "700",
  color: colors.textPrimary,
},
});