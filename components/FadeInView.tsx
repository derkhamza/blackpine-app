import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, StyleProp, ViewStyle } from "react-native";

/**
 * FadeInView — fades + slides its children up on mount (the list-entrance feel).
 * Pass `index` for a staggered cascade; the delay is capped so long lists don't
 * wait. Honors the OS "Reduce Motion" setting (renders instantly). Native-driven.
 *
 *   {items.map((it, i) => (
 *     <FadeInView key={it.id} index={i}><Row item={it} /></FadeInView>
 *   ))}
 */
export function FadeInView({
  children,
  index = 0,
  style,
  distance = 10,
  duration = 280,
}: {
  children: React.ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
  distance?: number;
  duration?: number;
}) {
  // Stagger the first several items, then settle so item 50 doesn't wait forever.
  const delay = Math.min(index, 8) * 45;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled?.().then((reduce) => {
      if (cancelled) return;
      if (reduce) { progress.setValue(1); return; }
      Animated.timing(progress, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }).start();
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
