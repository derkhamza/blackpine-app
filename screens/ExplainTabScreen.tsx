import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { TraceEvent } from "blackpine-engine";
import { useApp } from "../lib/AppContext";
import { colors, radii, shadows, spacing, typography } from "../lib/theme";
import { formatMAD } from "../lib/format";
import { ExportButtons } from "../components/ExportButtons";
import { useT } from "../lib/useT";
import { SafeScreen } from "../components/SafeScreen";
import { findLegalRef } from "../lib/legalReferences";
import { Icon } from "../lib/icons";

export function ExplainTabScreen() {
  const { t, currentLang } = useT();
  const { result } = useApp();
  const [expandedRef, setExpandedRef] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const sections: { title: string; events: TraceEvent[] }[] = [];
  let current: { title: string; events: TraceEvent[] } | null = null;
  for (const ev of result.events) {
    if (ev.kind === "SECTION") {
      if (current) sections.push(current);
      current = { title: ev.title, events: [] };
    } else if (current) {
      current.events.push(ev);
    }
  }
  if (current) sections.push(current);

  const eventMeta = (kind: TraceEvent["kind"]) => {
      switch (kind) {
        case "INPUT": return { label: t("ocr.input"), accent: colors.textSecondary, iconName: "download" as const };
        case "COMPUTATION": return { label: t("ocr.calculation"), accent: colors.brand, iconName: "cpu" as const };
        case "RULE_APPLIED": return { label: t("ocr.fiscalRule"), accent: colors.gold, iconName: "scale" as const };
        case "COMPARISON": return { label: t("ocr.comparison"), accent: colors.textSecondary, iconName: "refresh" as const };
        case "CONCLUSION": return { label: t("ocr.conclusion"), accent: colors.success, iconName: "checkCircle" as const };
        case "WARNING": return { label: t("ocr.warning"), accent: colors.warning, iconName: "alertTriangle" as const };
        default: return { label: t("ocr.info"), accent: colors.textSecondary, iconName: "info" as const };
      }
    };

  const irNet = Math.max(0, result.tax.ir.grossIR - result.tax.familyDeduction);

  return (
    <SafeScreen>
      <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
        <Text style={styles.screenTitle}>{t("explain.title")}</Text>

        {/* Hero card */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>{t("explain.taxToPay")}</Text>
          <Text style={styles.heroAmount}>{formatMAD(result.tax.taxDue)}</Text>
          <View style={styles.heroChips}>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>{result.tax.regime}</Text>
            </View>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>{result.tax.payableRule}</Text>
            </View>
          </View>
        </View>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t("dashboard.recettes")}</Text>
            <Text style={[styles.summaryValue, { color: colors.recette }]}>{formatMAD(result.breakdown.totalRecettes)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t("dashboard.charges")}</Text>
            <Text style={[styles.summaryValue, { color: colors.charge }]}>{formatMAD(result.breakdown.totalCharges)}</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>IR brut</Text>
            <Text style={styles.summaryValue}>{formatMAD(result.tax.ir.grossIR)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>CM</Text>
            <Text style={styles.summaryValue}>
              {formatMAD(result.tax.cm.cmDue)}
              {result.tax.cm.exempted ? " (exemptée)" : ""}
            </Text>
          </View>
        </View>

        {currentLang !== "fr" && (
          <Text style={styles.engineNote}>{t("explain.engineNote")}</Text>
        )}

        {/* Trace sections */}
        {sections.map((section, si) => (
          <View key={si} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>
                {section.title === "Votre activité"
                  ? t("explain.sectionActivity")
                  : section.title === "Calcul de l'impôt"
                  ? t("explain.sectionTax")
                  : section.title}
              </Text>
            </View>

            {section.events.map((ev, ei) => {
              const meta = eventMeta(ev.kind);
              const ref = findLegalRef(ev.title);
              const refKey = `${si}-${ei}`;
              const cardKey = `${si}-${ei}`;
              const isExpanded = expandedCard === cardKey;
              const hasDetail = !!ev.detail || !!ev.formula || !!ref;

              return (
                <Pressable
                  key={ei}
                  style={styles.card}
                  onPress={() => hasDetail ? setExpandedCard(isExpanded ? null : cardKey) : null}
                >
                  {/* Card top row */}
                  <View style={styles.cardTopRow}>
                    <View style={[styles.cardIconBox, { backgroundColor: meta.accent + "18" }]}>
                      <Icon name={meta.iconName} size={16} color={meta.accent} />
                    </View>
                    <View style={styles.cardMainCol}>
                      <Text style={styles.cardKindLabel} numberOfLines={1}>
                        {meta.label}
                      </Text>
                      <Text style={styles.cardTitle}>{ev.title}</Text>
                    </View>
                    {typeof ev.value === "number" && (
                      <Text style={[styles.cardAmount, { color: meta.accent }]}>
                        {formatMAD(ev.value)}
                      </Text>
                    )}
                  </View>

                  {/* Expanded content */}
                  {isExpanded && (
                    <View style={styles.cardExpanded}>
                      {ev.formula && (
                        <View style={styles.formulaBox}>
                          <Text style={styles.formulaText}>{ev.formula}</Text>
                        </View>
                      )}
                      {ev.detail && (
                        <Text style={styles.cardDetail}>{ev.detail}</Text>
                      )}

                      {ref && (
                        <>
                          <Pressable
                            style={styles.refButton}
                            onPress={() => setExpandedRef(expandedRef === refKey ? null : refKey)}
                          >
                            <Text style={styles.refButtonText}>
                              {expandedRef === refKey ? "✕ Fermer" : `📜 ${ref.article}`}
                            </Text>
                          </Pressable>

                          {expandedRef === refKey && (
                            <View style={styles.refBox}>
                              <Text style={styles.refTitle}>{ref.article} — {ref.title}</Text>
                              <Text style={styles.refSummary}>{ref.summary}</Text>
                              <View style={styles.refDivider} />
                              <Text style={styles.refFullLabel}>{t("explain.legalText")}</Text>
                              <Text style={styles.refFullText}>{ref.fullText}</Text>
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  )}

                  {/* Expand hint */}
                  {hasDetail && !isExpanded && (
                    <Text style={styles.expandHint}>Appuyer pour détails ›</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}

        <ExportButtons />

        <Text style={styles.footer}>
          {t("explain.configLabel")} {result.configVersion}. {t("explain.footer")}
        </Text>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: 40 },
  screenTitle: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.md },

  // Hero
  hero: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
    alignItems: "center",
    ...shadows.hero,
  },
  heroLabel: {
    color: colors.textOnDarkMuted,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  heroAmount: {
    color: colors.textOnDark,
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  heroChips: {
    flexDirection: "row",
    gap: 8,
    marginTop: spacing.sm,
  },
  heroChip: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  heroChipText: {
    color: colors.textOnDarkMuted,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  // Summary
  summaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  engineNote: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: "center",
    fontStyle: "italic",
    marginVertical: spacing.sm,
  },

  // Sections
  section: { marginBottom: spacing.lg },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.md,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },

  // Cards
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIcon: {
    fontSize: 16,
  },
  cardMainCol: {
    flex: 1,
  },
  cardKindLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  cardAmount: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "right",
  },
  expandHint: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 6,
    textAlign: "right",
  },

  // Expanded
  cardExpanded: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  formulaBox: {
    backgroundColor: colors.surfaceAlt,
    padding: 8,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
  },
  formulaText: {
    fontSize: 11,
    fontFamily: "Courier",
    color: colors.textSecondary,
    lineHeight: 16,
  },
  cardDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },

  // Legal ref
  refButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.goldSoft,
    borderRadius: radii.pill,
    alignSelf: "flex-start",
    marginTop: spacing.xs,
  },
  refButtonText: { fontSize: 11, fontWeight: "600", color: colors.gold },
  refBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  refTitle: { fontSize: 13, fontWeight: "700", color: colors.textPrimary, marginBottom: 6 },
  refSummary: { fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginBottom: spacing.sm },
  refDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  refFullLabel: { ...typography.micro, color: colors.textTertiary, textTransform: "uppercase", marginBottom: 4 },
  refFullText: { fontSize: 11, color: colors.textSecondary, lineHeight: 17, fontStyle: "italic" },

  footer: { ...typography.caption, color: colors.textTertiary, textAlign: "center", fontStyle: "italic", marginTop: spacing.lg },
});