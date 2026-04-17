import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaritalStatus } from "blackpine-engine";
import { OnboardingShell } from "../OnboardingShell";
import { Choice } from "../Choice";
import { colors, radii, spacing, typography } from "../../../lib/theme";

interface Props {
  marital: MaritalStatus | null;
  dependents: number;
  onChangeMarital: (v: MaritalStatus) => void;
  onChangeDependents: (v: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export function FamilyStep({ marital, dependents, onChangeMarital, onChangeDependents, onNext, onBack }: Props) {
  return (
    <OnboardingShell
      stepIndex={6}
      totalSteps={8}
      title="Situation familiale"
      subtitle="Détermine la déduction pour charges de famille : 600 MAD par personne à charge."
      onNext={onNext}
      onBack={onBack}
      nextDisabled={!marital}
    >
      <Text style={styles.label}>Statut</Text>
      <Choice
        label="Marié(e)"
        icon="💍"
        selected={marital === "MARRIED"}
        onPress={() => onChangeMarital("MARRIED")}
      />
      <Choice
        label="Célibataire"
        icon="🙂"
        selected={marital === "SINGLE"}
        onPress={() => onChangeMarital("SINGLE")}
      />

      <Text style={[styles.label, { marginTop: spacing.lg }]}>Nombre d'enfants à charge</Text>
      <View style={styles.counterRow}>
        {[0, 1, 2, 3, 4, 5, 6].map((n) => (
          <Pressable
            key={n}
            style={[styles.counterBtn, dependents === n && styles.counterBtnActive]}
            onPress={() => onChangeDependents(n)}
          >
            <Text style={[styles.counterText, dependents === n && styles.counterTextActive]}>
              {n === 6 ? "6+" : n}
            </Text>
          </Pressable>
        ))}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontWeight: "600",
  },
  counterRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  counterBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  counterBtnActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  counterText: { fontSize: 17, fontWeight: "600", color: colors.textPrimary },
  counterTextActive: { color: colors.textOnDark },
});