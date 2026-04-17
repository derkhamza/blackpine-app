import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, shadows, spacing, typography } from "../../lib/theme";

interface Props {
  label: string;
  description?: string;
  icon?: string;
  selected: boolean;
  onPress: () => void;
}

export function Choice({ label, description, icon, selected, onPress }: Props) {
  return (
    <Pressable
      style={[styles.choice, selected && styles.choiceSelected]}
      onPress={onPress}
    >
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
        {description && (
          <Text style={styles.description}>{description}</Text>
        )}
      </View>
      <View style={[styles.check, selected && styles.checkSelected]}>
        {selected && <Text style={styles.checkMark}>✓</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  choice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadows.card,
  },
  choiceSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  icon: { fontSize: 24 },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  labelSelected: { color: colors.brand },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkSelected: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  checkMark: { color: colors.textOnDark, fontSize: 14, fontWeight: "700" },
});