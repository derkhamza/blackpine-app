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
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from "react-native";

// Animated Pressable so the transform is driven directly on the native thread.
const AnimPress = Animated.createAnimatedComponent(Pressable);

interface Props extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
  /** Scale target on press-in. Default 0.96. */
  scaleTo?: number;
  children?: React.ReactNode;
}

export function ScalePressable({
  style,
  scaleTo = 0.96,
  children,
  onPressIn,
  onPressOut,
  ...rest
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handleIn = (e: GestureResponderEvent) => {
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
