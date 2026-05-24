import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Appointment } from "../lib/cabinetTypes";
import { Icon } from "../lib/icons";
import { radii, shadows, spacing, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { formatMAD } from "../lib/format";

// ─── Constants ───────────────────────────────────────────────────────────────

const CNOPS_PURPLE = "#6b46c1";
const CNOPS_SOFT   = "#f5f0ff";
const CNOPS_BORDER = "#c7b8ed";

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  /** Appointments already scoped to the current fiscal year */
  appointments: Appointment[];
  /** Called when the user taps the pending-amount area — use to navigate to pending list */
  onPressPending?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ReimbursementsCard({ appointments, onPressPending }: Props) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);

  const stats = useMemo(() => {
    let pendingCount = 0;
    let pendingTotal = 0;
    let receivedCount = 0;
    let receivedTotal = 0;
    let rejectedCount = 0;

    for (const a of appointments) {
      if (!a.reimbursementStatus) continue;
      const amt = a.reimbursementAmount ?? 0;
      if (a.reimbursementStatus === "pending") {
        pendingCount++;
        pendingTotal += amt;
      } else if (a.reimbursementStatus === "received") {
        receivedCount++;
        receivedTotal += amt;
      } else if (a.reimbursementStatus === "rejected") {
        rejectedCount++;
      }
    }

    return { pendingCount, pendingTotal, receivedCount, receivedTotal, rejectedCount };
  }, [appointments]);

  const total = stats.pendingCount + stats.receivedCount + stats.rejectedCount;
  if (total === 0) return null;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="fileCheck" size={13} color={CNOPS_PURPLE} />
          <View>
            <Text style={styles.headerTitle}>Remboursements AMO / CNOPS</Text>
            {stats.pendingCount > 0 && (
              <Text style={styles.headerPendingHint}>
                {formatMAD(stats.pendingTotal)} en attente d'encaissement
              </Text>
            )}
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{total} dossier{total > 1 ? "s" : ""}</Text>
          </View>
          {stats.pendingCount > 0 && onPressPending && (
            <Pressable style={styles.resolveBtn} onPress={onPressPending}>
              <Text style={styles.resolveBtnText}>Résoudre</Text>
              <Text style={styles.resolveBtnArrow}>›</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* KPI row */}
      <View style={styles.kpiRow}>
        {/* En attente */}
        <View style={styles.kpi}>
          <View style={[styles.kpiDot, { backgroundColor: "#D97706" }]} />
          <Text style={styles.kpiValue}>
            {stats.pendingCount > 0 ? formatMAD(stats.pendingTotal) : "—"}
          </Text>
          <Text style={styles.kpiLabel}>En attente</Text>
          {stats.pendingCount > 0 && (
            <Text style={styles.kpiCount}>{stats.pendingCount} dossier{stats.pendingCount > 1 ? "s" : ""}</Text>
          )}
        </View>

        <View style={styles.kpiDivider} />

        {/* Reçu */}
        <View style={styles.kpi}>
          <View style={[styles.kpiDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.kpiValue, stats.receivedCount > 0 && { color: colors.success }]}>
            {stats.receivedCount > 0 ? formatMAD(stats.receivedTotal) : "—"}
          </Text>
          <Text style={styles.kpiLabel}>Reçu</Text>
          {stats.receivedCount > 0 && (
            <Text style={styles.kpiCount}>{stats.receivedCount} dossier{stats.receivedCount > 1 ? "s" : ""}</Text>
          )}
        </View>

        <View style={styles.kpiDivider} />

        {/* Refusé */}
        <View style={styles.kpi}>
          <View style={[styles.kpiDot, { backgroundColor: colors.danger }]} />
          <Text style={[styles.kpiValue, stats.rejectedCount > 0 && { color: colors.danger }]}>
            {stats.rejectedCount > 0 ? String(stats.rejectedCount) : "—"}
          </Text>
          <Text style={styles.kpiLabel}>Refusé</Text>
        </View>
      </View>

      {/* Pending bar (visual proportion) */}
      {stats.pendingCount > 0 && stats.receivedCount > 0 && (
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round((stats.receivedTotal / (stats.receivedTotal + stats.pendingTotal)) * 100)}%` as `${number}%`,
                  backgroundColor: colors.success,
                },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {Math.round((stats.receivedTotal / (stats.receivedTotal + stats.pendingTotal)) * 100)}% encaissé
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: CNOPS_BORDER,
      marginBottom: spacing.md,
      overflow: "hidden",
      ...shadows.card,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      backgroundColor: CNOPS_SOFT,
      borderBottomWidth: 1,
      borderBottomColor: CNOPS_BORDER,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 6,
      flex: 1,
    },
    headerRight: {
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 4,
      flexShrink: 0,
    },
    headerTitle: {
      fontSize: 11,
      fontWeight: "700",
      color: CNOPS_PURPLE,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    headerPendingHint: {
      fontSize: 10,
      color: CNOPS_PURPLE + "BB",
      marginTop: 2,
      fontWeight: "600",
    },
    countBadge: {
      backgroundColor: CNOPS_PURPLE + "18",
      borderRadius: radii.pill,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderWidth: 1,
      borderColor: CNOPS_BORDER,
    },
    countBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: CNOPS_PURPLE,
    },
    resolveBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      backgroundColor: CNOPS_PURPLE,
      borderRadius: radii.pill,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    resolveBtnText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#fff",
    },
    resolveBtnArrow: {
      fontSize: 12,
      color: "#fff",
      lineHeight: 14,
    },

    kpiRow: {
      flexDirection: "row",
      paddingVertical: spacing.md,
    },
    kpi: {
      flex: 1,
      alignItems: "center",
      gap: 3,
    },
    kpiDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      marginBottom: 2,
    },
    kpiValue: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    kpiLabel: {
      fontSize: 10,
      fontWeight: "600",
      color: colors.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    kpiCount: {
      fontSize: 10,
      color: colors.textTertiary,
    },
    kpiDivider: {
      width: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.xs,
    },

    progressRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      gap: spacing.sm,
    },
    progressTrack: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      backgroundColor: "#D97706" + "33",
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 3,
    },
    progressLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.success,
    },
  });
