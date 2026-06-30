/**
 * ScalePressable — drop-in Pressable replacement that springs to 0.96 on press.
 *
 * Usage:
 *   <ScalePressable style={styles.btn} onPress={...}>
 *     {children}
 *   </ScalePressable>
 *
 * The `style` prop may be a plain StyleProp<ViewStyle> (not a function).
 * For buttons that use `({ pressed }) => style`, keep plain Pressable.
 */
import React, { useRef } from "react";
import {
  Animated,
  GestureResponderEvent,
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";

// Animated Pressable so the transform is driven directly on the native thread.
const AnimPress = Animated.createAnimatedComponent(Pressable);

export type HapticKind = "none" | "selection" | "light" | "medium";

/** Fire a tactile tick on press (no-op on web / if unavailable). */
function fireHaptic(kind: HapticKind) {
  if (kind === "none" || Platform.OS === "web") return;
  try {
    if (kind === "selection") Haptics.selectionAsync();
    else if (kind === "light") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (kind === "medium") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch { /* haptics are best-effort — never block a tap */ }
}

interface Props extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
  /** Scale target on press-in. Default 0.96. */
  scaleTo?: number;
  /**
   * Built-in tactile feedback on press-in. Default "none" — most call sites in
   * this app already fire haptics manually via lib/haptics in their onPress, so
   * the default stays off to avoid a double-buzz. Opt in where there's no manual call.
   */
  haptic?: HapticKind;
  children?: React.ReactNode;
}

export function ScalePressable({
  style,
  scaleTo = 0.96,
  haptic = "none",
  children,
  onPressIn,
  onPressOut,
  ...rest
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handleIn = (e: GestureResponderEvent) => {
    fireHaptic(haptic);
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
    onPressIn?.(e);
  };

  const handleOut = (e: GestureResponderEvent) => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 38,
      bounciness: 1.5,
    }).start();
    onPressOut?.(e);
  };

  return (
    <AnimPress
      style={[style, { transform: [{ scale }] }] as any}
      onPressIn={handleIn}
      onPressOut={handleOut}
      {...rest}
    >
      {children}
    </AnimPress>
  );
}
