import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useApp } from "../lib/AppContext";
import { useT } from "../lib/useT";
import { analyzeOptimizations, Recommendation } from "../lib/taxOptimizer";
import { Icon } from "../lib/icons";
import { colors, radii, shadows, spacing, typography } from "../lib/theme";

const priorityColors = {
  high: colors.danger,
  medium: colors.warning,
  low: colors.textTertiary,
};

const priorityLabels = {
  high: "Priorité haute",
  medium: "Priorité moyenne",
  low: "Info",
};

const categoryIcons: Record<string, string> = {
  deduction: "💰",
  timing: "⏱️",
  regime: "📊",
  structure: "🏗️",
  compliance: "⚠️",
};

export function OptimizationSection() {
  const { t } = useT();
  const { profile, result, transactions, fiscalYear } = useApp();
  const [expanded, setExpanded] = useState<string | null>(null);

  const recommendations = analyzeOptimizations(profile, result, transactions, fiscalYear);

  if (recommendations.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t("optimization.title")}</Text>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyText}>{t("optimization.allGood")}</Text>
        </View>
      </View>
    );
  }

  const highCount = recommendations.filter(r => r.priority === "high").length;
  const totalSavings = recommendations.reduce((s, r) => s + (r.potentialSavings || 0), 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("optimization.title")}</Text>
      <Text style={styles.subtitle}>
        {recommendations.length} {t("optimization.recommendations")}
        {highCount > 0 ? ` · ${highCount} ${t("optimization.urgent")}` : ""}
        {totalSavings > 0 ? ` · ${t("optimization.potentialSavings")} ${totalSavings.toLocaleString("fr-FR")} MAD` : ""}
      </Text>

      {recommendations.map((rec) => (
        <Pressable
          key={rec.id}
          style={styles.recCard}
          onPress={() => setExpanded(expanded === rec.id ? null : rec.id)}
        >
          <View style={styles.recHeader}>
            <Text style={styles.recIcon}>{categoryIcons[rec.category] || "💡"}</Text>
            <View style={styles.recHeaderText}>
              <Text style={styles.recTitle}>{rec.title}</Text>
              <View style={[styles.priorityBadge, { backgroundColor: priorityColors[rec.priority] }]}>
                <Text style={styles.priorityText}>{priorityLabels[rec.priority]}</Text>
              </View>
            </View>
            {rec.potentialSavings ? (
              <Text style={styles.savingsText}>
                -{rec.potentialSavings.toLocaleString("fr-FR")} MAD
              </Text>
            ) : null}
          </View>

          {expanded === rec.id && (
            <View style={styles.recBody}>
              <Text style={styles.recDescription}>{rec.description}</Text>
              <View style={styles.actionBox}>
                <Text style={styles.actionLabel}>💡 Action recommandée</Text>
                <Text style={styles.actionText}>{rec.action}</Text>
              </View>
            </View>
          )}
        </Pressable>
      ))}
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
    marginBottom: 4,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
  emptyCard: {
    alignItems: "center",
    padding: spacing.lg,
  },
  emptyIcon: { fontSize: 32, marginBottom: spacing.sm },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: "center" },
  recCard: {
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  recIcon: { fontSize: 20 },
  recHeaderText: { flex: 1 },
  recTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  priorityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  savingsText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.success,
  },
  recBody: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  recDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  actionBox: {
    backgroundColor: colors.brandSoft,
    borderRadius: radii.sm,
    padding: spacing.md,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.brand,
    marginBottom: 4,
  },
  actionText: {
    ...typography.caption,
    color: colors.brand,
    lineHeight: 19,
  },
});