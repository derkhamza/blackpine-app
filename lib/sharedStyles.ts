/**
 * Style constants shared across all bottom-sheet modals and forms.
 *
 * Use makeSharedStyles(useColors()) inside any component for theme-aware styles.
 * The legacy `sharedModalStyles` export is kept for backward-compat but always
 * uses the light palette — prefer the factory wherever useColors() is available.
 */
import { StyleSheet } from "react-native";
import { lightColors, ColorPalette, radii, spacing, typography } from "./theme";

export function makeSharedStyles(colors: ColorPalette) {
  return StyleSheet.create({
    /** Full-screen semi-transparent overlay (modal backdrop). */
    overlay: {
      flex: 1,
      justifyContent: "flex-end" as const,
      backgroundColor: colors.surfaceDark + "50",
    },

    /** Bottom sheet panel — background tracks the current theme. */
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      paddingHorizontal: spacing.lg,
      maxHeight: "92%" as const,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.14,
      shadowRadius: 20,
      elevation: 24,
    },

    /** Small drag-handle bar at the top of every sheet. */
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.borderStrong,
      alignSelf: "center" as const,
      marginTop: 10,
      marginBottom: spacing.md,
    },

    /** Row with title + close button. */
    header: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      marginBottom: spacing.lg,
    },

    /** Modal heading text. */
    title: {
      ...typography.h3,
      color: colors.textPrimary,
      fontWeight: "800" as const,
      letterSpacing: -0.3,
    },

    /** Uppercase micro-label above form inputs. */
    formLabel: {
      fontSize: 11,
      fontWeight: "600" as const,
      color: colors.brand,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
      marginBottom: 6,
      marginTop: spacing.md,
    },

    /** Standard bordered text input — background + border adapt to theme. */
    formInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 15,
      color: colors.textPrimary,
      backgroundColor: colors.bg,
    },

    /** Overlay this on formInput when the field is focused. */
    formInputFocused: {
      borderColor: colors.brand,
      borderWidth: 1.5,
      backgroundColor: colors.surface,
    },

    /** Multi-line textarea variant. */
    formTextarea: {
      height: 80,
      paddingTop: 12,
      textAlignVertical: "top" as const,
    },

    /** Primary CTA button inside modals. */
    saveBtn: {
      backgroundColor: colors.brand,
      borderRadius: radii.lg,
      paddingVertical: 15,
      alignItems: "center" as const,
      marginTop: spacing.md,
      shadowColor: colors.brand,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 10,
      elevation: 4,
    },

    saveBtnDisabled: {
      backgroundColor: colors.borderStrong,
      shadowOpacity: 0,
      elevation: 0,
    },

    saveBtnText: {
      color: colors.textOnDark,
      fontWeight: "700" as const,
      fontSize: 15,
      letterSpacing: 0.2,
    },
  });
}

/** Backward-compat alias using the light palette. Prefer makeSharedStyles(useColors()). */
export const sharedModalStyles = makeSharedStyles(lightColors);
