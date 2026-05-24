import { Platform, StatusBar, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../lib/ThemeContext";
import { WEB_NAV_HEIGHT, WEB_BREAKPOINT } from "../lib/webConstants";

/**
 * Returns the correct top inset for the current platform.
 *
 * On Android, `useSafeAreaInsets().top` can return 0 on Samsung devices
 * running Android 15 (edge-to-edge enforced) if the native configuration
 * hasn't declared the status bar as translucent. We fall back to
 * `StatusBar.currentHeight` which is always populated by React Native.
 */
export function useTopInset(): number {
  const insets = useSafeAreaInsets();
  if (Platform.OS === "android") {
    return Math.max(insets.top, StatusBar.currentHeight ?? 0);
  }
  return insets.top;
}

interface Props {
  children: React.ReactNode;
  backgroundColor?: string;
}

export function SafeScreen({ children, backgroundColor }: Props) {
  const colors = useColors();
  const topInset = useTopInset();
  const { width } = useWindowDimensions();
  const isWebWide = Platform.OS === "web" && width >= WEB_BREAKPOINT;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: isWebWide ? WEB_NAV_HEIGHT : topInset,
          backgroundColor: backgroundColor || colors.bg,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
