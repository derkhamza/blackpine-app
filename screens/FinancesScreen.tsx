import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { DashboardScreen } from "./DashboardScreen";
import { TransactionsScreen } from "./TransactionsScreen";
import { StatsScreen } from "./StatsScreen";
import {
  consumePendingFinancesSegment,
  consumePendingFilter,
  consumePendingOpenAdd,
} from "../lib/navigationState";
import { radii, spacing, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { useT } from "../lib/useT";
import { Icon } from "../lib/icons";
import type { IconName } from "../lib/icons";
import { tapLight } from "../lib/haptics";

type Segment = 0 | 1 | 2;

const SEGMENT_ICONS: IconName[] = ["dashboard", "transactions", "stethoscope"];

export function FinancesScreen({ navigation }: any) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();
  const [segment, setSegment] = useState<Segment>(0);
  // Filter to pre-apply when switching to the Transactions segment
  const [pendingTxFilter, setPendingTxFilter] = useState<"ALL" | "RECETTE" | "CHARGE">("ALL");
  const [pendingAddType, setPendingAddType] = useState<"RECETTE" | "CHARGE" | null>(null);

  // ── Animated segment pill ────────────────────────────────────────────────
  const [segBarWidth, setSegBarWidth] = useState(0);
  const segAnim = useRef(new Animated.Value(0)).current;

  // Pixel measurements for the sliding pill (spacing.sm=8, gap=4)
  const pillW = useMemo(
    () => (segBarWidth > 0 ? Math.max(0, (segBarWidth - spacing.sm * 2 - 4 * 2) / 3) : 0),
    [segBarWidth],
  );
  const pillX = useMemo(() => {
    if (pillW === 0) return segAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 0, 0] });
    const pad = spacing.sm;
    const gap = 4;
    return segAnim.interpolate({
      inputRange: [0, 1, 2],
      outputRange: [pad, pad + pillW + gap, pad + (pillW + gap) * 2],
    });
  }, [pillW, segAnim]);

  // Sync pill position when layout is first measured
  useEffect(() => {
    if (segBarWidth > 0) segAnim.setValue(segment);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segBarWidth]);

  /** Animate + haptic. Use for direct user taps on the segment bar. */
  const changeSegment = useCallback((i: Segment) => {
    tapLight();
    setSegment(i);
    Animated.spring(segAnim, {
      toValue: i,
      useNativeDriver: true,
      tension: 220,
      friction: 22,
    }).start();
  }, [segAnim]);

  /** Snap without animation + without haptic. Use for programmatic navigation. */
  const snapSegment = useCallback((i: Segment) => {
    setSegment(i);
    segAnim.setValue(i);
  }, [segAnim]);

  // On tab focus: consume any pending segment jump, filter, and auto-open add
  useFocusEffect(
    useCallback(() => {
      const pendingSeg = consumePendingFinancesSegment();
      const pendingFilter = consumePendingFilter();
      const pendingAdd = consumePendingOpenAdd();
      if (pendingSeg !== null) snapSegment(pendingSeg as Segment);
      if (pendingFilter !== "ALL") setPendingTxFilter(pendingFilter);
      if (pendingAdd) setPendingAddType(pendingAdd);
    }, [snapSegment])
  );

  // Wrap navigation so DashboardScreen's navigate("Transactions") switches segment,
  // while navigate("Expliquer") passes through to the FinancesStack to push the screen.
  const wrappedNav = useMemo(
    () => ({
      ...navigation,
      navigate: (screen: string, _params?: any) => {
        if (screen === "Transactions") {
          const f = consumePendingFilter();
          if (f !== "ALL") setPendingTxFilter(f);
          changeSegment(1);
          return;
        }
        navigation.navigate(screen, _params);
      },
    }),
    [navigation, changeSegment]
  );

  const segments = [
    t("finances.summary"),
    t("finances.operations"),
    t("finances.activity"),
  ];

  return (
    <View style={styles.root}>
      {/* Sub-screens — only active one is mounted */}
      <View style={styles.content}>
        {segment === 0 && <DashboardScreen navigation={wrappedNav} />}
        {segment === 1 && (
          <TransactionsScreen
            navigation={wrappedNav}
            initialFilter={pendingTxFilter}
            onFilterConsumed={() => setPendingTxFilter("ALL")}
            initialAddType={pendingAddType}
            onAddTypeConsumed={() => setPendingAddType(null)}
          />
        )}
        {segment === 2 && <StatsScreen />}
      </View>

      {/* Segment bar */}
      <View
        style={[styles.segBar, insets.bottom > 0 && { paddingBottom: insets.bottom }]}
        onLayout={e => setSegBarWidth(e.nativeEvent.layout.width)}
      >
        {/* Animated sliding pill — renders below buttons */}
        {pillW > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[styles.segPill, { width: pillW, transform: [{ translateX: pillX }] }]}
          />
        )}

        {segments.map((label, i) => {
          const active = segment === i;
          return (
            <Pressable
              key={i}
              style={styles.seg}
              onPress={() => changeSegment(i as Segment)}
            >
              <Icon
                name={SEGMENT_ICONS[i]}
                size={16}
                color={active ? colors.brand : colors.textTertiary}
              />
              <Text style={[styles.segLabel, active && styles.segLabelActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1 },
  segBar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
    gap: 4,
  },
  seg: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
    paddingVertical: 10,
    borderRadius: radii.md,
    zIndex: 1,           // sit above the pill
  },
  segActive: {
    // Background handled by the animated pill — only keep text/icon overrides here
  },
  segLabel: { fontSize: 11, fontWeight: "600", color: colors.textTertiary },
  segLabelActive: { color: colors.brand, fontWeight: "700" },
  // Sliding background pill
  segPill: {
    position: "absolute",
    top: spacing.xs,
    bottom: spacing.xs,
    backgroundColor: colors.brandSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.brand + "22",
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 2,
  },
});
