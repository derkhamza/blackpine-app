/**
 * VitalsTrendChart
 *
 * Renders stacked line-charts for each vital metric recorded across a
 * patient's appointments (BP, HR, temperature, SpO₂, weight).
 *
 * • Built purely on react-native-svg — no extra dependencies.
 * • Abnormal readings are highlighted in red with a ⚠ badge.
 * • Shows "latest value" chip even when there is only one data point
 *   (no trend line in that case).
 * • BP draws two lines (systolic + diastolic) on the same axis.
 */

import { useMemo } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, {
  Circle,
  G,
  Line as SvgLine,
  Polyline,
  Text as SvgText,
} from "react-native-svg";
import { Appointment, ExamResult } from "../lib/cabinetTypes";
import { ColorPalette, radii, spacing } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";

// ── Layout constants ──────────────────────────────────────────────────────────

const PAD_L = 36;   // left padding (y-axis labels)
const PAD_R = 10;   // right padding
const PAD_T = 14;   // top padding
const PAD_B = 22;   // bottom padding (x-axis date labels)
const PLOT_H = 72;  // inner plotting area height
const SVG_H = PAD_T + PLOT_H + PAD_B;
const DOT_R = 4.5;

// ── Helpers ───────────────────────────────────────────────────────────────────

function dateLbl(d: string): string {
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
}

function niceRange(vals: number[]): { lo: number; hi: number } {
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || lo * 0.1 || 1;
  return { lo: lo - span * 0.12, hi: hi + span * 0.12 };
}

function vy(val: number, lo: number, hi: number): number {
  const ratio = hi === lo ? 0.5 : (val - lo) / (hi - lo);
  return PAD_T + PLOT_H - ratio * PLOT_H;
}

function vx(idx: number, total: number, plotW: number): number {
  if (total <= 1) return PAD_L + plotW / 2;
  return PAD_L + (idx / (total - 1)) * plotW;
}

function fmtLabel(v: number, decimals = 0): string {
  return v.toFixed(decimals);
}

// ── Data types ────────────────────────────────────────────────────────────────

interface Pt {
  date: string;
  lbl: string;
  val: number;
  bad: boolean;
}

interface BpPt {
  date: string;
  lbl: string;
  sys: number;
  dia: number;
  sysBad: boolean;
  diaBad: boolean;
}

// ── Shared: axis grid ─────────────────────────────────────────────────────────

function Grid({ plotW, colors: c }: { plotW: number; colors: ColorPalette }) {
  const yTop = PAD_T;
  const yBot = PAD_T + PLOT_H;
  const yMid = (yTop + yBot) / 2;
  return (
    <>
      <SvgLine x1={PAD_L} y1={yTop} x2={PAD_L + plotW} y2={yTop}
        stroke={c.border} strokeWidth={1} strokeDasharray="3,3" />
      <SvgLine x1={PAD_L} y1={yMid} x2={PAD_L + plotW} y2={yMid}
        stroke={c.border} strokeWidth={0.5} strokeDasharray="2,4" />
      <SvgLine x1={PAD_L} y1={yBot} x2={PAD_L + plotW} y2={yBot}
        stroke={c.border} strokeWidth={1} strokeDasharray="3,3" />
    </>
  );
}

// ── Single-metric chart ───────────────────────────────────────────────────────

function MetricChart({
  title,
  unit,
  color,
  points,
  decimals = 0,
  svgWidth,
  colors: c,
}: {
  title: string;
  unit: string;
  color: string;
  points: Pt[];
  decimals?: number;
  svgWidth: number;
  colors: ColorPalette;
}) {
  const styles = makeStyles(c);
  const latest = points[points.length - 1];
  const plotW = svgWidth - PAD_L - PAD_R;
  const { lo, hi } = niceRange(points.map((p) => p.val));

  const polyPts = points.map((p, i) =>
    `${vx(i, points.length, plotW)},${vy(p.val, lo, hi)}`
  ).join(" ");

  return (
    <View style={styles.section}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.metricTitle, { color }]}>{title}</Text>
        <View style={[
          styles.latestBadge,
          {
            backgroundColor: latest.bad ? c.danger + "12" : color + "12",
            borderColor: latest.bad ? c.danger + "44" : color + "33",
          },
        ]}>
          <Text style={[styles.latestVal, { color: latest.bad ? c.danger : color }]}>
            {latest.bad ? "⚠ " : ""}
            {fmtLabel(latest.val, decimals)} {unit}
          </Text>
        </View>
      </View>

      {/* Chart */}
      <Svg width={svgWidth} height={SVG_H}>
        <Grid plotW={plotW} colors={c} />

        {/* Y-axis labels */}
        <SvgText
          x={PAD_L - 4} y={PAD_T + 4}
          textAnchor="end" fontSize={8} fill={c.textTertiary}
        >
          {fmtLabel(hi, decimals)}
        </SvgText>
        <SvgText
          x={PAD_L - 4} y={PAD_T + PLOT_H + 4}
          textAnchor="end" fontSize={8} fill={c.textTertiary}
        >
          {fmtLabel(lo, decimals)}
        </SvgText>

        {/* Trend line */}
        {points.length > 1 && (
          <Polyline
            points={polyPts}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data dots + x labels */}
        {points.map((p, i) => {
          const x = vx(i, points.length, plotW);
          const y = vy(p.val, lo, hi);
          const dotStroke = p.bad ? c.danger : color;
          return (
            <G key={`${p.date}-${i}`}>
              <Circle cx={x} cy={y} r={DOT_R} fill={c.surface} stroke={dotStroke} strokeWidth={2} />
              <SvgText
                x={x} y={SVG_H - 3}
                textAnchor="middle" fontSize={7.5} fill={c.textTertiary}
              >
                {p.lbl}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

// ── Blood-pressure chart (two lines) ─────────────────────────────────────────

function BpChart({
  points,
  svgWidth,
  colors: c,
}: {
  points: BpPt[];
  svgWidth: number;
  colors: ColorPalette;
}) {
  const styles = makeStyles(c);
  const latest = points[points.length - 1];
  const plotW = svgWidth - PAD_L - PAD_R;
  const { lo, hi } = niceRange(points.flatMap((p) => [p.sys, p.dia]));

  const sysPoly = points.map((p, i) =>
    `${vx(i, points.length, plotW)},${vy(p.sys, lo, hi)}`
  ).join(" ");
  const diaPoly = points.map((p, i) =>
    `${vx(i, points.length, plotW)},${vy(p.dia, lo, hi)}`
  ).join(" ");

  const anyBad = latest.sysBad || latest.diaBad;

  return (
    <View style={styles.section}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.metricTitle, { color: c.brand }]}>Tension artérielle</Text>
        <View style={[
          styles.latestBadge,
          {
            backgroundColor: anyBad ? c.danger + "12" : c.brand + "12",
            borderColor: anyBad ? c.danger + "44" : c.brand + "33",
          },
        ]}>
          <Text style={[styles.latestVal, { color: anyBad ? c.danger : c.brand }]}>
            {anyBad ? "⚠ " : ""}{latest.sys}/{latest.dia} mmHg
          </Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.bpLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: c.brand }]} />
          <Text style={styles.legendText}>Systolique</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: c.success }]} />
          <Text style={styles.legendText}>Diastolique</Text>
        </View>
      </View>

      {/* Chart */}
      <Svg width={svgWidth} height={SVG_H}>
        <Grid plotW={plotW} colors={c} />

        <SvgText
          x={PAD_L - 4} y={PAD_T + 4}
          textAnchor="end" fontSize={8} fill={c.textTertiary}
        >
          {Math.round(hi)}
        </SvgText>
        <SvgText
          x={PAD_L - 4} y={PAD_T + PLOT_H + 4}
          textAnchor="end" fontSize={8} fill={c.textTertiary}
        >
          {Math.round(lo)}
        </SvgText>

        {/* Lines */}
        {points.length > 1 && (
          <>
            <Polyline points={sysPoly} fill="none" stroke={c.brand} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <Polyline points={diaPoly} fill="none" stroke={c.success} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}

        {/* Dots + x labels */}
        {points.map((p, i) => {
          const x = vx(i, points.length, plotW);
          return (
            <G key={`${p.date}-${i}`}>
              <Circle cx={x} cy={vy(p.sys, lo, hi)} r={DOT_R}
                fill={c.surface} stroke={p.sysBad ? c.danger : c.brand} strokeWidth={2} />
              <Circle cx={x} cy={vy(p.dia, lo, hi)} r={DOT_R}
                fill={c.surface} stroke={p.diaBad ? c.danger : c.success} strokeWidth={2} />
              <SvgText x={x} y={SVG_H - 3}
                textAnchor="middle" fontSize={7.5} fill={c.textTertiary}>
                {p.lbl}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface Props {
  appointments: Appointment[];
  examResults?: ExamResult[];
}

// Distinct colors cycled across lab-trend charts.
const LAB_COLORS = ["#1890C5", "#9B72D0", "#15A876", "#E8622A", "#0FB5C4", "#D4962A"];

export function VitalsTrendChart({ appointments, examResults }: Props) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const { width: screenW } = useWindowDimensions();
  // subtract modal horizontal padding on both sides
  const svgWidth = screenW - spacing.lg * 4;

  // Only appointments that have at least one vital recorded, sorted oldest→newest
  const appts = useMemo(
    () =>
      appointments
        .filter(
          (a) =>
            a.vitalSigns &&
            Object.values(a.vitalSigns).some((v) => v != null),
        )
        .sort((a, b) => a.date.localeCompare(b.date)),
    [appointments],
  );

  const bpPts = useMemo<BpPt[]>(
    () =>
      appts
        .filter((a) => a.vitalSigns?.bpSys != null && a.vitalSigns?.bpDia != null)
        .map((a) => ({
          date: a.date,
          lbl: dateLbl(a.date),
          sys: a.vitalSigns!.bpSys!,
          dia: a.vitalSigns!.bpDia!,
          sysBad: a.vitalSigns!.bpSys! > 140 || a.vitalSigns!.bpSys! < 90,
          diaBad: a.vitalSigns!.bpDia! > 90 || a.vitalSigns!.bpDia! < 60,
        })),
    [appts],
  );

  const hrPts = useMemo<Pt[]>(
    () =>
      appts
        .filter((a) => a.vitalSigns?.hr != null)
        .map((a) => ({
          date: a.date,
          lbl: dateLbl(a.date),
          val: a.vitalSigns!.hr!,
          bad: a.vitalSigns!.hr! > 100 || a.vitalSigns!.hr! < 50,
        })),
    [appts],
  );

  const tempPts = useMemo<Pt[]>(
    () =>
      appts
        .filter((a) => a.vitalSigns?.temp != null)
        .map((a) => ({
          date: a.date,
          lbl: dateLbl(a.date),
          val: a.vitalSigns!.temp!,
          bad: a.vitalSigns!.temp! > 38.5 || a.vitalSigns!.temp! < 36,
        })),
    [appts],
  );

  const spo2Pts = useMemo<Pt[]>(
    () =>
      appts
        .filter((a) => a.vitalSigns?.spo2 != null)
        .map((a) => ({
          date: a.date,
          lbl: dateLbl(a.date),
          val: a.vitalSigns!.spo2!,
          bad: a.vitalSigns!.spo2! < 95,
        })),
    [appts],
  );

  const weightPts = useMemo<Pt[]>(
    () =>
      appts
        .filter((a) => a.vitalSigns?.weight != null)
        .map((a) => ({
          date: a.date,
          lbl: dateLbl(a.date),
          val: a.vitalSigns!.weight!,
          bad: false,
        })),
    [appts],
  );

  // ── Lab-value trends: group numeric exam values by label across dates ────────
  const labSeries = useMemo(() => {
    const byLabel: Record<string, { label: string; unit: string; pts: Pt[] }> = {};
    const exams = [...(examResults ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    for (const e of exams) {
      for (const v of e.values) {
        const num = parseFloat(String(v.value ?? "").replace(",", ".").replace(/[^\d.\-]/g, ""));
        if (!isFinite(num) || !v.label?.trim()) continue;
        const key = v.label.trim().toLowerCase();
        const bad = v.isAbnormal === true
          || (v.refMin != null && num < v.refMin)
          || (v.refMax != null && num > v.refMax);
        const s = (byLabel[key] ??= { label: v.label.trim(), unit: v.unit ?? "", pts: [] });
        if (v.unit) s.unit = v.unit;
        s.pts.push({ date: e.date, lbl: dateLbl(e.date), val: num, bad });
      }
    }
    return Object.values(byLabel)
      .filter((s) => s.pts.length >= 2)
      .map((s) => {
        const mx = Math.max(...s.pts.map((p) => Math.abs(p.val)));
        return { ...s, decimals: mx < 10 ? 2 : mx < 100 ? 1 : 0 };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [examResults]);

  const hasAny =
    bpPts.length > 0 ||
    hrPts.length > 0 ||
    tempPts.length > 0 ||
    spo2Pts.length > 0 ||
    weightPts.length > 0 ||
    labSeries.length > 0;

  if (!hasAny) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyTitle}>Aucune mesure enregistrée</Text>
        <Text style={styles.emptyHint}>
          Saisissez les constantes lors des consultations pour voir les tendances ici.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {bpPts.length > 0 && (
        <BpChart points={bpPts} svgWidth={svgWidth} colors={colors} />
      )}
      {hrPts.length > 0 && (
        <MetricChart
          title="Fréquence cardiaque"
          unit="bpm"
          color={colors.success}
          points={hrPts}
          svgWidth={svgWidth}
          colors={colors}
        />
      )}
      {tempPts.length > 0 && (
        <MetricChart
          title="Température"
          unit="°C"
          color={colors.gold}
          points={tempPts}
          decimals={1}
          svgWidth={svgWidth}
          colors={colors}
        />
      )}
      {spo2Pts.length > 0 && (
        <MetricChart
          title="SpO₂"
          unit="%"
          color="#2BA3B6"
          points={spo2Pts}
          svgWidth={svgWidth}
          colors={colors}
        />
      )}
      {weightPts.length > 0 && (
        <MetricChart
          title="Poids"
          unit="kg"
          color={colors.textSecondary}
          points={weightPts}
          decimals={1}
          svgWidth={svgWidth}
          colors={colors}
        />
      )}

      {labSeries.length > 0 && (
        <>
          <Text style={styles.groupLabel}>Analyses biologiques</Text>
          {labSeries.map((s, i) => (
            <MetricChart
              key={s.label}
              title={s.label}
              unit={s.unit}
              color={LAB_COLORS[i % LAB_COLORS.length]}
              points={s.pts}
              decimals={s.decimals}
              svgWidth={svgWidth}
              colors={colors}
            />
          ))}
        </>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      gap: spacing.md,
    },

    groupLabel: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.4,
      textTransform: "uppercase",
      color: colors.textTertiary,
      marginTop: spacing.xs,
    },

    section: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.xs,
    },

    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    metricTitle: {
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.1,
    },

    latestBadge: {
      borderRadius: radii.pill,
      borderWidth: 1,
      paddingHorizontal: 9,
      paddingVertical: 3,
    },

    latestVal: {
      fontSize: 12,
      fontWeight: "700",
    },

    // BP legend
    bpLegend: {
      flexDirection: "row",
      gap: spacing.md,
      marginBottom: 2,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    legendDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    legendText: {
      fontSize: 10,
      color: colors.textSecondary,
    },

    // Empty state
    empty: {
      paddingVertical: spacing.xl * 2,
      alignItems: "center",
      gap: spacing.sm,
    },
    emptyIcon: { fontSize: 40 },
    emptyTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    emptyHint: {
      fontSize: 12,
      color: colors.textTertiary,
      textAlign: "center",
      maxWidth: 260,
      lineHeight: 17,
    },
  });
