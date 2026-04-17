import { StyleSheet, Text, View } from "react-native";
import { OnboardingShell } from "../OnboardingShell";
import { colors, radii, spacing, typography } from "../../../lib/theme";

export function TrustStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <OnboardingShell
      stepIndex={1}
      totalSteps={8}
      title="Ce que vous devez savoir"
      subtitle="Avant de continuer, voici nos engagements."
      onNext={onNext}
      onBack={onBack}
    >
      <View style={styles.list}>
        <Promise
          icon="🔒"
          title="Vos données restent au Maroc"
          detail="Chiffrées et confidentielles, conformément à la loi 09-08."
        />
        <Promise
          icon="✓"
          title="Approuvé par des experts-comptables marocains"
          detail="Notre moteur fiscal est validé par des professionnels."
        />
        <Promise
          icon="🎁"
          title="Essai gratuit 30 jours"
          detail="Sans carte bancaire. Annulation à tout moment."
        />
      </View>
    </OnboardingShell>
  );
}

function Promise({ icon, title, detail }: { icon: string; title: string; detail: string }) {
  return (
    <View style={styles.item}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemDetail}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  item: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "flex-start",
  },
  icon: { fontSize: 24, marginTop: 2 },
  itemTitle: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  itemDetail: { ...typography.caption, color: colors.textSecondary, marginTop: 2, lineHeight: 19 },
});