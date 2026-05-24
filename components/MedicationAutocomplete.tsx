/**
 * MedicationAutocomplete
 *
 * A medication name TextInput that shows an inline suggestion list
 * as the doctor types. Suggestions come from the local Moroccan drug
 * database. Selecting a suggestion fills the medication field and
 * optionally pre-fills dosage / frequency / duration if those fields
 * are still empty.
 *
 * Renders inline (not absolutely positioned) so it works cleanly
 * inside a ScrollView without z-index issues.
 */

import { useRef, useState, useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { DrugEntry, searchDrugs } from "../lib/moroccanDrugs";
import { ColorPalette, radii, spacing, typography } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { Icon } from "../lib/icons";

interface Props extends Omit<TextInputProps, "onChangeText"> {
  value: string;
  /** Called whenever the raw text changes (same as TextInput.onChangeText) */
  onChangeText: (text: string) => void;
  /**
   * Called when the user selects a suggestion from the dropdown.
   * Receives the full DrugEntry so the parent can auto-fill dosage etc.
   */
  onSelectDrug?: (drug: DrugEntry) => void;
  /** Label override for the suggestion section header */
  suggestionsLabel?: string;
}

export function MedicationAutocomplete({
  value,
  onChangeText,
  onSelectDrug,
  suggestionsLabel,
  style,
  ...rest
}: Props) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const [suggestions, setSuggestions] = useState<DrugEntry[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suppressNextSearch = useRef(false);

  const handleChange = (text: string) => {
    onChangeText(text);
    if (suppressNextSearch.current) {
      suppressNextSearch.current = false;
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const results = searchDrugs(text);
    setSuggestions(results);
    setShowSuggestions(results.length > 0);
  };

  const handleSelect = (drug: DrugEntry) => {
    // Build the medication label: "DCI Strength" (without the form)
    const label = drug.strength ? `${drug.dci} ${drug.strength}` : drug.dci;
    suppressNextSearch.current = true;
    onChangeText(label);
    setSuggestions([]);
    setShowSuggestions(false);
    onSelectDrug?.(drug);
  };

  const handleClear = () => {
    onChangeText("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const hasSuggestions = showSuggestions && suggestions.length > 0;

  return (
    <View>
      {/* Input row */}
      <View style={styles.inputWrapper}>
        <TextInput
          {...rest}
          value={value}
          onChangeText={handleChange}
          style={[styles.input, style]}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {value.length > 0 && (
          <Pressable onPress={handleClear} style={styles.clearBtn} hitSlop={6}>
            <Icon name="close" size={14} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {/* Inline suggestions */}
      {hasSuggestions && (
        <View style={styles.dropdown}>
          {suggestionsLabel && (
            <Text style={styles.dropdownLabel}>{suggestionsLabel}</Text>
          )}
          {suggestions.map((drug, idx) => (
            <Pressable
              key={`${drug.dci}-${drug.strength}-${idx}`}
              style={({ pressed }) => [
                styles.suggestionRow,
                idx < suggestions.length - 1 && styles.suggestionRowBorder,
                pressed && styles.suggestionPressed,
              ]}
              onPress={() => handleSelect(drug)}
            >
              {/* Left: DCI + form badge */}
              <View style={styles.suggestionMain}>
                <View style={styles.suggestionTop}>
                  <Text style={styles.dciText} numberOfLines={1}>
                    {drug.dci}
                  </Text>
                  {drug.strength ? (
                    <View style={styles.strengthBadge}>
                      <Text style={styles.strengthText}>{drug.strength}</Text>
                    </View>
                  ) : null}
                  <View style={styles.formBadge}>
                    <Text style={styles.formText}>{drug.form}</Text>
                  </View>
                </View>
                {drug.brands.length > 0 && (
                  <Text style={styles.brandsText} numberOfLines={1}>
                    {drug.brands.join(" · ")}
                  </Text>
                )}
              </View>

              {/* Right: pre-fill hint */}
              {drug.dosage && (
                <View style={styles.prefillHint}>
                  <Text style={styles.prefillText} numberOfLines={1}>
                    {drug.dosage}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.brand,   // highlighted when active
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      paddingRight: 4,
    },
    input: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.textPrimary,
    },
    clearBtn: {
      padding: 6,
    },

    // ── Dropdown ──────────────────────────────────────────────────────
    dropdown: {
      marginTop: 3,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      overflow: "hidden",
      // subtle elevation so it feels like a floating panel
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 4,
    },
    dropdownLabel: {
      ...typography.caption,
      color: colors.textTertiary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.bg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    suggestionRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: spacing.sm,
    },
    suggestionRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    suggestionPressed: {
      backgroundColor: colors.brandSoft,
    },

    // ── Suggestion content ────────────────────────────────────────────
    suggestionMain: {
      flex: 1,
      gap: 3,
    },
    suggestionTop: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 5,
    },
    dciText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    strengthBadge: {
      backgroundColor: colors.brandSoft,
      borderRadius: radii.pill,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    strengthText: {
      fontSize: 10,
      fontWeight: "600",
      color: colors.brand,
    },
    formBadge: {
      backgroundColor: colors.border,
      borderRadius: radii.pill,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    formText: {
      fontSize: 10,
      color: colors.textSecondary,
    },
    brandsText: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    prefillHint: {
      backgroundColor: colors.bg,
      borderRadius: radii.sm,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: colors.border,
      maxWidth: 90,
    },
    prefillText: {
      fontSize: 10,
      color: colors.textTertiary,
    },
  });
