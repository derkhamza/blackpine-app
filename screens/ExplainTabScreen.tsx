import { ScrollView, StyleSheet, Text, View } from "react-native";
import { TraceEvent } from "blackpine-engine";
import { useApp } from "../lib/AppContext";
import { colors, radii, shadows, spacing, typography } from "../lib/theme";
import { formatMAD } from "../lib/format";
import { ExportButtons } from "../components/ExportButtons";
import { useT } from "../lib/useT";
import { SafeScreen } from "../components/SafeScreen";



export function ExplainTabScreen() {
  const { t, currentLang } = useT();
  const { result } = useApp();
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
  function EventCard({ event }: { event: TraceEvent }) {
  const style = eventStyle(event.kind);
  return (
    <View style={[styles.card, { borderLeftColor: style.accent }]}>
      <Text style={[styles.cardKind, { color: style.accent }]}>{style.label}</Text>
      <Text style={styles.cardTitle}>{event.title}</Text>
      {event.formula && <Text style={styles.cardFormula}>{event.formula}</Text>}
      {typeof event.value === "number" && (
        <Text style={styles.cardValue}>{formatMAD(event.value)}</Text>
      )}
      {event.detail && <Text style={styles.cardDetail}>{event.detail}</Text>}
    </View>
  );
}
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

      {sections.map((section, i) => (
        <View key={i} style={styles.section}>
          <Text style={styles.sectionTitle}>
            {section.title === "Votre activité"
              ? t("explain.sectionActivity")
              : section.title === "Calcul de l'impôt"
              ? t("explain.sectionTax")
              : section.title}
          </Text>
          {section.events.map((ev, j) => (
            <EventCard key={j} event={ev} />
          ))}
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
  headline: { backgroundColor: colors.surfaceDark, borderRadius: radii.lg, padding: spacing.xl, marginBottom: spacing.lg, ...shadows.hero },
  headlineLabel: { color: colors.textOnDarkMuted, ...typography.caption, marginBottom: spacing.sm },
  headlineAmount: { color: colors.textOnDark, ...typography.display },
  headlineMeta: { color: colors.textOnDarkMuted, fontSize: 12, marginTop: spacing.md },
  section: { marginBottom: spacing.xl },
  sectionTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radii.sm, padding: spacing.md, marginBottom: spacing.sm, borderLeftWidth: 3, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  cardKind: { ...typography.micro, textTransform: "uppercase", fontWeight: "600", marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: colors.textPrimary, marginBottom: 4 },
  cardFormula: { fontSize: 13, color: colors.textSecondary, fontFamily: "Courier", marginBottom: 2 },
  cardValue: { fontSize: 20, fontWeight: "700", color: colors.textPrimary, marginTop: 6 },
  cardDetail: { ...typography.caption, color: colors.textSecondary, marginTop: 6, lineHeight: 19 },
  footer: { ...typography.caption, color: colors.textTertiary, textAlign: "center", fontStyle: "italic", marginTop: spacing.md },
engineNote: {
  ...typography.caption,
  color: colors.textTertiary,
  textAlign: "center",
  fontStyle: "italic",
  marginBottom: spacing.md,
},
});