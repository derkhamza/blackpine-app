import { StyleSheet, Text, View } from "react-native";
import { PracticeType } from "blackpine-engine";
import { OnboardingShell } from "../OnboardingShell";
import { Choice } from "../Choice";
import { colors, radii, spacing, typography } from "../../../lib/theme";

interface Props {
  value: PracticeType | "SALARIED" | null;
  onChange: (v: PracticeType | "SALARIED") => void;
  onNext: () => void;
  onBack: () => void;
}

export function PracticeStep({ value, onChange, onNext, onBack }: Props) {
  const isSalaried = value === "SALARIED";

  return (
    <OnboardingShell
      stepIndex={3}
      totalSteps={8}
      title="Comment exercez-vous ?"
      subtitle="Votre situation détermine le régime fiscal applicable."
      onNext={onNext}
      onBack={onBack}
      nextDisabled={!value || isSalaried}
    >
      <Choice
        label="J'ai mon propre cabinet"
        description="Cabinet libéral avec inscription à la taxe professionnelle"
        icon="🏢"
        selected={value === "CABINET_ONLY"}
        onPress={() => onChange("CABINET_ONLY")}
      />
      <Choice
        label="Je travaille uniquement en clinique"
        description="Vacations, sans TP"
        icon="🏥"
        selected={value === "CLINIC_ONLY"}
        onPress={() => onChange("CLINIC_ONLY")}
      />
      <Choice
        label="Les deux"
        description="Cabinet + vacations en clinique"
        icon="🔀"
        selected={value === "MIXED"}
        onPress={() => onChange("MIXED")}
      />
      <Choice
        label="Je suis salarié"
        description="Hôpital ou clinique"
        icon="💼"
        selected={value === "SALARIED"}
        onPress={() => onChange("SALARIED")}
      />

      {isSalaried && (
        <View style={styles.warning}>
          <Text style={styles.warningTitle}>
            Blackpine n'est pas encore adapté aux médecins salariés
          </Text>
          <Text style={styles.warningDetail}>
            Notre application est conçue pour les professionnels libéraux. Nous vous informerons dès qu'une version salariée sera disponible.
          </Text>
        </View>
      )}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  warning: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.warningSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "#E8C470",
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.warning,
    marginBottom: 4,
  },
  warningDetail: {
    ...typography.caption,
    color: colors.warning,
    lineHeight: 19,
  },
});