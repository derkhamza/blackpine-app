import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useApp } from "../lib/AppContext";
import { useT } from "../lib/useT";
import { radii, shadows, spacing, typography, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { formatMAD } from "../lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

type Urgency = "overdue" | "soon" | "upcoming";

interface Installment {
  label: string;
  dueIso: string;
  amount: number;
  urgency: Urgency;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getUrgency(dueIso: string): Urgency {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueIso + "T00:00:00");
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 30) return "soon";
  return "upcoming";
}

function fmtDate(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AcomptesSection() {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const { result, fiscalYear } = useApp();
  const { t } = useT();

  const taxDue = result.tax.taxDue;
  const perInstallment = Math.round((taxDue / 4) * 100) / 100;

  const Y = fiscalYear;

  const installments: Installment[] = [
    {
      label: `1er ${t("filings.acomptesInstallment")}`,
      dueIso: `${Y}-04-30`,
      amount: perInstallment,
      urgency: getUrgency(`${Y}-04-30`),
    },
    {
      label: `2e ${t("filings.acomptesInstallment")}`,
      dueIso: `${Y}-07-31`,
      amount: perInstallment,
      urgency: getUrgency(`${Y}-07-31`),
    },
    {
      label: `3e ${t("filings.acomptesInstallment")}`,
      dueIso: `${Y}-10-31`,
      amount: perInstallment,
      urgency: getUrgency(`${Y}-10-31`),
    },
    {
      label: t("filings.acomptesSolde"),
      dueIso: `${Y + 1}-03-31`,
      amount: perInstallment,
      urgency: getUrgency(`${Y + 1}-03-31`),
    },
  ];

  // ── Urgency palette ───────────────────────────────────────────────────────

  const palette: Record<Urgency, { bg: string; text: string; badgeBg: string }> = {
    overdue:  { bg: colors.dangerSoft,  text: colors.danger,  badgeBg: colors.danger  + "22" },
    soon:     { bg: colors.warningSoft, text: colors.warning, badgeBg: colors.warning + "22" },
    upcoming: { bg: colors.surfaceAlt,  text: colors.textTertiary, badgeBg: colors.border },
  };

  const urgencyLabel: Record<Urgency, string> = {
    overdue:  t("filings.acomptesOverdue"),
    soon:     t("filings.acomptesSoon"),
    upcoming: "",
  };

  return (
    <View style={styles.container}>

      {/* Header */}
      <Text style={styles.title}>{t("filings.acomptesTitle")}</Text>
      <Text style={styles.subtitle}>{t("filings.acomptesDesc")}</Text>

      {/* Summary strip */}
      <View style={styles.summaryStrip}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{t("filings.acomptesTotal")}</Text>
          <Text style={styles.summaryValue}>{formatMAD(taxDue)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{t("filings.acomptesPerInstallment")}</Text>
          <Text style={[styles.summaryValue, { color: colors.brand }]}>
            {formatMAD(perInstallment)}
          </Text>
        </View>
      </View>

      {/* Installment rows */}
      <View style={styles.list}>
        {installments.map((inst, idx) => {
          const p = palette[inst.urgency];
          const lbl = urgencyLabel[inst.urgency];
          const isLast = idx === installments.length - 1;
          return (
            <View
              key={idx}
              style={[
                styles.row,
                { backgroundColor: p.bg },
                isLast && styles.rowLast,
              ]}
            >
              {/* Left: label + due date */}
              <View style={styles.rowLeft}>
                <View style={styles.labelRow}>
                  <Text style={styles.rowLabel}>{inst.label}</Text>
                  {lbl ? (
                    <View style={[styles.badge, { backgroundColor: p.badgeBg }]}>
                      <Text style={[styles.badgeText, { color: p.text }]}>{lbl}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.rowDue}>
                  {t("filings.acomptesDue")} · {fmtDate(inst.dueIso)}
                </Text>
              </View>

              {/* Right: amount */}
              <Text
                style={[
                  styles.rowAmount,
                  { color: inst.urgency === "upcoming" ? colors.textSecondary : p.text },
                ]}
              >
                {formatMAD(inst.amount)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Disclaimer */}
      <Text style={styles.note}>{t("filings.acomptesNote")}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

  // Header
  title: {
    ...typography.micro,
    color: colors.brand,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },

  // Summary strip
  summaryStrip: {
    flexDirection: "row",
    backgroundColor: colors.brandSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: "center",
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryLabel: {
    ...typography.micro,
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },

  // Installment list
  list: {
    borderRadius: radii.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLeft: { flex: 1, marginRight: spacing.sm },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  rowDue: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  rowAmount: {
    fontSize: 14,
    fontWeight: "700",
  },

  // Badge
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  // Disclaimer
  note: {
    ...typography.caption,
    color: colors.textTertiary,
    fontStyle: "italic",
    lineHeight: 16,
  },
});
