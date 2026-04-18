import { Dimensions, StyleSheet, Text, View } from "react-native";
import { BarChart } from "react-native-chart-kit";
import { MonthlyData } from "../lib/chartHelpers";
import { colors, radii, shadows, spacing, typography } from "../lib/theme";

interface Props {
  data: MonthlyData[];
}

export function MonthlyChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Activité mensuelle</Text>
        <Text style={styles.empty}>Pas encore de données mensuelles</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get("window").width - 32 - 32; // padding

  const chartData = {
    labels: data.map((m) => m.label),
    datasets: [
      {
        data: data.map((m) => m.recettes / 1000), // in thousands for readability
        color: () => colors.recette,
      },
      {
        data: data.map((m) => m.charges / 1000),
        color: () => colors.charge,
      },
    ],
    legend: ["Recettes (k MAD)", "Charges (k MAD)"],
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Activité mensuelle · 2026</Text>
      <BarChart
        data={chartData}
        width={screenWidth}
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
          color: (opacity = 1) => `rgba(31, 58, 46, ${opacity})`,
          labelColor: () => colors.textSecondary,
          barPercentage: 0.4,
          propsForBackgroundLines: {
            stroke: colors.border,
            strokeDasharray: "",
          },
        }}
        style={styles.chart}
      />
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