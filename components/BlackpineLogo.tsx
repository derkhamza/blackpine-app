import Svg, { G, Path, Rect } from "react-native-svg";

/**
 * BlackpineLogo — the app mark (refined stethoscope, no chestpiece), mirroring
 * the web logo. The centering offset (translate 0,4.5) is baked into the path
 * coordinates so it renders consistently across react-native-svg versions.
 *
 *   <BlackpineLogo size={40} color="#fff" />              // bare mark
 *   <BlackpineLogo size={72} tile />                       // on a navy tile
 */
export function BlackpineLogo({
  size = 72,
  color = "#fff",
  tile = false,
  tileColor = "#0A4E7E",
  radius = 16,
}: {
  size?: number;
  color?: string;
  tile?: boolean;
  tileColor?: string;
  radius?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72">
      {tile && <Rect width={72} height={72} rx={radius} fill={tileColor} />}
      <G fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M24 20.5 v10 a10 10 0 0 0 20 0 V20.5" />
        <Path d="M34 48.5 a9 9 0 0 0 14 0" />
        <Path d="M34 48.5 V40.5 M48 48.5 V40.5" />
      </G>
    </Svg>
  );
}
