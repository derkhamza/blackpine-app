import { useMemo } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { colors, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";

interface Props {
  children: React.ReactNode;
}

// Inject global web CSS once
if (Platform.OS === "web" && typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    html, body, #root { height: 100%; margin: 0; padding: 0; background: ${colors.bg}; }
    * { box-sizing: border-box; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 3px; }
  `;
  document.head.appendChild(style);
}

export function WebAppShell({ children }: Props) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.shell}>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
  },
  content: {
    flex: 1,
    width: "100%",
    maxWidth: 1280,
  },
});
