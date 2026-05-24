import { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { typography, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { WEB_NAV_HEIGHT } from "../lib/webConstants";

// Web-only: position fixed must be gated so React Native doesn't evaluate it on native
const webFixed =
  Platform.OS === "web"
    ? ({
        position: "fixed" as any,
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        boxShadow: "0 1px 0 rgba(0,0,0,0.08)",
      } as object)
    : {};

export function WebNavBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <>
      <View style={[styles.navbar, webFixed]}>
        <View style={styles.inner}>
          <View style={styles.brand}>
            <Text style={styles.brandText}>BLACKPINE</Text>
            <Text style={styles.brandSub}>CABINET</Text>
          </View>

          <View style={styles.links}>
            {state.routes.map((route, index) => {
              const opts = descriptors[route.key].options;
              // Skip tabs that use a custom tabBarButton (hidden tabs)
              if (opts.tabBarButton) return null;
              const isFocused = state.index === index;
              const label =
                typeof opts.tabBarLabel === "string"
                  ? opts.tabBarLabel
                  : route.name;
              return (
                <Pressable
                  key={route.key}
                  onPress={() => navigation.navigate(route.name, route.params as any)}
                  style={({ pressed }) => [styles.link, isFocused && styles.linkActive, pressed && styles.linkPressed]}
                >
                  {opts.tabBarIcon?.({
                    focused: isFocused,
                    color: isFocused ? colors.brand : colors.textSecondary,
                    size: 16,
                  })}
                  <Text style={[styles.linkLabel, isFocused && styles.linkLabelActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
      {/* Spacer so content isn't hidden under the fixed bar */}
      <View style={{ height: WEB_NAV_HEIGHT }} />
    </>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  navbar: {
    height: WEB_NAV_HEIGHT,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  inner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    maxWidth: 1280,
    alignSelf: "center",
    width: "100%",
  },
  brand: {
    marginRight: 40,
  },
  brandText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 3,
    color: colors.brand,
  },
  brandSub: {
    fontSize: 8,
    letterSpacing: 2,
    color: colors.textTertiary,
    marginTop: -2,
  },
  links: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  linkActive: {
    backgroundColor: "#EAF0EC",
  },
  linkPressed: {
    opacity: 0.7,
  },
  linkLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  linkLabelActive: {
    color: colors.brand,
  },
});
