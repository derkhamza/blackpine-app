/**
 * DatePickerField — tap the display to reveal an inline 3-column drum picker.
 *
 * Columns:  [ Day ]  [ Month ]  [ Year ]
 *
 * Each column:
 *  – Tap [+] / [−]     → step by 1
 *  – Hold [+] / [−]    → rapid repeat (80 ms interval after 300 ms delay)
 *  – Swipe up / down   → scroll through values (10 px per step)
 *
 * No native DateTimePicker — avoids the "tap back 360 times" problem for DOB.
 */
import React, { useEffect, useRef, useState, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "../lib/icons";
import { radii, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { tapLight } from "../lib/haptics";

// ── locale ────────────────────────────────────────────────────────────────────

const MONTHS_FR = [
  "Janv", "Févr", "Mars", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sept", "Oct", "Nov", "Déc",
];

// ── helpers ───────────────────────────────────────────────────────────────────

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate(); // month 1-based
}

function parseIso(iso: string): { y: number; m: number; d: number } {
  if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-").map(Number);
    return { y, m, d };
  }
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
}

function toIso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function formatDisplay(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "—";
  return new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ── DrumCol ───────────────────────────────────────────────────────────────────

interface DrumColProps {
  value: number;
  label: string;          // formatted display string for the value
  min: number;
  max: number;
  wrap?: boolean;         // true = wrap around (day/month), false = clamp (year)
  onChange: (v: number) => void;
  flex?: number;
}

function DrumCol({ value, label, min, max, wrap = true, onChange, flex = 1 }: DrumColProps) {
  const colors = useColors();
  const s = useColStyles(colors);

  const valRef = useRef(value);
  useEffect(() => { valRef.current = value; }, [value]);

  const move = (dir: 1 | -1) => {
    let next = valRef.current + dir;
    if (wrap) {
      if (next < min) next = max;
      else if (next > max) next = min;
    } else {
      next = Math.max(min, Math.min(max, next));
    }
    if (next === valRef.current) return;
    valRef.current = next;
    onChange(next);
    tapLight();
  };

  // ── hold-to-repeat ──────────────────────────────────────────────────────────
  const holdTimer  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const holdInterv = useRef<ReturnType<typeof setInterval> | null>(null);
  const clearHold  = () => {
    if (holdTimer.current)  clearTimeout(holdTimer.current);
    if (holdInterv.current) clearInterval(holdInterv.current);
  };
  const startHold = (dir: 1 | -1) => {
    move(dir);
    holdTimer.current = setTimeout(() => {
      holdInterv.current = setInterval(() => move(dir), 80);
    }, 300);
  };
  useEffect(() => clearHold, []);

  // ── swipe ───────────────────────────────────────────────────────────────────
  const swipeStartY = useRef(0);
  const swipeAccum  = useRef(0);
  const PX_PER_STEP = 10;

  return (
    <View style={[s.col, { flex }]}>
      {/* ＋ */}
      <Pressable
        style={({ pressed }) => [s.btn, pressed && s.btnPressed]}
        onPressIn={() => startHold(1)}
        onPressOut={clearHold}
        hitSlop={6}
      >
        <Text style={s.btnText}>+</Text>
      </Pressable>

      {/* value */}
      <View
        style={s.display}
        onStartShouldSetResponder={() => true}
        onResponderGrant={(e) => {
          swipeStartY.current = e.nativeEvent.pageY;
          swipeAccum.current  = 0;
        }}
        onResponderMove={(e) => {
          const steps = Math.floor(-(e.nativeEvent.pageY - swipeStartY.current) / PX_PER_STEP);
          const delta = steps - swipeAccum.current;
          if (delta) {
            swipeAccum.current = steps;
            // step delta times
            for (let i = 0; i < Math.abs(delta); i++) move(delta > 0 ? 1 : -1);
          }
        }}
      >
        <Text style={s.valueText} numberOfLines={1} adjustsFontSizeToFit>
          {label}
        </Text>
      </View>

      {/* − */}
      <Pressable
        style={({ pressed }) => [s.btn, pressed && s.btnPressed]}
        onPressIn={() => startHold(-1)}
        onPressOut={clearHold}
        hitSlop={6}
      >
        <Text style={s.btnText}>−</Text>
      </Pressable>
    </View>
  );
}

// ── DateDrumPicker ─────────────────────────────────────────────────────────────

interface DrumProps {
  value: string;
  onChange: (iso: string) => void;
  maxYear?: number;
  minYear?: number;
}

function DateDrumPicker({ value, onChange, maxYear, minYear = 1920 }: DrumProps) {
  const colors = useColors();
  const s = useDrumStyles(colors);

  const init = parseIso(value);
  const [y, setY] = useState(init.y);
  const [m, setM] = useState(init.m);
  const [d, setD] = useState(init.d);

  const curYear = maxYear ?? new Date().getFullYear() + 10;

  // Keep state in sync when the parent value changes (e.g. reset)
  useEffect(() => {
    const p = parseIso(value);
    setY(p.y); setM(p.m); setD(p.d);
  }, [value]);

  const emit = (ny: number, nm: number, nd: number) => {
    const maxD = daysInMonth(ny, nm);
    const safeD = Math.min(nd, maxD);
    setD(safeD);
    onChange(toIso(ny, nm, safeD));
  };

  const handleDay   = (nd: number) => { setD(nd); emit(y, m, nd); };
  const handleMonth = (nm: number) => { setM(nm); emit(y, nm, d); };
  const handleYear  = (ny: number) => { setY(ny); emit(ny, m, d); };

  const maxD = daysInMonth(y, m);

  return (
    <View style={s.drum}>
      {/* Day */}
      <DrumCol
        value={d}
        label={String(d)}
        min={1}
        max={maxD}
        wrap
        onChange={handleDay}
        flex={2}
      />

      <View style={s.sep} />

      {/* Month */}
      <DrumCol
        value={m}
        label={MONTHS_FR[m - 1]}
        min={1}
        max={12}
        wrap
        onChange={handleMonth}
        flex={3}
      />

      <View style={s.sep} />

      {/* Year */}
      <DrumCol
        value={y}
        label={String(y)}
        min={minYear}
        max={curYear}
        wrap={false}
        onChange={handleYear}
        flex={3}
      />
    </View>
  );
}

// ── DatePickerField (public) ──────────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (iso: string) => void;
  style?: object;
  maxDate?: Date;
  minDate?: Date;
}

export function DatePickerField({ value, onChange, style, maxDate, minDate }: Props) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);

  // When maxDate is provided (e.g. DOB ≤ today), use its year.
  // When omitted (e.g. appointment booking), allow a generous future window.
  const maxYear = maxDate ? maxDate.getFullYear() : new Date().getFullYear() + 10;
  const minYear = minDate ? minDate.getFullYear() : 1920;

  return (
    <View style={style}>
      {/* ── Tappable display ── */}
      <Pressable
        style={[styles.field, open && styles.fieldOpen]}
        onPress={() => setOpen((v) => !v)}
      >
        <Icon name="calendar" size={14} color={colors.brand} />
        <Text style={styles.text}>{formatDisplay(value)}</Text>
        <Text style={[styles.chevron, open && styles.chevronUp]}>›</Text>
      </Pressable>

      {/* ── Drum (inline, below display) ── */}
      {open && (
        <DateDrumPicker
          value={value}
          onChange={onChange}
          maxYear={maxYear}
          minYear={minYear}
        />
      )}
    </View>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const COL_H  = 36;  // height of each segment (btn / display / btn)
const DRUM_H = COL_H * 3;

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: colors.bg,
  },
  fieldOpen: {
    borderColor: colors.brand,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  text: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  chevron: {
    fontSize: 18,
    color: colors.brand,
    fontWeight: "300",
    transform: [{ rotate: "90deg" }],
    lineHeight: 20,
  },
  chevronUp: {
    transform: [{ rotate: "-90deg" }],
  },
});

function useDrumStyles(colors: ColorPalette) {
  return StyleSheet.create({
    drum: {
      flexDirection: "row",
      height: DRUM_H,
      borderWidth: 1,
      borderColor: colors.brand,
      borderTopWidth: 0,
      borderBottomLeftRadius: radii.md,
      borderBottomRightRadius: radii.md,
      backgroundColor: colors.surface,
      overflow: "hidden",
    },
    sep: {
      width: 1,
      backgroundColor: colors.border,
    },
  });
}

function useColStyles(colors: ColorPalette) {
  return StyleSheet.create({
    col: {
      alignItems: "center",
      justifyContent: "space-between",
    },
    btn: {
      width: "100%",
      height: COL_H,
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
      lineHeight: 24,
    },
    display: {
      width: "100%",
      height: COL_H,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.bg,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    valueText: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.textPrimary,
      includeFontPadding: false,
    },
  });
}
