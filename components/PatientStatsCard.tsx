import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Patient } from "../lib/cabinetTypes";
import { useT } from "../lib/useT";
import { radii, spacing, typography, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { calcAge } from "../lib/patientHelpers";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  patients: Patient[];
  /** Appointment count by patient id */
  apptCountMap: Record<string, number>;
}

// ─── Mini horizontal bar ──────────────────────────────────────────────────────

function MiniBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const bar = makeBarStyles(useColors());
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const barWidth = `${pct}%` as `${number}%`;

  return (
    <View style={bar.row}>
      <Text style={bar.label}>{label}</Text>
      <View style={bar.track}>
        <View style={[bar.fill, { width: barWidth, backgroundColor: color }]} />
      </View>
      <Text style={[bar.pct, { color }]}>{pct}%</Text>
    </View>
  );
}

const makeBarStyles = (colors: ColorPalette) => StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 5,
  },
  label: {
    width: 34,
    fontSize: 10,
    fontWeight: "600",
    color: colors.textTertiary,
    textAlign: "right",
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  pct: {
    width: 32,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "right",
  },
});

// ─── Main component ───────────────────────────────────────────────────────────

export function PatientStatsCard({ patients, apptCountMap }: Props) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    let newThisMonth = 0;
    let active = 0;
    let totalAge = 0;
    let ageCount = 0;

    // Gender counts
    let male = 0, female = 0, genderUnknown = 0;

    // Age bucket counts
    let pediatric = 0, adult = 0, senior = 0, ageUnknown = 0;

    for (const p of patients) {
      // New this month
      if (p.createdAt >= monthStart) newThisMonth++;

      // Active (has ≥1 appointment)
      if ((apptCountMap[p.id] ?? 0) > 0) active++;

      // Gender
      if (p.gender === "M") male++;
      else if (p.gender === "F") female++;
      else genderUnknown++;

      // Age
      const age = calcAge(p.dateOfBirth);
      if (age !== null) {
        totalAge += age;
        ageCount++;
        if (age < 16) pediatric++;
        else if (age <= 60) adult++;
        else senior++;
      } else {
        ageUnknown++;
      }
    }

    const avgAge = ageCount > 0 ? Math.round(totalAge / ageCount) : null;

    return {
      total: patients.length,
      newThisMonth,
      active,
      avgAge,
      male,
      female,
      genderUnknown,
      pediatric,
      adult,
      senior,
      ageUnknown,
    };
  }, [patients, apptCountMap]);

  if (patients.length === 0) return null;

  const gTotal = stats.male + stats.female + stats.genderUnknown;
  const aTotal = stats.pediatric + stats.adult + stats.senior + stats.ageUnknown;

  return (
    <View style={styles.card}>

      {/* ── Top strip: 4 KPIs ── */}
      <View style={styles.strip}>
        <View style={styles.kpi}>
          <Text style={styles.kpiValue}>{stats.total}</Text>
          <Text style={styles.kpiLabel}>{t("patients.statsTotal")}</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpi}>
          <Text style={[styles.kpiValue, { color: colors.brand }]}>
            +{stats.newThisMonth}
          </Text>
          <Text style={styles.kpiLabel}>{t("patients.statsNew")}</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpi}>
          <Text style={[styles.kpiValue, { color: colors.success }]}>
            {stats.active}
          </Text>
          <Text style={styles.kpiLabel}>{t("patients.statsActive")}</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpi}>
          <Text style={[styles.kpiValue, { color: colors.gold }]}>
            {stats.avgAge !== null ? stats.avgAge : "—"}
          </Text>
          <Text style={styles.kpiLabel}>
            {t("patients.statsAvgAge")}
            {stats.avgAge !== null ? ` (${t("patients.statsYears")})` : ""}
          </Text>
        </View>
      </View>

      {/* ── Demographics row ── */}
      <View style={styles.demoRow}>

        {/* Gender */}
        <View style={styles.demoCard}>
          <Text style={styles.demoTitle}>{t("patients.statsGender")}</Text>
          <MiniBar
            label={t("patients.statsMale")}
            value={stats.male}
            total={gTotal}
            color={colors.brand}
          />
          <MiniBar
            label={t("patients.statsFemale")}
            value={stats.female}
            total={gTotal}
            color="#E07AC0"
          />
          {stats.genderUnknown > 0 && (
            <MiniBar
              label={t("patients.statsUnknown")}
              value={stats.genderUnknown}
              total={gTotal}
              color={colors.textTertiary}
            />
          )}
        </View>

        <View style={styles.demoDivider} />

        {/* Age buckets */}
        <View style={styles.demoCard}>
          <Text style={styles.demoTitle}>{t("patients.statsAgeGroups")}</Text>
          <MiniBar
            label={t("patients.statsPediatric")}
            value={stats.pediatric}
            total={aTotal}
            color={colors.recette}
          />
          <MiniBar
            label={t("patients.statsAdult")}
            value={stats.adult}
            total={aTotal}
            color={colors.brand}
          />
          <MiniBar
            label={t("patients.statsSenior")}
            value={stats.senior}
            total={aTotal}
            color={colors.gold}
          />
        </View>

      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },

  // KPI strip
  strip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    backgroundColor: colors.brandSoft,
  },
  kpi: {
    flex: 1,
    alignItems: "center",
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  kpiLabel: {
    ...typography.micro,
    color: colors.textTertiary,
    textAlign: "center",
    marginTop: 2,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  kpiDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },

  // Demographics section
  demoRow: {
    flexDirection: "row",
    padding: spacing.md,
    gap: spacing.md,
  },
  demoCard: {
    flex: 1,
  },
  demoDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  demoTitle: {
    ...typography.micro,
    color: colors.brand,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    fontSize: 9,
  },
});
