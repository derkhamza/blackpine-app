/**
 * TimeDrumPicker — compact single-row time stepper.
 *
 * Layout:   [−]  │  09:30  │  [+]     (46 px tall)
 *            ↑       ↑         ↑
 *           flex:1  flex:3   flex:1
 *
 * Input methods:
 *  1. Tap [−] / [+]      → ±5 min; hold for rapid repeat
 *  2. Swipe up/down      → ±5 min per 12 px
 *  3. Tap the time       → keyboard (type 4 digits e.g. 0930 → 09:30)
 */

import React, { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { radii, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { tapLight } from "../lib/haptics";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Snap an HH:MM string to the nearest 5-minute boundary. */
export function snapToMinuteGrid(hhmm: string): string {
  const [hStr, mStr] = (hhmm ?? "").split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return "08:00";
  const snapped = Math.round(m / 5) * 5;
  const mFinal = snapped % 60;
  const hFinal = snapped >= 60 ? (h + 1) % 24 : h;
  return `${String(hFinal).padStart(2, "0")}:${String(mFinal).padStart(2, "0")}`;
}

function toMins(hhmm: string): number {
  const [h = "0", m = "0"] = (hhmm ?? "00:00").split(":");
  return (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0);
}

function toHHMM(mins: number): string {
  const t = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

// ─── component ────────────────────────────────────────────────────────────────

export function TimeDrumPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const colors = useColors();
  const s = makeStyles(colors);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState("");
  const inputRef = useRef<TextInput>(null);

  // Always-fresh minutes so hold-interval never closes over stale value
  const minsRef = useRef(toMins(value));
  useEffect(() => { minsRef.current = toMins(value); }, [value]);

  // ── hold-to-repeat ──────────────────────────────────────────────────────
  const holdTimer  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const holdInterv = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearHold = () => {
    if (holdTimer.current)  clearTimeout(holdTimer.current);
    if (holdInterv.current) clearInterval(holdInterv.current);
  };

  const startHold = (dir: 1 | -1) => {
    tapLight();
    const first = ((minsRef.current + dir * 5) % 1440 + 1440) % 1440;
    minsRef.current = first;
    onChange(toHHMM(first));
    holdTimer.current = setTimeout(() => {
      holdInterv.current = setInterval(() => {
        const next = ((minsRef.current + dir * 5) % 1440 + 1440) % 1440;
        minsRef.current = next;
        onChange(toHHMM(next));
        tapLight();
      }, 100);
    }, 350);
  };

  useEffect(() => clearHold, []);

  // ── swipe ───────────────────────────────────────────────────────────────
  const swipeStartY = useRef(0);
  const swipeSteps  = useRef(0);
  const PX_PER_STEP = 12;

  // ── keyboard entry ──────────────────────────────────────────────────────
  const openEdit = () => {
    setDraft(value.replace(":", "")); // pre-fill "09:30" → "0930"
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const commit = (raw: string) => {
    const d = raw.replace(/\D/g, "");
    let h = 0, m = 0;
    if      (d.length === 4) { h = parseInt(d.slice(0, 2)); m = parseInt(d.slice(2)); }
    else if (d.length === 3) { h = parseInt(d[0]);          m = parseInt(d.slice(1)); }
    else if (d.length <= 2)  { h = parseInt(d) || 0; }
    if (!isNaN(h) && !isNaN(m) && h <= 23 && m <= 59) {
      onChange(toHHMM(h * 60 + Math.round(m / 5) * 5));
    }
    setEditing(false);
    setDraft("");
  };

  // ── render ──────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>

      {/* − */}
      <Pressable
        style={({ pressed }) => [s.btn, pressed && s.btnPressed]}
        onPressIn={() => startHold(-1)}
        onPressOut={clearHold}
        hitSlop={4}
      >
        <Text style={s.btnText}>−</Text>
      </Pressable>

      <View style={s.sep} />

      {/* time display / keyboard input */}
      {editing ? (
        <TextInput
          ref={inputRef}
          style={s.input}
          value={draft}
          keyboardType="number-pad"
          maxLength={4}
          selectTextOnFocus
          placeholder={value.replace(":", "")}
          placeholderTextColor={colors.textTertiary}
          onChangeText={setDraft}
          onBlur={() => commit(draft)}
          onSubmitEditing={() => commit(draft)}
        />
      ) : (
        <View
          style={s.display}
          onStartShouldSetResponder={() => true}
          onResponderGrant={(e) => {
            swipeStartY.current = e.nativeEvent.pageY;
            swipeSteps.current  = 0;
          }}
          onResponderMove={(e) => {
            const steps = Math.floor(-(e.nativeEvent.pageY - swipeStartY.current) / PX_PER_STEP);
            const delta = steps - swipeSteps.current;
            if (delta) {
              swipeSteps.current = steps;
              const next = ((minsRef.current + delta * 5) % 1440 + 1440) % 1440;
              minsRef.current = next;
              onChange(toHHMM(next));
              tapLight();
            }
          }}
          onResponderRelease={(e) => {
            if (
              Math.abs(e.nativeEvent.pageY - swipeStartY.current) < 6 &&
              swipeSteps.current === 0
            ) {
              openEdit();
            }
          }}
        >
          <Text style={s.timeText}>{value}</Text>
        </View>
      )}

      <View style={s.sep} />

      {/* + */}
      <Pressable
        style={({ pressed }) => [s.btn, pressed && s.btnPressed]}
        onPressIn={() => startHold(1)}
        onPressOut={clearHold}
        hitSlop={4}
      >
        <Text style={s.btnText}>+</Text>
      </Pressable>

    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const H = 46;

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: H,
    overflow: "hidden",
  },

  // ── − / + buttons (flex:1 each = 20% of container) ──────────────────────
  btn: {
    flex: 1,
    height: H,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPressed: {
    backgroundColor: colors.brandSoft,
  },
  btnText: {
    fontSize: 20,
    fontWeight: "300",
    color: colors.brand,
    includeFontPadding: false,
  },

  // ── thin vertical rule between button and display ────────────────────────
  sep: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },

  // ── time display chip (flex:3 = 60% of container) ───────────────────────
  display: {
    flex: 3,
    height: H,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  timeText: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 2,
    includeFontPadding: false,
  },

  // ── keyboard input (same zone, brand colour while editing) ───────────────
  input: {
    flex: 3,
    height: H,
    fontSize: 20,
    fontWeight: "700",
    color: colors.brand,
    textAlign: "center",
    letterSpacing: 2,
    paddingVertical: 0,
    includeFontPadding: false,
    backgroundColor: colors.surface,
  },
});
