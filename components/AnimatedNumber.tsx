import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, StyleProp, Text, TextStyle } from "react-native";

/**
 * Count-up number for React Native — animates from its previous value to the new
 * one with an ease-out curve (the Revolut "ticker" feel). Starts at 0 on mount
 * so it counts up on first render. Honors the OS "Reduce Motion" setting.
 *
 *   <AnimatedNumber value={1240} format={(n) => `${Math.round(n)} DH`} style={styles.amount} />
 */
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString("fr-FR"),
  duration = 650,
  style,
  numberOfLines,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const reduceRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((on) => { if (mounted) reduceRef.current = !!on; });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (reduceRef.current || from === to || !Number.isFinite(to)) {
      fromRef.current = to;
      setDisplay(to);
      return;
    }
    let start: number | null = null;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      setDisplay(from + (to - from) * ease(p));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  return <Text style={style} numberOfLines={numberOfLines}>{format(display)}</Text>;
}
