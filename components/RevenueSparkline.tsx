import { useWindowDimensions } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { spacing } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";

// Total horizontal space eaten up outside the sparkline:
// screen content padding (spacing.lg each side) + card padding (spacing.lg each side)
const H_INSET = spacing.lg * 4; // 80 px

const SPARK_H = 64;
const V_PAD = 8;

interface Props {
  /** Daily revenue values — index 0 = day 1 of the month, last entry = today. */
  data: number[];
}

export function RevenueSparkline({ data }: Props) {
  const colors = useColors();
  const { width: screenW } = useWindowDimensions();
  const W = Math.max(screenW - H_INSET, 10);
  const chartH = SPARK_H - V_PAD * 2;

  if (data.length < 2) return null;

  const max = Math.max(...data, 1);
  const hasRevenue = data.some((v) => v > 0);

  const pts = data.map((v, i) => ({
    x: parseFloat(((i / (data.length - 1)) * W).toFixed(2)),
    y: parseFloat((V_PAD + chartH - (v / max) * chartH).toFixed(2)),
  }));

  // Smooth cubic bezier through all points
  let line = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cp = (pts[i].x - pts[i - 1].x) / 2;
    line += ` C ${(pts[i - 1].x + cp).toFixed(2)} ${pts[i - 1].y},${(pts[i].x - cp).toFixed(2)} ${pts[i].y},${pts[i].x} ${pts[i].y}`;
  }

  const area = `${line} L ${pts[pts.length - 1].x} ${SPARK_H} L ${pts[0].x} ${SPARK_H} Z`;

  const strokeColor = hasRevenue ? colors.recette : colors.border;
  const strokeW     = hasRevenue ? 2 : 1;

  return (
    <Svg width={W} height={SPARK_H}>
      <Defs>
        <LinearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%"   stopColor={colors.recette} stopOpacity={hasRevenue ? "0.20" : "0"} />
          <Stop offset="100%" stopColor={colors.recette} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d={area} fill="url(#sparkGrad)" />
      <Path
        d={line}
        stroke={strokeColor}
        strokeWidth={strokeW}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Today dot — white-filled circle at the last data point */}
      {hasRevenue && (
        <>
          <Circle
            cx={pts[pts.length - 1].x}
            cy={pts[pts.length - 1].y}
            r={4.5}
            fill={colors.recette}
          />
          <Circle
            cx={pts[pts.length - 1].x}
            cy={pts[pts.length - 1].y}
            r={2.5}
            fill={colors.surface}
          />
        </>
      )}
    </Svg>
  );
}
