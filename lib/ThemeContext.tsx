/**
 * Theme context — provides dark / light / system colour scheme preference.
 * Every component that needs theme-aware colours calls useColors().
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import { useColorScheme } from "react-native";
import { lightColors, darkColors, ColorPalette } from "./theme";
import { loadThemeMode, saveThemeMode, ThemeMode } from "./storage";

// ─── Context shape ────────────────────────────────────────────────────────────

interface ThemeState {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ColorPalette;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeState | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");

  // Load persisted preference on mount
  useEffect(() => {
    loadThemeMode().then(setThemeModeState);
  }, []);

  const isDark = useMemo(() => {
    if (themeMode === "dark") return true;
    if (themeMode === "light") return false;
    return systemScheme === "dark";
  }, [themeMode, systemScheme]);

  const colors = useMemo<ColorPalette>(
    () => (isDark ? darkColors : lightColors),
    [isDark],
  );

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await saveThemeMode(mode);
  }, []);

  const value = useMemo<ThemeState>(
    () => ({ themeMode, isDark, colors, setThemeMode }),
    [themeMode, isDark, colors, setThemeMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

/** Convenience — just the colour palette. Most components use this. */
export function useColors(): ColorPalette {
  return useTheme().colors;
}
