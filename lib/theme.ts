export const colors = {
  // Surfaces — warmer, softer
  bg: "#FAFAF7",
  surface: "#FFFFFF",
  surfaceAlt: "#F6F5F0",
  surfaceDark: "#1B2A3D",

  // Text — softer blacks, better contrast hierarchy
  textPrimary: "#2C3E50",
  textSecondary: "#7F8C8D",
  textTertiary: "#BDC3C7",
  textOnDark: "#FFFFFF",
  textOnDarkMuted: "#A8C0D0",

  // Borders — lighter, more airy
  border: "#ECE9E1",
  borderStrong: "#D5D0C5",

  // Brand — richer teal-green, more vibrant
  brand: "#1A7F64",
  brandSoft: "#E3F5EF",
  brandDark: "#0F5C47",
  gold: "#D4A843",
  goldSoft: "#FDF5E6",

  // Semantic — friendlier tones
  success: "#27AE60",
  successSoft: "#E8F8F0",
  warning: "#F39C12",
  warningSoft: "#FEF5E7",
  danger: "#E74C3C",
  dangerSoft: "#FDEDEC",

  // Recette / charge — clearer distinction
  recette: "#27AE60",
  recetteSoft: "#E8F8F0",
  charge: "#E67E22",
  chargeSoft: "#FDF2E9",
};

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
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
  display: { fontSize: 38, fontWeight: "800" as const, letterSpacing: -0.5 },
  h1: { fontSize: 24, fontWeight: "700" as const, letterSpacing: -0.3 },
  h2: { fontSize: 18, fontWeight: "600" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  bodyStrong: { fontSize: 15, fontWeight: "600" as const },
  caption: { fontSize: 13, fontWeight: "400" as const },
  micro: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 0.8 },
  mono: { fontSize: 11, fontFamily: "Courier" as const },
};

export const shadows = {
  card: {
    shadowColor: "#1A7F64",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  hero: {
    shadowColor: "#1B2A3D",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5,
  },
};