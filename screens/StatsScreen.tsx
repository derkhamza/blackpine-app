import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "../components/SafeScreen";
import { useCabinet } from "../lib/CabinetContext";
import { useApp } from "../lib/AppContext";
import { radii, shadows, spacing, typography, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { formatMAD } from "../lib/format";
import { Icon } from "../lib/icons";
import { useT } from "../lib/useT";

// ── Constants ────────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const TYPE_LABELS: Record<string, string> = {
  consultation: "Consultation",
  suivi:        "Suivi",
  procedure:    "Procédure",
  urgence:      "Urgence",
  autre:        "Autre",
};

function fmtDateShort(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function fmtDateLong(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });
}

// ── Screen ───────────────────────────────────────────────────────────────────

export function StatsScreen({ navigation }: { navigation?: any }) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const topInset = useTopInset();
  const { t } = useT();
  // When rendered as a segment inside FinancesScreen, navigation is absent — hide the header.
  const standalone = !!navigation;

  const { appointments, patients } = useCabinet();
  const { transactions } = useApp();

  const now      = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.toISOString().slice(0, 7);

  // ── Core datasets ──────────────────────────────────────────────────────────

  const completedAppts = useMemo(
    () => appointments.filter(a => a.status === "completed"),
    [appointments],
  );

  // ── Hero ───────────────────────────────────────────────────────────────────

  const totalConsultations = completedAppts.length;

  const firstDate = useMemo(
    () => completedAppts.length > 0
      ? completedAppts.reduce((min, a) => (a.date < min ? a.date : min), completedAppts[0].date)
      : null,
    [completedAppts],
  );

  // ── Cette année ────────────────────────────────────────────────────────────

  const thisYearAppts = useMemo(
    () => completedAppts.filter(a => a.date.startsWith(String(thisYear))),
    [completedAppts, thisYear],
  );

  const thisYearRevenue = useMemo(
    () => transactions
      .filter(tx => tx.date.startsWith(String(thisYear)) && tx.type === "RECETTE")
      .reduce((sum, tx) => sum + tx.amount, 0),
    [transactions, thisYear],
  );

  const thisYearUniqPatients = useMemo(
    () => new Set(thisYearAppts.map(a => a.patientId ?? a.patientName)).size,
    [thisYearAppts],
  );

  // ── Records ────────────────────────────────────────────────────────────────

  const bestDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of completedAppts) map[a.date] = (map[a.date] ?? 0) + 1;
    const entries = Object.entries(map);
    if (entries.length === 0) return null;
    const [date, count] = entries.reduce((best, e) => (e[1] > best[1] ? e : best));
    return { date, count };
  }, [completedAppts]);

  const mostLoyal = useMemo(() => {
    const map: Record<string, { name: string; count: number }> = {};
    for (const a of completedAppts) {
      const key = a.patientId ?? a.patientName;
      if (!map[key]) map[key] = { name: a.patientName, count: 0 };
      map[key].count++;
    }
    const entries = Object.values(map);
    if (entries.length === 0) return null;
    return entries.reduce((best, e) => (e.count > best.count ? e : best));
  }, [completedAppts]);

  const topType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of completedAppts) map[a.type] = (map[a.type] ?? 0) + 1;
    const entries = Object.entries(map);
    if (entries.length === 0) return null;
    return entries.reduce((best, e) => (e[1] > best[1] ? e : best));
  }, [completedAppts]);

  // ── Weekday distribution ───────────────────────────────────────────────────

  const weekdayCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0]; // Mon … Sun
    for (const a of completedAppts) {
      const d = new Date(a.date + "T12:00:00").getDay(); // 0=Sun
      counts[d === 0 ? 6 : d - 1]++;
    }
    return counts;
  }, [completedAppts]);
  const maxWeekday = Math.max(...weekdayCounts, 1);

  // ── Patient portfolio ──────────────────────────────────────────────────────

  const totalPatients   = patients.length;
  const newThisMonth    = patients.filter(p => p.createdAt?.startsWith(thisMonth)).length;
  const cnopsPatients   = patients.filter(p => !!p.cnopsNumber).length;

  const returnRate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of completedAppts) {
      const key = a.patientId ?? a.patientName;
      map[key] = (map[key] ?? 0) + 1;
    }
    const total = Object.keys(map).length;
    if (total === 0) return 0;
    const returning = Object.values(map).filter(c => c > 1).length;
    return Math.round((returning / total) * 100);
  }, [completedAppts]);

  // ── Type breakdown ─────────────────────────────────────────────────────────

  const typeBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of completedAppts) map[a.type] = (map[a.type] ?? 0) + 1;
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [completedAppts]);
  const maxTypeCount = typeBreakdown[0]?.[1] ?? 1;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      {/* Header */}
      {standalone ? (
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
            <Icon name="back" size={22} color={colors.brand} />
          </Pressable>
          <Text style={styles.headerTitle}>Votre cabinet en chiffres</Text>
          <View style={{ width: 40 }} />
        </View>
      ) : (
        <View style={styles.tabHeader}>
          <Text style={styles.tabHeaderTitle}>{t("finances.activity")}</Text>
          <Text style={styles.tabHeaderSub}>{thisYear}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.heroHighlight} pointerEvents="none" />
          <Text style={styles.heroLabel}>Consultations réalisées</Text>
          <Text style={styles.heroNumber}>
            {totalConsultations.toLocaleString("fr-FR")}
          </Text>
          {firstDate ? (
            <Text style={styles.heroSub}>
              depuis le {fmtDateLong(firstDate)}
            </Text>
          ) : (
            <Text style={styles.heroSub}>Aucune consultation enregistrée</Text>
          )}
        </View>

        {/* ── Cette année ──────────────────────────────────────────────── */}
        <SectionCard title={`Cette année · ${thisYear}`} colors={colors}>
          <View style={styles.kpiRow}>
            <View style={styles.kpi}>
              <Text style={[styles.kpiValue, { color: colors.recette }]}>
                {thisYearRevenue > 0 ? formatMAD(thisYearRevenue) : "—"}
              </Text>
              <Text style={styles.kpiLabel}>Recettes</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpi}>
              <Text style={[styles.kpiValue, { color: colors.brand }]}>
                {thisYearAppts.length > 0 ? String(thisYearAppts.length) : "—"}
              </Text>
              <Text style={styles.kpiLabel}>Consultations</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpi}>
              <Text style={styles.kpiValue}>
                {thisYearUniqPatients > 0 ? String(thisYearUniqPatients) : "—"}
              </Text>
              <Text style={styles.kpiLabel}>Patients vus</Text>
            </View>
          </View>
        </SectionCard>

        {/* ── Records ──────────────────────────────────────────────────── */}
        {totalConsultations > 0 && (
          <SectionCard title="Vos records" colors={colors}>
            <RecordRow
              icon="calendar"
              iconBg={colors.brandSoft}
              iconColor={colors.brand}
              label="Meilleure journée"
              value={bestDay
                ? `${bestDay.count} consultation${bestDay.count > 1 ? "s" : ""} · ${fmtDateShort(bestDay.date)}`
                : "—"}
              colors={colors}
            />
            {mostLoyal && mostLoyal.count > 1 && (
              <>
                <View style={styles.recordDivider} />
                <RecordRow
                  icon="users"
                  iconBg={colors.successSoft}
                  iconColor={colors.success}
                  label="Patient le plus fidèle"
                  value={`${mostLoyal.name.split(" ")[0]} · ${mostLoyal.count} visites`}
                  colors={colors}
                />
              </>
            )}
            {topType && (
              <>
                <View style={styles.recordDivider} />
                <RecordRow
                  icon="stethoscope"
                  iconBg={colors.gold + "18"}
                  iconColor={colors.gold}
                  label="Acte le plus fréquent"
                  value={`${TYPE_LABELS[topType[0]] ?? topType[0]} · ${topType[1]}x`}
                  colors={colors}
                />
              </>
            )}
          </SectionCard>
        )}

        {/* ── Répartition hebdomadaire ──────────────────────────────────── */}
        {totalConsultations > 0 && (
          <SectionCard title="Jours les plus actifs" colors={colors}>
            <View style={styles.weekChart}>
              {weekdayCounts.map((count, idx) => {
                const heightPct = count / maxWeekday;
                const isPeak    = count === maxWeekday && count > 0;
                return (
                  <View key={idx} style={styles.weekBarWrap}>
                    <View style={styles.weekBarTrack}>
                      <View
                        style={[
                          styles.weekBarFill,
                          {
                            height: `${Math.max(heightPct * 100, count > 0 ? 6 : 0)}%` as `${number}%`,
                            backgroundColor: isPeak ? colors.brand : colors.brand + "55",
                          },
                        ]}
                      />
                    </View>
                    {count > 0 && (
                      <Text style={[styles.weekBarCount, isPeak && { color: colors.brand, fontWeight: "800" }]}>
                        {count}
                      </Text>
                    )}
                    <Text style={[styles.weekBarLabel, isPeak && { color: colors.brand, fontWeight: "700" }]}>
                      {WEEKDAY_LABELS[idx]}
                    </Text>
                  </View>
                );
              })}
            </View>
          </SectionCard>
        )}

        {/* ── Portefeuille patients ─────────────────────────────────────── */}
        <SectionCard title="Portefeuille patients" colors={colors}>
          <View style={styles.kpiRow}>
            <View style={styles.kpi}>
              <Text style={[styles.kpiValue, { color: colors.brand }]}>
                {totalPatients > 0 ? String(totalPatients) : "—"}
              </Text>
              <Text style={styles.kpiLabel}>Enregistrés</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpi}>
              <Text style={[styles.kpiValue, newThisMonth > 0 && { color: colors.success }]}>
                {newThisMonth > 0 ? `+${newThisMonth}` : "—"}
              </Text>
              <Text style={styles.kpiLabel}>Ce mois</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpi}>
              <Text style={[styles.kpiValue, cnopsPatients > 0 && { color: "#6b46c1" }]}>
                {cnopsPatients > 0 ? String(cnopsPatients) : "—"}
              </Text>
              <Text style={styles.kpiLabel}>AMO/CNOPS</Text>
            </View>
          </View>

          {returnRate > 0 && (
            <View style={styles.returnRateRow}>
              <View style={styles.returnRateHeader}>
                <Text style={styles.returnRateLabel}>Taux de fidélisation</Text>
                <Text style={[
                  styles.returnRatePct,
                  { color: returnRate >= 50 ? colors.success : returnRate >= 25 ? colors.gold : colors.textSecondary },
                ]}>
                  {returnRate}%
                </Text>
              </View>
              <View style={styles.returnRateTrack}>
                <View
                  style={[
                    styles.returnRateFill,
                    {
                      width: `${returnRate}%` as `${number}%`,
                      backgroundColor: returnRate >= 50 ? colors.success : returnRate >= 25 ? colors.gold : colors.textTertiary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.returnRateSub}>
                patients avec plusieurs consultations
              </Text>
            </View>
          )}
        </SectionCard>

        {/* ── Par type d'acte ───────────────────────────────────────────── */}
        {typeBreakdown.length > 0 && (
          <SectionCard title="Par type d'acte" colors={colors}>
            {typeBreakdown.map(([type, count], idx) => (
              <View key={type}>
                {idx > 0 && <View style={styles.typeBarDivider} />}
                <View style={styles.typeBarRow}>
                  <Text style={styles.typeBarLabel}>
                    {TYPE_LABELS[type] ?? type}
                  </Text>
                  <View style={styles.typeBarTrack}>
                    <View
                      style={[
                        styles.typeBarFill,
                        { width: `${Math.round((count / maxTypeCount) * 100)}%` as `${number}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.typeBarCount}>{count}</Text>
                </View>
              </View>
            ))}
          </SectionCard>
        )}
      </ScrollView>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({
  title,
  colors,
  children,
}: {
  title: string;
  colors: ColorPalette;
  children: React.ReactNode;
}) {
const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function RecordRow({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  colors,
}: {
  icon: any;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  colors: ColorPalette;
}) {
const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.recordRow}>
      <View style={[styles.recordIcon, { backgroundColor: iconBg }]}>
        <Icon name={icon} size={15} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.recordLabel}>{label}</Text>
        <Text style={styles.recordValue}>{value}</Text>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.card,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radii.md,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.brandSoft,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17, fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    marginHorizontal: spacing.sm,
    letterSpacing: -0.3,
  },
  tabHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabHeaderTitle: { fontSize: 26, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.5 },
  tabHeaderSub: { ...typography.caption, color: colors.brand, marginTop: 2 },

  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    overflow: "hidden",
    ...shadows.hero,
  },
  heroHighlight: {
    position: "absolute",
    top: 0, left: 0, right: 0, height: 80,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  heroLabel: {
    fontSize: 11, fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase", letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  heroNumber: {
    fontSize: 52, fontWeight: "800",
    color: colors.textOnDark,
    letterSpacing: -2,
    lineHeight: 58,
  },
  heroSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    marginTop: spacing.xs,
    fontWeight: "500",
  },

  // ── Section cards ─────────────────────────────────────────────────────────
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadows.card,
  },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: "700",
    color: colors.brand,
    textTransform: "uppercase", letterSpacing: 0.5,
  },

  // ── KPI row ───────────────────────────────────────────────────────────────
  kpiRow: {
    flexDirection: "row",
    paddingVertical: spacing.md,
  },
  kpi: {
    flex: 1, alignItems: "center", gap: 4,
  },
  kpiValue: {
    fontSize: 20, fontWeight: "800",
    color: colors.textPrimary, letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 9, fontWeight: "600",
    color: colors.textTertiary,
    textTransform: "uppercase", letterSpacing: 0.4,
  },
  kpiDivider: {
    width: 1, backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },

  // ── Records ───────────────────────────────────────────────────────────────
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  recordDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  recordIcon: {
    width: 36, height: 36, borderRadius: radii.md,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  recordLabel: {
    fontSize: 11, fontWeight: "600",
    color: colors.textTertiary,
    textTransform: "uppercase", letterSpacing: 0.3,
    marginBottom: 2,
  },
  recordValue: {
    fontSize: 14, fontWeight: "700",
    color: colors.textPrimary,
  },

  // ── Weekday bar chart ─────────────────────────────────────────────────────
  weekChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 4,
    height: 120,
  },
  weekBarWrap: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    height: "100%",
    justifyContent: "flex-end",
  },
  weekBarTrack: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
    borderRadius: 4,
    overflow: "hidden",
  },
  weekBarFill: {
    width: "100%",
    borderRadius: 4,
    minHeight: 0,
  },
  weekBarCount: {
    fontSize: 10, fontWeight: "600",
    color: colors.textTertiary,
  },
  weekBarLabel: {
    fontSize: 10, fontWeight: "600",
    color: colors.textTertiary,
  },

  // ── Return rate ───────────────────────────────────────────────────────────
  returnRateRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  returnRateHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  returnRateLabel: {
    fontSize: 12, fontWeight: "600",
    color: colors.textSecondary,
  },
  returnRatePct: {
    fontSize: 14, fontWeight: "800",
  },
  returnRateTrack: {
    height: 6, borderRadius: 3,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  returnRateFill: {
    height: "100%", borderRadius: 3,
  },
  returnRateSub: {
    fontSize: 10, color: colors.textTertiary,
    fontWeight: "500",
  },

  // ── Type breakdown ────────────────────────────────────────────────────────
  typeBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  typeBarDivider: {
    height: 1, backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  typeBarLabel: {
    fontSize: 13, fontWeight: "600",
    color: colors.textSecondary,
    width: 90, flexShrink: 0,
  },
  typeBarTrack: {
    flex: 1, height: 8,
    borderRadius: 4,
    backgroundColor: colors.brandSoft,
    overflow: "hidden",
  },
  typeBarFill: {
    height: "100%", borderRadius: 4,
    backgroundColor: colors.brand,
  },
  typeBarCount: {
    fontSize: 12, fontWeight: "700",
    color: colors.brand,
    width: 28, textAlign: "right",
    flexShrink: 0,
  },
});
