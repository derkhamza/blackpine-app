import { useRef, useEffect, useMemo} from "react";
import { Animated, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useApp } from "../lib/AppContext";
import { useCabinet } from "../lib/CabinetContext";
import { radii, shadows, spacing, typography, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { formatMAD } from "../lib/format";
import { MonthlyChart } from "../components/MonthlyChart";
import { CategoryDonut } from "../components/CategoryDonut";
import { TopPatientsCard } from "../components/TopPatientsCard";
import { getMonthlyData, getActiveMonths, getCategoryBreakdown } from "../lib/chartHelpers";
import { useT } from "../lib/useT";
import { AssetSection } from "../components/AssetSection";
import { SafeScreen } from "../components/SafeScreen";
import { RecurringSection } from "../components/RecurringSection";
import { OptimizationSection } from "../components/OptimizationSection";
import { setPendingFilter, setPendingOpenAdd } from "../lib/navigationState";
import { Icon } from "../lib/icons";
import { ScalePressable } from "../components/ScalePressable";
import { tapLight } from "../lib/haptics";
import { YoYCard } from "../components/YoYCard";
import { scheduleDailySummaryNotification, cancelDailySummaryNotification } from "../lib/notifications";
import { todayIso } from "../lib/utils";

export function DashboardScreen({ navigation }: any) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const { result, transactions, syncStatus, isAuthenticated, fiscalYear, setFiscalYear, retrySync, eodNotifEnabled } = useApp();
  const { patients, appointments } = useCabinet();
  const FISCAL_MIN = 2015;
  const FISCAL_MAX = Math.min(new Date().getFullYear(), 2030);
  const yearTx = transactions.filter((tx) => tx.date.startsWith(String(fiscalYear)));
  const yearAppts = appointments.filter((a) => a.date.startsWith(String(fiscalYear)));
  const monthlyData = getActiveMonths(getMonthlyData(yearTx, fiscalYear));
  const categorySlices = getCategoryBreakdown(yearTx);

  // Year-over-year: aggregate prior fiscal year from the same transaction list
  const prevYear = fiscalYear - 1;
  const prevYearTx = transactions.filter((tx) => tx.date.startsWith(String(prevYear)));
  const prevRecettes = prevYearTx
    .filter((tx) => tx.type === "RECETTE")
    .reduce((s, tx) => s + tx.amount, 0);
  const prevCharges = prevYearTx
    .filter((tx) => tx.type === "CHARGE")
    .reduce((s, tx) => s + tx.amount, 0);
  const { t } = useT();

  const netResult = result.breakdown.totalRecettes - result.breakdown.totalCharges;

  // ── CNOPS / AMO stats for the fiscal year ────────────────────────────────
  const cnopsStats = (() => {
    let pendingTotal = 0, receivedTotal = 0;
    let pendingCount = 0, receivedCount = 0, rejectedCount = 0;
    for (const a of yearAppts) {
      if (!a.reimbursementStatus) continue;
      const amt = a.reimbursementAmount ?? 0;
      if      (a.reimbursementStatus === "pending")  { pendingCount++;  pendingTotal  += amt; }
      else if (a.reimbursementStatus === "received") { receivedCount++; receivedTotal += amt; }
      else if (a.reimbursementStatus === "rejected") { rejectedCount++; }
    }
    return { pendingTotal, receivedTotal, pendingCount, receivedCount, rejectedCount };
  })();
  const hasCnops = cnopsStats.pendingCount + cnopsStats.receivedCount + cnopsStats.rejectedCount > 0;

  // ── Mount animation ─────────────────────────────────────────────────────────
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 370, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── End-of-day summary notification ─────────────────────────────────────────
  useEffect(() => {
    const today = todayIso();
    const todayAppts = appointments.filter(
      (a) => a.date === today && a.status !== "cancelled" && a.status !== "no_show",
    );
    const todayTx = transactions.filter(
      (tx) => tx.date === today && tx.type === "RECETTE",
    );
    const patientCount = todayAppts.length;
    const revenueMAD   = todayTx.reduce((sum, tx) => sum + tx.amount, 0);
    const pendingReimbCount = todayAppts.filter(
      (a) => a.reimbursementStatus === "pending",
    ).length;

    if (eodNotifEnabled) {
      scheduleDailySummaryNotification({ dateIso: today, patientCount, revenueMAD, pendingReimbCount });
    } else {
      cancelDailySummaryNotification();
    }
  }, [appointments, transactions, eodNotifEnabled]);

  return (
    <SafeScreen>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("finances.summary")}</Text>
        <Text style={styles.headerSub}>{fiscalYear}</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

        {/* Year picker */}
        <View style={styles.yearPicker}>
          <ScalePressable
            style={[styles.yearBtn, fiscalYear <= FISCAL_MIN && styles.yearBtnDisabled]}
            onPress={() => { if (fiscalYear > FISCAL_MIN) { tapLight(); setFiscalYear(fiscalYear - 1); } }}
          >
            <Icon name="back" size={16} color={fiscalYear <= FISCAL_MIN ? colors.textTertiary : colors.brand} />
          </ScalePressable>
          <View style={styles.yearCenter}>
            <Text style={styles.yearLabel}>{fiscalYear}</Text>
            <Text style={styles.yearSub}>{t("dashboard.fiscalYear")}</Text>
          </View>
          <ScalePressable
            style={[styles.yearBtn, fiscalYear >= FISCAL_MAX && styles.yearBtnDisabled]}
            onPress={() => { if (fiscalYear < FISCAL_MAX) { tapLight(); setFiscalYear(fiscalYear + 1); } }}
          >
            <View style={{ transform: [{ scaleX: -1 }] }}>
              <Icon name="back" size={16} color={fiscalYear >= FISCAL_MAX ? colors.textTertiary : colors.brand} />
            </View>
          </ScalePressable>
        </View>

        {syncStatus === "error" && (
          <Pressable style={styles.syncBanner} onPress={retrySync}>
            <Icon name="alertCircle" size={14} color={colors.danger} />
            <Text style={[styles.syncBannerText, { flex: 1 }]}>{t("dashboard.syncError")}</Text>
            <Text style={styles.retryText}>{t("sync.retry")}</Text>
          </Pressable>
        )}

        {!isAuthenticated && (
          <View style={styles.warnBanner}>
            <Icon name="cloud" size={14} color={colors.warning} />
            <Text style={styles.warnBannerText}>{t("dashboard.notBackedUp")}</Text>
          </View>
        )}

        {/* Hero — Net cabinet result */}
        <View style={styles.hero}>
          {/* Subtle top-light for depth */}
          <View style={styles.heroHighlight} pointerEvents="none" />
          <View style={styles.heroTopRow}>
            <Text style={styles.heroLabel}>{t("dashboard.netResult")}</Text>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>{result.tax.regime}</Text>
            </View>
          </View>
          <Text style={[styles.heroAmount, netResult < 0 && { color: "#FF7A84" }]}>
            {formatMAD(netResult)}
          </Text>
          <View style={styles.heroRule}>
            <Text style={styles.heroRuleText}>
              {t("dashboard.recettes")} − {t("dashboard.charges")}
            </Text>
          </View>

          {/* Tappable metrics strip */}
          <View style={styles.heroMetricsStrip}>
            <Pressable
              style={styles.heroMetric}
              onPress={() => { tapLight(); setPendingFilter("RECETTE"); navigation.navigate("Transactions"); }}
            >
              <Text style={styles.heroMetricLabel}>{t("dashboard.recettes")}</Text>
              <Text style={[styles.heroMetricValue, { color: "#6DEDB5" }]}>
                {formatMAD(result.breakdown.totalRecettes)}
              </Text>
            </Pressable>
            <View style={styles.heroMetricSep} />
            <Pressable
              style={styles.heroMetric}
              onPress={() => { tapLight(); setPendingFilter("CHARGE"); navigation.navigate("Transactions"); }}
            >
              <Text style={styles.heroMetricLabel}>{t("dashboard.charges")}</Text>
              <Text style={[styles.heroMetricValue, { color: "#FF8087" }]}>
                {formatMAD(result.breakdown.totalCharges)}
              </Text>
            </Pressable>
            <View style={styles.heroMetricSep} />
            <Pressable
              style={styles.heroMetric}
              onPress={() => { tapLight(); navigation.navigate("Expliquer"); }}
            >
              <Text style={styles.heroMetricLabel}>{t("dashboard.taxShort")}</Text>
              <Text style={styles.heroMetricValue}>
                {formatMAD(result.tax.taxDue)}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── CNOPS / AMO Spotlight ─────────────────────────────────────── */}
        {hasCnops && (
          <View style={styles.cnopsSpotlight}>
            {/* Header row */}
            <View style={styles.cnopsSpotlightHeader}>
              <Icon name="fileCheck" size={11} color="#6b46c1" />
              <Text style={styles.cnopsSpotlightTitle}>
                AMO / CNOPS · {fiscalYear}
              </Text>
              {cnopsStats.pendingCount > 0 && (
                <Pressable
                  style={styles.cnopsResolveBtn}
                  onPress={() => navigation.navigate("Agenda")}
                >
                  <Text style={styles.cnopsResolveBtnText}>Résoudre ›</Text>
                </Pressable>
              )}
            </View>

            {/* KPI row */}
            <View style={styles.cnopsKpiRow}>
              {/* Encaissé */}
              <View style={styles.cnopsKpi}>
                <Text style={[
                  styles.cnopsKpiValue,
                  cnopsStats.receivedTotal > 0 && { color: colors.success },
                ]}>
                  {cnopsStats.receivedTotal > 0 ? formatMAD(cnopsStats.receivedTotal) : "—"}
                </Text>
                <Text style={styles.cnopsKpiLabel}>Encaissé</Text>
                {cnopsStats.receivedCount > 0 && (
                  <Text style={styles.cnopsKpiCount}>
                    {cnopsStats.receivedCount} dossier{cnopsStats.receivedCount > 1 ? "s" : ""}
                  </Text>
                )}
              </View>

              <View style={styles.cnopsKpiDivider} />

              {/* En attente */}
              <View style={styles.cnopsKpi}>
                <Text style={[
                  styles.cnopsKpiValue,
                  cnopsStats.pendingTotal > 0 && { color: "#D97706" },
                ]}>
                  {cnopsStats.pendingTotal > 0 ? formatMAD(cnopsStats.pendingTotal) : "—"}
                </Text>
                <Text style={styles.cnopsKpiLabel}>En attente</Text>
                {cnopsStats.pendingCount > 0 && (
                  <Text style={styles.cnopsKpiCount}>
                    {cnopsStats.pendingCount} dossier{cnopsStats.pendingCount > 1 ? "s" : ""}
                  </Text>
                )}
              </View>

              <View style={styles.cnopsKpiDivider} />

              {/* Refusés */}
              <View style={styles.cnopsKpi}>
                <Text style={[
                  styles.cnopsKpiValue,
                  cnopsStats.rejectedCount > 0 && { color: colors.danger },
                ]}>
                  {cnopsStats.rejectedCount > 0 ? String(cnopsStats.rejectedCount) : "—"}
                </Text>
                <Text style={styles.cnopsKpiLabel}>Refusé</Text>
              </View>
            </View>

            {/* Progress bar — only when both sides have amounts */}
            {cnopsStats.receivedTotal > 0 && cnopsStats.pendingTotal > 0 && (() => {
              const pct = Math.round(
                (cnopsStats.receivedTotal / (cnopsStats.receivedTotal + cnopsStats.pendingTotal)) * 100,
              );
              return (
                <View style={styles.cnopsProgressRow}>
                  <View style={styles.cnopsProgressTrack}>
                    <View
                      style={[
                        styles.cnopsProgressFill,
                        { width: `${pct}%` as `${number}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.cnopsProgressLabel}>{pct}% encaissé</Text>
                </View>
              );
            })()}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <ScalePressable
            scaleTo={0.94}
            style={[styles.quickBtn, styles.quickBtnRecette]}
            onPress={() => { tapLight(); setPendingOpenAdd("RECETTE"); navigation.navigate("Transactions"); }}
          >
            <Icon name="add" size={18} color="#15A876" />
            <Text style={[styles.quickBtnText, { color: "#15A876" }]}>{t("transactions.addRecette")}</Text>
          </ScalePressable>
          <ScalePressable
            scaleTo={0.94}
            style={[styles.quickBtn, styles.quickBtnCharge]}
            onPress={() => { tapLight(); setPendingOpenAdd("CHARGE"); navigation.navigate("Transactions"); }}
          >
            <Icon name="add" size={18} color="#E85B5B" />
            <Text style={[styles.quickBtnText, { color: "#E85B5B" }]}>{t("transactions.addCharge")}</Text>
          </ScalePressable>
        </View>

        {/* Charts */}
        <MonthlyChart data={monthlyData} fiscalYear={fiscalYear} />
        <CategoryDonut slices={categorySlices} totalCharges={result.breakdown.totalCharges} />

        {/* Top patients by consultation revenue */}
        <TopPatientsCard
          transactions={yearTx}
          patients={patients}
          onPress={(patient) => navigation.navigate("Patients", { screen: "PatientDetail", params: { patientId: patient.id } })}
        />

        {/* Cabinet performance card */}
        <View style={styles.breakdownCard}>
          <View style={styles.breakdownHeader}>
            <View style={styles.breakdownDot} />
            <Text style={styles.breakdownTitle}>{t("dashboard.cabinetPerformance")}</Text>
          </View>
          <InfoRow label={t("dashboard.totalRecettes")} value={formatMAD(result.breakdown.totalRecettes)} color={colors.recette} />
          <InfoRow label={t("dashboard.totalCharges")} value={"− " + formatMAD(result.breakdown.totalCharges)} color={colors.charge} />
          <View style={styles.breakdownDivider} />
          <InfoRow label={t("dashboard.netResultShort")} value={formatMAD(netResult)} bold />
        </View>

        {/* Year-over-year comparison */}
        <YoYCard
          fiscalYear={fiscalYear}
          currRecettes={result.breakdown.totalRecettes}
          currCharges={result.breakdown.totalCharges}
          prevRecettes={prevRecettes}
          prevCharges={prevCharges}
          hasPrevData={prevYearTx.length > 0}
        />

        {/* Sections */}
        <RecurringSection />
        <AssetSection />
        <OptimizationSection />

        {/* Action buttons */}
        <ScalePressable
          style={styles.secondaryBtn}
          onPress={() => { tapLight(); setPendingFilter("ALL"); navigation.navigate("Transactions"); }}
        >
          <Text style={styles.secondaryBtnText}>{t("dashboard.manageTransactions")}</Text>
        </ScalePressable>

        <ScalePressable
          style={styles.taxDetailLink}
          onPress={() => { tapLight(); navigation.navigate("Expliquer"); }}
        >
          <Icon name="book" size={12} color={colors.textTertiary} />
          <Text style={styles.taxDetailLinkText}>{t("dashboard.viewTaxDetail")}</Text>
        </ScalePressable>

        </Animated.View>
      </ScrollView>
    </SafeScreen>
  );
}

function InfoRow({ label, value, bold, muted, color, accent }: {
  label: string; value: string; bold?: boolean; muted?: boolean; color?: string; accent?: boolean;
}) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
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

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  // ── Banners ─────────────────────────────────────────────────────────────
  syncBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.lg,
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
    flex: 1,
  },
  retryText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.danger,
    textDecorationLine: "underline",
  },
  warnBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.warningSoft,
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  warnBannerText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.warning,
    flex: 1,
  },
  // ── Shell ────────────────────────────────────────────────────────────────
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 48 },

  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 26, fontWeight: "800" as const, color: colors.textPrimary, letterSpacing: -0.5 },
  headerSub: { ...typography.caption, color: colors.brand, marginTop: 2 },

  // ── Year picker ──────────────────────────────────────────────────────────
  yearPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  yearBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.brandSoft,
  },
  yearBtnDisabled: {
    opacity: 0.35,
  },
  yearCenter: { alignItems: "center", marginHorizontal: spacing.xl },
  yearLabel: { fontSize: 22, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.5 },
  yearSub: { fontSize: 10, color: colors.textTertiary, marginTop: 2, letterSpacing: 0.3 },

  // ── Hero ─────────────────────────────────────────────────────────────────
  hero: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 0,
    marginBottom: spacing.md,
    ...shadows.hero,
    overflow: "hidden",
  },
  // Subtle top-light — creates depth without a gradient library
  heroHighlight: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 80,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  heroLabel: {
    color: colors.textOnDarkMuted,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heroChip: {
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  heroChipText: {
    color: colors.textOnDarkMuted,
    fontSize: 10,
    fontWeight: "600",
  },
  heroAmount: {
    color: colors.textOnDark,
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: -1,
    marginBottom: spacing.xs,
  },
  heroRule: {
    marginBottom: spacing.lg,
  },
  heroRuleText: {
    color: "rgba(255,255,255,0.38)",
    fontSize: 11,
    letterSpacing: 0.3,
  },
  // Metrics strip at base of hero
  heroMetricsStrip: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  heroMetric: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  heroMetricSep: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    marginVertical: spacing.md,
  },
  heroMetricLabel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 9,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 3,
    textAlign: "center",
  },
  heroMetricValue: {
    color: colors.textOnDark,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },

  // ── Stat cards (kept for potential future use) ───────────────────────────
  statsGrid: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, ...shadows.card },
  statLabel: { fontSize: 11, color: colors.textTertiary, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  statCount: { fontSize: 11, color: colors.textTertiary },

  // ── CNOPS / AMO Spotlight ────────────────────────────────────────────────
  cnopsSpotlight: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "#c7b8ed",
    marginBottom: spacing.md,
    overflow: "hidden",
    ...shadows.card,
  },
  cnopsSpotlightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: "#6b46c118",
    borderBottomWidth: 1,
    borderBottomColor: "#c7b8ed",
  },
  cnopsSpotlightTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: "#6b46c1",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  cnopsResolveBtn: {
    backgroundColor: "#6b46c1",
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cnopsResolveBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  cnopsKpiRow: {
    flexDirection: "row",
    paddingVertical: spacing.md,
  },
  cnopsKpi: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  cnopsKpiValue: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  cnopsKpiLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  cnopsKpiCount: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  cnopsKpiDivider: {
    width: 1,
    backgroundColor: "#c7b8ed",
    marginVertical: spacing.xs,
  },
  cnopsProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  cnopsProgressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D97706" + "33",
    overflow: "hidden",
  },
  cnopsProgressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  cnopsProgressLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.success,
  },

  // ── Quick Actions ────────────────────────────────────────────────────────
  quickActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  quickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: radii.lg,
    borderWidth: 1.5,
  },
  quickBtnRecette: {
    backgroundColor: colors.recetteSoft,
    borderColor: colors.recette,
  },
  quickBtnCharge: {
    backgroundColor: colors.chargeSoft,
    borderColor: colors.charge,
  },
  quickBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },

  // ── Breakdown ────────────────────────────────────────────────────────────
  breakdownCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  breakdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand,
  },
  breakdownTitle: {
    ...typography.micro,
    color: colors.brand,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },

  // ── Info rows ────────────────────────────────────────────────────────────
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
  },
  infoLabel: { fontSize: 13, color: colors.textSecondary },
  infoValue: { fontSize: 13, color: colors.textPrimary, fontWeight: "500" },
  infoBold: { fontWeight: "700", fontSize: 14, color: colors.textPrimary },
  infoMuted: { color: colors.textTertiary },

  // ── Actions ──────────────────────────────────────────────────────────────
  secondaryBtn: {
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  secondaryBtnText: { color: colors.brand, fontWeight: "600", fontSize: 14 },
  taxDetailLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  taxDetailLinkText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: "500",
  },
});
