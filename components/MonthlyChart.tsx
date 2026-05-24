import { useMemo } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { BarChart } from "react-native-chart-kit";
import { MonthlyData } from "../lib/chartHelpers";
import { radii, shadows, spacing, typography, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { useT } from "../lib/useT";

interface Props {
  data: MonthlyData[];
  fiscalYear?: number;
}

export function MonthlyChart({ data, fiscalYear }: Props) {
  const colors = useColors();const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();
  const { width } = useWindowDimensions();
  const chartWidth = width - 32 - 32; // account for screen padding

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t("dashboard.monthlyActivity")}</Text>
        <Text style={styles.empty}>{t("dashboard.noMonthlyData")}</Text>
      </View>
    );
  }

  const chartData = {
    labels: data.map((m) => m.label),
    datasets: [
      { data: data.map((m) => m.recettes / 1000), color: () => colors.recette },
      { data: data.map((m) => m.charges / 1000), color: () => colors.charge },
    ],
    legend: [t("dashboard.recettes") + " (k MAD)", t("dashboard.charges") + " (k MAD)"],
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {t("dashboard.monthlyActivity")} · {fiscalYear ?? new Date().getFullYear()}
      </Text>
      <BarChart
        data={chartData}
        width={chartWidth}
        height={200}
        yAxisSuffix="k"
        yAxisLabel=""
        fromZero
        showValuesOnTopOfBars={false}
        chartConfig={{
          backgroundColor: colors.surface,
          backgroundGradientFrom: colors.surface,
          backgroundGradientTo: colors.surface,
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(24, 144, 197, ${opacity})`,
          labelColor: () => colors.textTertiary,
          barPercentage: 0.45,
          propsForBackgroundLines: {
            stroke: colors.border,
            strokeDasharray: "4,4",
          },
          style: { borderRadius: 12 },
        }}
        style={styles.chart}
      />
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  title: {
    ...typography.micro,
    color: colors.brand,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.md,
  },
  chart: {
    marginLeft: -16,
    borderRadius: radii.sm,
  },
  empty: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
});
