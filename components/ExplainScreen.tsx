import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { FullTaxComputation, TraceEvent } from "blackpine-engine";
import { colors, radii, shadows, spacing, typography } from "../lib/theme";
import { formatMAD } from "../lib/format";

interface Props {
  visible: boolean;
  onClose: () => void;
  computation: FullTaxComputation;
}

export function ExplainScreen({ visible, onClose, computation }: Props) {
  // Split events into sections based on SECTION markers
  const sections: { title: string; events: TraceEvent[] }[] = [];
  let current: { title: string; events: TraceEvent[] } | null = null;

  for (const ev of computation.events) {
    if (ev.kind === "SECTION") {
      if (current) sections.push(current);
      current = { title: ev.title, events: [] };
    } else if (current) {
      current.events.push(ev);
    }
  }
  if (current) sections.push(current);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Comprendre mon impôt</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.close}>Fermer</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* HEADLINE */}
          <View style={styles.headline}>
            <Text style={styles.headlineLabel}>Impôt à payer · 2026</Text>
            <Text style={styles.headlineAmount}>{formatMAD(computation.tax.taxDue)}</Text>
            <Text style={styles.headlineMeta}>
              Régime {computation.tax.regime} · Calculé sur {computation.tax.payableRule}
            </Text>
          </View>

          {/* SECTIONS */}
          {sections.map((section, i) => (
            <View key={i} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.events.map((ev, j) => (
                <EventCard key={j} event={ev} />
              ))}
            </View>
          ))}

          {/* FOOTER */}
          <Text style={styles.footer}>
            Calcul basé sur la configuration fiscale {computation.configVersion}. Cette estimation ne remplace pas l'avis de votre expert-comptable.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

function EventCard({ event }: { event: TraceEvent }) {
  const style = eventStyle(event.kind);
  return (
    <View style={[styles.card, { borderLeftColor: style.accent }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardKind, { color: style.accent }]}>{style.label}</Text>
      </View>
      <Text style={styles.cardTitle}>{event.title}</Text>
      {event.formula && <Text style={styles.cardFormula}>{event.formula}</Text>}
      {typeof event.value === "number" && (
        <Text style={styles.cardValue}>{formatMAD(event.value)}</Text>
      )}
      {event.detail && <Text style={styles.cardDetail}>{event.detail}</Text>}
    </View>
  );
}

function eventStyle(kind: TraceEvent["kind"]) {
  switch (kind) {
    case "INPUT": return { label: "Donnée", accent: colors.textSecondary };
    case "COMPUTATION": return { label: "Calcul", accent: colors.brand };
    case "RULE_APPLIED": return { label: "Règle fiscale", accent: colors.gold };
    case "COMPARISON": return { label: "Comparaison", accent: colors.textSecondary };
    case "CONCLUSION": return { label: "Conclusion", accent: colors.success };
    case "WARNING": return { label: "Attention", accent: colors.warning };
    default: return { label: "Info", accent: colors.textSecondary };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: { ...typography.h2, color: colors.textPrimary },
  close: { color: colors.brand, fontSize: 15, fontWeight: "600" },

  scroll: { padding: spacing.lg, paddingBottom: 40 },

  headline: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.hero,
  },
  headlineLabel: {
    color: colors.textOnDarkMuted,
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  headlineAmount: {
    color: colors.textOnDark,
    ...typography.display,
  },
  headlineMeta: {
    color: colors.textOnDarkMuted,
    fontSize: 12,
    marginTop: spacing.md,
  },

  section: { marginBottom: spacing.xl },
  sectionTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  cardKind: {
    ...typography.micro,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cardFormula: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: "Courier",
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 6,
  },
  cardDetail: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 19,
  },

  footer: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: spacing.md,
  },
});