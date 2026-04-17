import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "../../lib/theme";

interface Props {
  stepIndex: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  children: React.ReactNode;
}

export function OnboardingShell({
  stepIndex,
  totalSteps,
  title,
  subtitle,
  onBack,
  onNext,
  nextLabel = "Continuer",
  nextDisabled,
  children,
}: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12}>
            <Text style={styles.backBtn}>‹ Retour</Text>
          </Pressable>
        ) : (
          <View style={{ width: 60 }} />
        )}
        <Text style={styles.stepCounter}>{stepIndex + 1} / {totalSteps}</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.progress}>
        <View
          style={[
            styles.progressFill,
            { width: `${((stepIndex + 1) / totalSteps) * 100}%` },
          ]}
        />
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        <View style={styles.content}>{children}</View>
      </View>

      {onNext && (
        <View style={styles.footer}>
          <Pressable
            style={[
              styles.nextBtn,
              nextDisabled && styles.nextBtnDisabled,
            ]}
            onPress={onNext}
            disabled={nextDisabled}
          >
            <Text style={styles.nextBtnText}>{nextLabel}</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: { color: colors.brand, fontSize: 15, fontWeight: "600" },
  stepCounter: {
    ...typography.caption,
    color: colors.textTertiary,
    fontWeight: "600",
  },
  progress: {
    height: 3,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.border,
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.brand,
    borderRadius: radii.pill,
  },
  body: { flex: 1, padding: spacing.lg, paddingTop: spacing.xl },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  content: { flex: 1 },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  nextBtn: {
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: "center",
    backgroundColor: colors.brand,
  },
  nextBtnDisabled: { backgroundColor: colors.borderStrong },
  nextBtnText: {
    color: colors.textOnDark,
    fontWeight: "600",
    fontSize: 15,
  },
});