// ─── Palette type ─────────────────────────────────────────────────────────────

export type ColorPalette = typeof lightColors;

// ─── Light palette ────────────────────────────────────────────────────────────

export const lightColors = {
  // Core backgrounds — soft medical blue-white
  bg: "#EFF6FB",
  surface: "#FFFFFF",
  surfaceAlt: "#E2EFF8",
  surfaceDark: "#0A4E7E",       // Deep marine blue — hero cards

  // Text hierarchy — blue-black tones
  textPrimary: "#122B42",       // Dark navy (clinical print quality)
  textSecondary: "#4A6C84",     // Muted blue-grey
  textTertiary: "#91B2C6",      // Light blue-grey
  textOnDark: "#FFFFFF",
  textOnDarkMuted: "#9DCCE6",

  // Borders — airy blue
  border: "#C6DEF0",
  borderStrong: "#93BACD",

  // Brand — medical teal-blue
  brand: "#1890C5",
  brandSoft: "#D4EDF9",
  brandDark: "#0C6E9B",
  gold: "#D4962A",
  goldSoft: "#FBF0DD",

  // Semantic
  success: "#15A876",
  successSoft: "#D4F2E8",
  warning: "#E89010",
  warningSoft: "#FEF3DC",
  danger: "#E04040",
  dangerSoft: "#FDDEDE",

  // Transaction types
  recette: "#15A876",           // Rich emerald — income = health
  recetteSoft: "#D4F2E8",
  charge: "#E85B5B",            // Soft coral — expenses (not harsh orange)
  chargeSoft: "#FDEAEA",
};

// ─── Dark palette ─────────────────────────────────────────────────────────────

export const darkColors: ColorPalette = {
  // Core backgrounds — deep navy
  bg: "#0D1B2A",
  surface: "#142333",
  surfaceAlt: "#1C2F40",
  surfaceDark: "#0A4E7E",       // Same — hero cards

  // Text hierarchy
  textPrimary: "#E8F4FF",
  textSecondary: "#7AACC4",
  textTertiary: "#5D8FA8",
  textOnDark: "#FFFFFF",
  textOnDarkMuted: "#9DCCE6",

  // Borders
  border: "#1E3347",
  borderStrong: "#2B4A63",

  // Brand — same hue, adjusted softs
  brand: "#1890C5",
  brandSoft: "#0B1E2E",
  brandDark: "#0C6E9B",
  gold: "#D4962A",
  goldSoft: "#1E1508",

  // Semantic — vivid colours stay, softs go dark
  success: "#15A876",
  successSoft: "#0A1F17",
  warning: "#E89010",
  warningSoft: "#1E1808",
  danger: "#E04040",
  dangerSoft: "#1E0A0A",

  // Transaction types
  recette: "#15A876",
  recetteSoft: "#0A1F17",
  charge: "#E85B5B",
  chargeSoft: "#1E0D0D",
};

// ─── Default export (backward-compat alias for light palette) ─────────────────
// Components that import `colors` directly from theme get the light palette.
// Prefer useColors() from ThemeContext for theme-aware colours.

export const colors = lightColors;

export const radii = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 32,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 40,
};

export const typography = {
  display: { fontSize: 38, fontWeight: "800" as const, letterSpacing: -0.8 },
  h1: { fontSize: 24, fontWeight: "700" as const, letterSpacing: -0.4 },
  h2: { fontSize: 18, fontWeight: "600" as const },
  h3: { fontSize: 16, fontWeight: "700" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  bodyStrong: { fontSize: 15, fontWeight: "600" as const },
  caption: { fontSize: 13, fontWeight: "400" as const },
  micro: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 0.5 },
  mono: { fontSize: 11, fontFamily: "Courier" as const },
};

export const shadows = {
  card: {
    shadowColor: "#1890C5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  hero: {
    shadowColor: "#0A4E7E",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 6,
  },
};
