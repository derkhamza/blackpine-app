import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { CategorySlice } from "../lib/chartHelpers";
import { colors, radii, shadows, spacing, typography } from "../lib/theme";
import { useT } from "../lib/useT";

interface Props {
  slices: CategorySlice[];
  totalCharges: number;
}

export function CategoryDonut({ slices, totalCharges }: Props) {
 
   const { t } = useT();
  if (slices.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t("dashboard.chargeBreakdown")}</Text>
        <Text style={styles.empty}>{t("dashboard.noCharges")}</Text>
      </View>
    );
  }


  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Build arcs
  let accumulated = 0;
  const arcs = slices.map((slice) => {
    const length = (slice.percentage / 100) * circumference;
    const offset = circumference - length;
    const rotation = (accumulated / 100) * 360 - 90; // -90 to start from top
    accumulated += slice.percentage;
    return { ...slice, length, offset, rotation };
  });

  const formatAmount = (n: number) =>
    Math.round(n).toLocaleString("fr-FR") + "\u00A0MAD";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Répartition des charges</Text>

      <View style={styles.chartRow}>
        <View style={styles.svgContainer}>
          <Svg width={size} height={size}>
            {/* Background circle */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={colors.border}
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Data arcs */}
            {arcs.map((arc) => (
              <G
                key={arc.id}
                rotation={arc.rotation}
                origin={`${center}, ${center}`}
              >
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={arc.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${arc.length} ${arc.offset}`}
                  strokeLinecap="butt"
                  fill="none"
                />
              </G>
            ))}
          </Svg>
          {/* Center label */}
          <View style={styles.centerLabel}>
            <Text style={styles.centerAmount}>
              {Math.round(totalCharges / 1000)}k
            </Text>
            <Text style={styles.centerUnit}>MAD</Text>
          </View>
        </View>

        <View style={styles.legend}>
          {slices.map((slice) => (
            <View key={slice.id} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
              <View style={styles.legendText}>
                <Text style={styles.legendLabel} numberOfLines={1}>
                  {slice.label}
                </Text>
                <Text style={styles.legendValue}>
                  {slice.percentage}% · {formatAmount(slice.amount)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  title: {
    ...typography.micro,
    color: colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: spacing.lg,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  svgContainer: {
    width: 160,
    height: 160,
    justifyContent: "center",
    alignItems: "center",
  },
  centerLabel: {
    position: "absolute",
    alignItems: "center",
  },
  centerAmount: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  centerUnit: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: "600",
  },
  legend: {
    flex: 1,
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  legendValue: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  empty: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
});