import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ICD10, ICD10_CHAPTERS, CHAPTER_COLORS, Icd10Chapter, Icd10Entry, searchIcd10 } from "../lib/icd10";
import { Icon } from "../lib/icons";
import { radii, shadows, spacing, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { tapLight } from "../lib/haptics";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onSelect: (entry: Icd10Entry) => void;
  onClose: () => void;
}

// ─── Chapter filter chips ─────────────────────────────────────────────────────

const CHIP_ORDER: Icd10Chapter[] = [
  "resp", "cardio", "digest", "endoc", "neuro",
  "osteo", "uro", "derm", "infect", "mental", "sympt", "autre",
];

// ─── Component ───────────────────────────────────────────────────────────────

export function Icd10Picker({ visible, onSelect, onClose }: Props) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState("");
  const [chapter, setChapter] = useState<Icd10Chapter | undefined>(undefined);

  const results = useMemo(() => searchIcd10(query, chapter), [query, chapter]);

  const handleSelect = useCallback(
    (entry: Icd10Entry) => {
      tapLight();
      onSelect(entry);
    },
    [onSelect],
  );

  const handleClose = () => {
    setQuery("");
    setChapter(undefined);
    onClose();
  };

  const toggleChapter = (ch: Icd10Chapter) => {
    tapLight();
    setChapter((prev) => (prev === ch ? undefined : ch));
  };

  const renderItem = useCallback(
    ({ item }: { item: Icd10Entry }) => {
      const color = CHAPTER_COLORS[item.chapter];
      return (
        <Pressable
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.72 }]}
          onPress={() => handleSelect(item)}
        >
          <View style={[styles.codeBadge, { backgroundColor: color + "1A", borderColor: color + "55" }]}>
            <Text style={[styles.codeText, { color }]}>{item.code}</Text>
          </View>
          <Text style={styles.descText} numberOfLines={2}>{item.desc}</Text>
        </Pressable>
      );
    },
    [handleSelect],
  );

  const keyExtractor = useCallback((item: Icd10Entry) => item.code, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
      onShow={() => setTimeout(() => inputRef.current?.focus(), 100)}
    >
      <View style={[styles.container, { paddingTop: insets.top || spacing.lg }]}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>CIM-10 / ICD-10</Text>
            <Text style={styles.headerSub}>
              {results.length} résultat{results.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={10}>
            <Icon name="close" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* ── Search input ── */}
        <View style={styles.searchBar}>
          <Icon name="search" size={16} color={colors.textTertiary} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Chercher un code ou diagnostic…"
            placeholderTextColor={colors.textTertiary}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Icon name="close" size={14} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>

        {/* ── Chapter chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {CHIP_ORDER.map((ch) => {
            const active = chapter === ch;
            const color = CHAPTER_COLORS[ch];
            return (
              <Pressable
                key={ch}
                style={[
                  styles.chip,
                  active
                    ? { backgroundColor: color + "22", borderColor: color }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => toggleChapter(ch)}
              >
                <View style={[styles.chipDot, { backgroundColor: active ? color : color + "88" }]} />
                <Text style={[styles.chipText, active && { color }]} numberOfLines={1}>
                  {ICD10_CHAPTERS[ch]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Results list ── */}
        {results.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="search" size={28} color={colors.textTertiary} />
            <Text style={styles.emptyText}>Aucun résultat</Text>
            <Text style={styles.emptyHint}>
              Essayez un autre terme ou effacez les filtres
            </Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={[
              styles.list,
              { paddingBottom: Math.max(insets.bottom, spacing.xl) + spacing.lg },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            initialNumToRender={20}
            maxToRenderPerBatch={30}
          />
        )}
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },

    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    headerSub: {
      fontSize: 12,
      color: colors.brand,
      fontWeight: "600",
      marginTop: 2,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },

    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: colors.surface,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      ...shadows.card,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
      fontWeight: "500",
    },

    chipsRow: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
      gap: spacing.xs,
      alignItems: "center",   // keeps all chips vertically centred in the row
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      height: 34,             // fixed height — prevents shape thrash when fontWeight or color changes
      paddingHorizontal: 12,
      borderRadius: radii.pill,
      borderWidth: 1.5,
      flexShrink: 0,          // never compress inside the horizontal scroll
    },
    chipDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      flexShrink: 0,
    },
    chipText: {
      fontSize: 12,
      fontWeight: "600",      // constant weight — active state signals through color only
      color: colors.textSecondary,
      includeFontPadding: false,
    },

    list: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    codeBadge: {
      borderRadius: radii.sm,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 4,
      minWidth: 68,
      alignItems: "center",
    },
    codeText: {
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.2,
    },
    descText: {
      flex: 1,
      fontSize: 14,
      color: colors.textPrimary,
      lineHeight: 20,
    },

    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    emptyHint: {
      fontSize: 13,
      color: colors.textTertiary,
      textAlign: "center",
    },
  });
