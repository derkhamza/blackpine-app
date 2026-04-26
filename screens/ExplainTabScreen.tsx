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

export function ExplainTabScreen() {
  const { t, currentLang } = useT();
  const { result } = useApp();
  const [expandedRef, setExpandedRef] = useState<string | null>(null);

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

  const eventStyle = (kind: TraceEvent["kind"]) => {
    switch (kind) {
      case "INPUT": return { label: t("ocr.input"), accent: colors.textSecondary };
      case "COMPUTATION": return { label: t("ocr.calculation"), accent: colors.brand };
      case "RULE_APPLIED": return { label: t("ocr.fiscalRule"), accent: colors.gold };
      case "COMPARISON": return { label: t("ocr.comparison"), accent: colors.textSecondary };
      case "CONCLUSION": return { label: t("ocr.conclusion"), accent: colors.success };
      case "WARNING": return { label: t("ocr.warning"), accent: colors.warning };
      default: return { label: t("ocr.info"), accent: colors.textSecondary };
    }
  };

  return (
    <SafeScreen>
      <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
        <Text style={styles.screenTitle}>{t("explain.title")}</Text>

        <View style={styles.headline}>
          <Text style={styles.headlineLabel}>{t("explain.taxToPay")}</Text>
          <Text style={styles.headlineAmount}>{formatMAD(result.tax.taxDue)}</Text>
          <Text style={styles.headlineMeta}>
            {t("dashboard.regime")} {result.tax.regime} · {t("dashboard.calculatedOn")} {result.tax.payableRule}
          </Text>
        </View>

        {currentLang !== "fr" && (
          <Text style={styles.engineNote}>{t("explain.engineNote")}</Text>
        )}

        {sections.map((section, si) => (
          <View key={si} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {section.title === "Votre activité"
                ? t("explain.sectionActivity")
                : section.title === "Calcul de l'impôt"
                ? t("explain.sectionTax")
                : section.title}
            </Text>

            {section.events.map((ev, ei) => {
              const style = eventStyle(ev.kind);
              const ref = findLegalRef(ev.title);
              const refKey = `${si}-${ei}`;

              return (
                <View key={ei} style={[styles.card, { borderLeftColor: style.accent }]}>
                  <View style={[styles.kindBadge, { backgroundColor: style.accent }]}>
                    <Text style={styles.kindText}>{style.label}</Text>
                  </View>
                  <Text style={styles.cardTitle}>{ev.title}</Text>
                  {ev.formula && <Text style={styles.cardFormula}>{ev.formula}</Text>}
                  {typeof ev.value === "number" && (
                    <Text style={styles.cardValue}>{formatMAD(ev.value)}</Text>
                  )}
                  {ev.detail && <Text style={styles.cardDetail}>{ev.detail}</Text>}

                  {ref && (
                    <Pressable
                      style={styles.refButton}
                      onPress={() => setExpandedRef(expandedRef === refKey ? null : refKey)}
                    >
                      <Text style={styles.refButtonText}>
                        {expandedRef === refKey ? "✕ Fermer" : `📜 ${ref.article}`}
                      </Text>
                    </Pressable>
                  )}

                  {ref && expandedRef === refKey && (
                    <View style={styles.refBox}>
                      <Text style={styles.refTitle}>{ref.article} — {ref.title}</Text>
                      <Text style={styles.refSummary}>{ref.summary}</Text>
                      <View style={styles.refDivider} />
                      <Text style={styles.refFullLabel}>{t("explain.legalText")}</Text>
                      <Text style={styles.refFullText}>{ref.fullText}</Text>
                    </View>
                  )}
                </View>
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
  scroll: { padding: spacing.lg, paddingTop: 20, paddingBottom: 40 },
  screenTitle: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.lg },
  headline: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.hero,
  },
  headlineLabel: { color: colors.textOnDarkMuted, ...typography.caption, marginBottom: spacing.sm },
  headlineAmount: { color: colors.textOnDark, ...typography.display },
  headlineMeta: { color: colors.textOnDarkMuted, fontSize: 12, marginTop: spacing.md },
  engineNote: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: spacing.md,
  },
  section: { marginBottom: spacing.xl },
  sectionTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  kindBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    marginBottom: 6,
  },
  kindText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardTitle: { fontSize: 15, fontWeight: "600", color: colors.textPrimary, marginBottom: 4 },
  cardFormula: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: "Courier",
    backgroundColor: colors.surfaceAlt,
    padding: 6,
    borderRadius: radii.xs,
    marginTop: 4,
    overflow: "hidden",
  },
  cardValue: { fontSize: 22, fontWeight: "700", color: colors.brand, marginTop: 8 },
  cardDetail: { ...typography.caption, color: colors.textSecondary, marginTop: 8, lineHeight: 20 },
  refButton: {
    marginTop: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.goldSoft,
    borderRadius: radii.pill,
    alignSelf: "flex-start",
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
  footer: { ...typography.caption, color: colors.textTertiary, textAlign: "center", fontStyle: "italic", marginTop: spacing.md },
});