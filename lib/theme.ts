// Centralized design tokens for the entire app.
// Change a value here and it propagates everywhere.

export const colors = {
  // Surfaces
  bg: "#F5F4EF",          // page background, warm off-white
  surface: "#FFFFFF",     // cards
  surfaceAlt: "#FAF8F2",  // subtle alt surfaces
  surfaceDark: "#0E1410", // hero card, dark surfaces

  // Text
  textPrimary: "#1A1F1B",
  textSecondary: "#6B6F6B",
  textTertiary: "#9CA09C",
  textOnDark: "#FFFFFF",
  textOnDarkMuted: "#9DA39E",

  // Borders & dividers
  border: "#E6E2D8",
  borderStrong: "#D4CFC2",

  // Brand & accent
  brand: "#1F3A2E",       // deep blackpine green
  brandSoft: "#E6EDE9",   // subtle brand-tinted background
  gold: "#B8923A",        // warm gold accent

  // Semantic
  success: "#2D6A2D",
  successSoft: "#E8F2E8",
  warning: "#A37B1F",
  warningSoft: "#FBF3DE",
  danger: "#A04A4A",
  dangerSoft: "#F4E4E4",

  // Recette / charge accents (kept distinct but more refined)
  recette: "#2D6A4F",
  recetteSoft: "#E8F1ED",
  charge: "#8A4F1F",
  chargeSoft: "#F5EDE2",
};

export const radii = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const typography = {
  // Use a unified type scale; weights kept restrained.
  display: { fontSize: 40, fontWeight: "700" as const, letterSpacing: -0.5 },
  h1: { fontSize: 26, fontWeight: "700" as const, letterSpacing: -0.3 },
  h2: { fontSize: 18, fontWeight: "600" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  bodyStrong: { fontSize: 15, fontWeight: "600" as const },
  caption: { fontSize: 13, fontWeight: "400" as const },
  micro: { fontSize: 11, fontWeight: "500" as const, letterSpacing: 0.5 },
  mono: { fontSize: 11, fontFamily: "Courier" as const },
};

export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  hero: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
};