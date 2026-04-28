import { ScrollView, StyleSheet, Text, View, ActivityIndicator, Pressable } from "react-native";
import { useApp } from "../lib/AppContext";
import { colors, radii, shadows, spacing, typography } from "../lib/theme";
import { formatMAD } from "../lib/format";
import { MonthlyChart } from "../components/MonthlyChart";
import { CategoryDonut } from "../components/CategoryDonut";
import { getMonthlyData, getActiveMonths, getCategoryBreakdown } from "../lib/chartHelpers";
import { SyncIndicator } from "../components/SyncIndicator";
import { ExportButtons } from "../components/ExportButtons";
import { useT } from "../lib/useT";
import { AssetSection } from "../components/AssetSection";
import { SafeScreen } from "../components/SafeScreen";
import { FilingsSection } from "../components/FilingsSection";
import { RecurringSection } from "../components/RecurringSection";
import { OptimizationSection } from "../components/OptimizationSection";
import { setPendingFilter } from "../lib/navigationState";
import { Icon } from "../lib/icons";

export function DashboardScreen({ navigation }: any) {
  const { loading, saving,trialDaysLeft, lastSavedAt, result, transactions, syncStatus, lastSyncedAt, isAuthenticated, fiscalYear, setFiscalYear } = useApp();
  const yearTx = transactions.filter((tx) => tx.date.startsWith(String(fiscalYear)));
  const monthlyData = getActiveMonths(getMonthlyData(yearTx, fiscalYear));
  const categorySlices = getCategoryBreakdown(yearTx);
  const { t } = useT();

  const irNet = Math.max(0, result.tax.ir.grossIR - result.tax.familyDeduction);
  const resultatFiscal = result.breakdown.resultatFiscal;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={styles.loadingText}>{t("dashboard.loading")}</Text>
      </View>
    );
  }

  return (
    <SafeScreen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandMark}>BLACKPINE</Text>
            <Text style={styles.brandSub}>CABINET</Text>
          </View>
          <SyncIndicator
            saving={saving}
            lastSavedAt={lastSavedAt}
            syncStatus={syncStatus}
            lastSyncedAt={lastSyncedAt}
            isAuthenticated={isAuthenticated}
          />
        </View>

        {/* Year picker */}
        <View style={styles.yearPicker}>
          <Pressable onPress={() => setFiscalYear(fiscalYear - 1)} style={styles.yearBtn}>
            <Text style={styles.yearArrow}>‹</Text>
          </Pressable>
          <View style={styles.yearCenter}>
            <Text style={styles.yearLabel}>{fiscalYear}</Text>
            <Text style={styles.yearSub}>{t("dashboard.fiscalYear")}</Text>
          </View>
          <Pressable onPress={() => setFiscalYear(fiscalYear + 1)} style={styles.yearBtn}>
            <Text style={styles.yearArrow}>›</Text>
          </Pressable>
        </View>
{trialDaysLeft > 0 && trialDaysLeft <= 30 && (
  <View style={styles.trialBanner}>
    <Icon name="clock" size={14} color={colors.warning} />
    <Text style={styles.trialText}>
      {t("paywall.trialBanner")} · {trialDaysLeft} {t("paywall.trialDaysLeft")}
    </Text>
  </View>
)}

{syncStatus === "error" && (
  <View style={styles.syncBanner}>
    <Icon name="alertCircle" size={14} color={colors.danger} />
    <Text style={styles.syncBannerText}>{t("dashboard.syncError")}</Text>
  </View>
)}

{!isAuthenticated && (
  <View style={styles.syncBanner}>
    <Icon name="cloud" size={14} color={colors.warning} />
    <Text style={styles.syncBannerText}>{t("dashboard.notBackedUp")}</Text>
  </View>
)}
        {/* Hero tax card */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>{t("dashboard.taxToPay")}</Text>
          <Text style={styles.heroAmount}>{formatMAD(result.tax.taxDue)}</Text>
          <View style={styles.heroChips}>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>{result.tax.regime}</Text>
            </View>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>{result.tax.payableRule}</Text>
            </View>
          </View>
        </View>

        {/* Stat cards */}
        <View style={styles.statsGrid}>
          <Pressable
            style={styles.statCard}
            onPress={() => { setPendingFilter("RECETTE"); navigation.navigate("Transactions"); }}
          >
            <View style={[styles.statDot, { backgroundColor: colors.recette }]} />
            <Text style={styles.statLabel}>{t("dashboard.recettes")}</Text>
            <Text style={[styles.statValue, { color: colors.recette }]}>
              {formatMAD(result.breakdown.totalRecettes)}
            </Text>
            <Text style={styles.statCount}>{yearTx.filter(tx => tx.type === "RECETTE").length} opérations</Text>
          </Pressable>

          <Pressable
            style={styles.statCard}
            onPress={() => { setPendingFilter("CHARGE"); navigation.navigate("Transactions"); }}
          >
            <View style={[styles.statDot, { backgroundColor: colors.charge }]} />
            <Text style={styles.statLabel}>{t("dashboard.charges")}</Text>
            <Text style={[styles.statValue, { color: colors.charge }]}>
              {formatMAD(result.breakdown.totalCharges)}
            </Text>
            <Text style={styles.statCount}>{yearTx.filter(tx => tx.type === "CHARGE").length} opérations</Text>
          </Pressable>
        </View>

        {/* Quick metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>IR net</Text>
            <Text style={styles.metricValue}>{formatMAD(irNet)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>CM</Text>
            <Text style={styles.metricValue}>
              {formatMAD(result.tax.cm.cmDue)}
              {result.tax.cm.exempted ? " (exemptée)" : ""}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{t("dashboard.resultatFiscal")}</Text>
            <Text style={[styles.metricValue, { color: resultatFiscal >= 0 ? colors.recette : colors.charge }]}>
              {formatMAD(resultatFiscal)}
            </Text>
          </View>
        </View>

        {/* Charts */}
        <MonthlyChart data={monthlyData} />
        <CategoryDonut slices={categorySlices} totalCharges={result.breakdown.totalCharges} />

        {/* Résultat fiscal breakdown */}
        <View style={styles.breakdownCard}>
          <View style={styles.breakdownHeader}>
            <View style={styles.breakdownDot} />
            <Text style={styles.breakdownTitle}>{t("dashboard.resultatFiscal")}</Text>
          </View>
          <InfoRow label={t("dashboard.totalRecettes")} value={formatMAD(result.breakdown.totalRecettes)} color={colors.recette} />
          <InfoRow label={t("dashboard.totalCharges")} value={formatMAD(result.breakdown.totalCharges)} color={colors.charge} />
          <InfoRow label={t("dashboard.chargesDeductibles")} value={formatMAD(result.breakdown.totalChargesDeductibles)} />
          <InfoRow label={t("dashboard.reintegrations")} value={formatMAD(result.breakdown.totalReintegrations)} muted />
          <View style={styles.breakdownDivider} />
          <InfoRow label={t("dashboard.resultatFiscal")} value={formatMAD(result.breakdown.resultatFiscal)} bold />
        </View>

        {/* Tax detail */}
        <View style={styles.breakdownCard}>
          <View style={styles.breakdownHeader}>
            <View style={styles.breakdownDot} />
            <Text style={styles.breakdownTitle}>{t("dashboard.taxDetail")}</Text>
          </View>
          <InfoRow label="IR brut (barème)" value={formatMAD(result.tax.ir.grossIR)} />
          <InfoRow label={t("dashboard.familyDeduction")} value={"- " + formatMAD(result.tax.familyDeduction)} muted />
          <InfoRow label="IR net" value={formatMAD(irNet)} />
          <InfoRow label="CM (0.5%)" value={formatMAD(result.tax.cm.cmDue)} muted />
          <View style={styles.breakdownDivider} />
          <InfoRow label={t("dashboard.taxToPay")} value={formatMAD(result.tax.taxDue)} bold accent />
        </View>

        {/* Sections */}
        <AssetSection />
        <RecurringSection />
        <OptimizationSection />
        <ExportButtons />
        <FilingsSection />

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => navigation.navigate("Expliquer")}
          >
            <Icon name="book" size={18} color={colors.textOnDark} />
            <Text style={styles.primaryBtnText}>{t("dashboard.understandTax")}</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.secondaryBtn}
          onPress={() => { setPendingFilter("ALL"); navigation.navigate("Transactions"); }}
        >
          <Text style={styles.secondaryBtnText}>{t("dashboard.manageTransactions")}</Text>
        </Pressable>

      </ScrollView>
    </SafeScreen>
  );
}

function InfoRow({ label, value, bold, muted, color, accent }: {
  label: string; value: string; bold?: boolean; muted?: boolean; color?: string; accent?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={[
        styles.infoLabel,
        bold && styles.infoBold,
        muted && styles.infoMuted,
      ]}>{label}</Text>
      <Text style={[
        styles.infoValue,
        bold && styles.infoBold,
        muted && styles.infoMuted,
        color ? { color } : null,
        accent ? { color: colors.brand, fontSize: 16 } : null,
      ]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  loadingText: { marginTop: spacing.md, color: colors.textSecondary, ...typography.caption },
syncBanner: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  backgroundColor: colors.dangerSoft,
  borderRadius: radii.md,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  marginBottom: spacing.md,
  borderWidth: 1,
  borderColor: colors.danger,
},
syncBannerText: {
  fontSize: 12,
  fontWeight: "600",
  color: colors.danger,
},
  trialBanner: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  backgroundColor: colors.warningSoft,
  borderRadius: radii.md,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  marginBottom: spacing.md,
  borderWidth: 1,
  borderColor: colors.warning,
},
trialText: {
  fontSize: 12,
  fontWeight: "600",
  color: colors.warning,
},
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: 40 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  brandMark: { fontSize: 14, fontWeight: "800", letterSpacing: 3, color: colors.brand },
  brandSub: { fontSize: 9, letterSpacing: 2, color: colors.gold, marginTop: 1 },

  // Year picker
  yearPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  yearBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  yearCenter: { alignItems: "center", marginHorizontal: spacing.lg },
  yearLabel: { fontSize: 22, fontWeight: "800", color: colors.textPrimary },
  yearSub: { fontSize: 10, color: colors.textTertiary, marginTop: 2 },
  yearArrow: { fontSize: 20, fontWeight: "700", color: colors.brand },

  // Hero
  hero: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
    alignItems: "center",
    ...shadows.hero,
  },
  heroLabel: {
    color: colors.textOnDarkMuted,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  heroAmount: {
    color: colors.textOnDark,
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  heroChips: {
    flexDirection: "row",
    gap: 8,
    marginTop: spacing.sm,
  },
  heroChip: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  heroChipText: {
    color: colors.textOnDarkMuted,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  // Stats
  statsGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 17,
    fontWeight: "700",
  },
  statCount: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 4,
  },

  // Metrics
  metricsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLabel: {
    fontSize: 9,
    color: colors.textTertiary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  // Breakdown
  breakdownCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  breakdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.md,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand,
  },
  breakdownTitle: {
    ...typography.micro,
    color: colors.textSecondary,
    textTransform: "uppercase",
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },

  // Info rows
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  infoLabel: { fontSize: 13, color: colors.textPrimary },
  infoValue: { fontSize: 13, color: colors.textPrimary, fontWeight: "500" },
  infoBold: { fontWeight: "700", fontSize: 14 },
  infoMuted: { color: colors.textSecondary },

  // Actions
  actionsRow: {
    marginBottom: spacing.sm,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: colors.brand,
    borderRadius: radii.md,
    ...shadows.card,
  },
  
  primaryBtnIcon: { fontSize: 16 },
  primaryBtnText: { color: colors.textOnDark, fontWeight: "700", fontSize: 15 },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: { color: colors.textPrimary, fontWeight: "600", fontSize: 14 },
});