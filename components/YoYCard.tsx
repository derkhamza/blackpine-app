import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ColorPalette, radii, shadows, spacing, typography } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { formatMAD } from "../lib/format";
import { useT } from "../lib/useT";
import { Icon } from "../lib/icons";

interface YoYCardProps {
  /** Current (selected) fiscal year */
  fiscalYear: number;
  currRecettes: number;
  currCharges: number;
  prevRecettes: number;
  prevCharges: number;
  /** True when the prior year has at least one transaction */
  hasPrevData: boolean;
}

interface DeltaResult {
  pct: number | null;   // null when prev = 0
  positive: boolean;    // whether the change is directionally good
  up: boolean;          // numerical direction
}

/** Compute % change and directional "goodness" for each metric. */
function delta(curr: number, prev: number, higherIsBetter: boolean): DeltaResult {
  if (prev === 0) return { pct: null, positive: true, up: curr > 0 };
  const pct = ((curr - prev) / Math.abs(prev)) * 100;
  const up = pct >= 0;
  return { pct, positive: higherIsBetter ? up : !up, up };
}

function DeltaBadge({ d }: { d: DeltaResult }) {
  const colors = useColors();
  if (d.pct === null) return null;
  const color = d.positive ? colors.success : colors.danger;
  const bg = d.positive ? colors.successSoft : colors.dangerSoft;
  const arrow = d.up ? "▲" : "▼";
  const label = `${arrow} ${Math.abs(Math.round(d.pct))}%`;
  return (
    <View style={[badgeStyles.pill, { backgroundColor: bg }]}>
      <Text style={[badgeStyles.text, { color }]}>{label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  pill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  text: { fontSize: 10, fontWeight: "700" },
});

export function YoYCard({
  fiscalYear,
  currRecettes,
  currCharges,
  prevRecettes,
  prevCharges,
  hasPrevData,
}: YoYCardProps) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();

  const currNet = currRecettes - currCharges;
  const prevNet = prevRecettes - prevCharges;

  const dRecettes = delta(currRecettes, prevRecettes, true);
  const dCharges  = delta(currCharges,  prevCharges,  false); // lower charges = better
  const dNet      = delta(currNet,      prevNet,      true);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerDot} />
          <Text style={styles.headerTitle}>{t("dashboard.yoyTitle")}</Text>
        </View>
        <View style={styles.yearChip}>
          <Text style={styles.yearChipText}>
            {fiscalYear - 1} → {fiscalYear}
          </Text>
        </View>
      </View>

      {!hasPrevData ? (
        /* Empty state */
        <View style={styles.emptyRow}>
          <Icon name="barChart" size={14} color={colors.textTertiary} />
          <Text style={styles.emptyText}>{t("dashboard.yoyNoData")}</Text>
        </View>
      ) : (
        <>
          <CompareRow
            label={t("dashboard.recettes")}
            dotColor={colors.recette}
            prev={prevRecettes}
            curr={currRecettes}
            d={dRecettes}
            colors={colors}
          />
          <View style={styles.divider} />
          <CompareRow
            label={t("dashboard.charges")}
            dotColor={colors.charge}
            prev={prevCharges}
            curr={currCharges}
            d={dCharges}
            colors={colors}
          />
          <View style={styles.divider} />
          <CompareRow
            label={t("dashboard.netResultShort")}
            dotColor={colors.brand}
            prev={prevNet}
            curr={currNet}
            d={dNet}
            colors={colors}
            bold
          />
        </>
      )}
    </View>
  );
}

function CompareRow({
  label, dotColor, prev, curr, d, colors, bold,
}: {
  label: string;
  dotColor: string;
  prev: number;
  curr: number;
  d: DeltaResult;
  colors: ColorPalette;
  bold?: boolean;
}) {
  return (
    <View style={rowStyles.row}>
      {/* Label side */}
      <View style={rowStyles.labelSide}>
        <View style={[rowStyles.dot, { backgroundColor: dotColor }]} />
        <Text style={[rowStyles.label, { color: colors.textSecondary }, bold && rowStyles.labelBold]}>
          {label}
        </Text>
      </View>
      {/* Numbers side */}
      <View style={rowStyles.numSide}>
        {/* Prior year — small + muted */}
        <Text style={[rowStyles.prevVal, { color: colors.textTertiary }]}>
          {formatMAD(prev, { showCurrency: false })}
        </Text>
        <Text style={[rowStyles.arrow, { color: colors.textTertiary }]}>→</Text>
        {/* Current year — bold */}
        <Text style={[rowStyles.currVal, { color: colors.textPrimary }, bold && rowStyles.currBold]}>
          {formatMAD(curr, { showCurrency: false })}
        </Text>
        <DeltaBadge d={d} />
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  labelSide: { flexDirection: "row", alignItems: "center", gap: 7, flex: 1 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: { fontSize: 12, fontWeight: "500" },
  labelBold: { fontWeight: "700", fontSize: 13 },
  numSide: { flexDirection: "row", alignItems: "center", gap: 4 },
  prevVal: { fontSize: 11, fontWeight: "400" },
  arrow: { fontSize: 11 },
  currVal: { fontSize: 12, fontWeight: "600" },
  currBold: { fontSize: 13, fontWeight: "700" },
});

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand,
  },
  headerTitle: {
    ...typography.micro,
    color: colors.brand,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  yearChip: {
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  yearChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.brand,
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  emptyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: spacing.md,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: "italic",
  },
});
