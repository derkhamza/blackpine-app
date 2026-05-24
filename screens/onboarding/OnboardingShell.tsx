import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "../../components/SafeScreen";
import { useT } from "../../lib/useT";
import { radii, spacing, typography, ColorPalette } from "../../lib/theme";
import { useColors } from "../../lib/ThemeContext";
import { ScalePressable } from "../../components/ScalePressable";
import { tapLight } from "../../lib/haptics";

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
  nextLabel,
  nextDisabled,
  children,
}: Props) {
  const colors = useColors();const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const topInset = useTopInset();
  return (
    <View style={[styles.container, { paddingTop: topInset, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12}>
            <Text style={styles.backBtn}>‹ {t("back")}</Text>
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
          <ScalePressable
            scaleTo={0.97}
            style={[
              styles.nextBtn,
              nextDisabled && styles.nextBtnDisabled,
            ]}
            onPress={() => { if (!nextDisabled) { tapLight(); onNext(); } }}
            disabled={nextDisabled}
          >
            <Text style={styles.nextBtnText}>{nextLabel || t("continue")}</Text>
          </ScalePressable>
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: { color: colors.brand, fontSize: 15, fontWeight: "700" },
  stepCounter: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  progress: {
    height: 4,
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
    fontSize: 26,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 23,
  },
  content: { flex: 1 },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  nextBtn: {
    paddingVertical: 15,
    borderRadius: radii.lg,
    alignItems: "center",
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  nextBtnDisabled: {
    backgroundColor: colors.borderStrong,
    shadowColor: "transparent",
    shadowOpacity: 0,
    elevation: 0,
  },
  nextBtnText: {
    color: colors.textOnDark,
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.2,
  },
});