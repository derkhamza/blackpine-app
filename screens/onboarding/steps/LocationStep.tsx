import { StyleSheet, Text, TextInput, View } from "react-native";
import { CommuneType } from "blackpine-engine";
import { OnboardingShell } from "../OnboardingShell";
import { Choice } from "../Choice";
import { colors, radii, spacing, typography } from "../../../lib/theme";

interface Props {
  commune: string;
  communeType: CommuneType | null;
  onChangeCommune: (v: string) => void;
  onChangeType: (v: CommuneType) => void;
  onNext: () => void;
  onBack: () => void;
}

export function LocationStep({ commune, communeType, onChangeCommune, onChangeType, onNext, onBack }: Props) {
  return (
    <OnboardingShell
      stepIndex={4}
      totalSteps={8}
      title="Où exercez-vous ?"
      subtitle="La zone influence la taxe professionnelle et les services communaux."
      onNext={onNext}
      onBack={onBack}
      nextDisabled={!commune.trim() || !communeType}
    >
      <View style={{ marginBottom: spacing.lg }}>
        <Text style={styles.label}>Ville ou commune</Text>
        <TextInput
          style={styles.input}
          value={commune}
          onChangeText={onChangeCommune}
          placeholder="Casablanca, Rabat, Fès…"
          placeholderTextColor={colors.textTertiary}
        />
      </View>

      <Text style={styles.label}>Type de zone</Text>
      <Choice
        label="Zone urbaine"
        description="Ville ou périphérie urbaine"
        icon="🏙️"
        selected={communeType === "URBAN"}
        onPress={() => onChangeType("URBAN")}
      />
      <Choice
        label="Zone rurale"
        description="Commune rurale"
        icon="🌾"
        selected={communeType === "RURAL"}
        onPress={() => onChangeType("RURAL")}
      />
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 14,
    fontSize: 16,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
});