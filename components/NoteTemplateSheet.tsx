/**
 * NoteTemplateSheet
 *
 * A bottom-sheet that lets the doctor browse, apply and manage consultation
 * note templates. Built-in templates are grouped by clinical category; custom
 * templates saved by the doctor appear in a separate "Personnalisés" bucket.
 *
 * Usage:
 *   <NoteTemplateSheet
 *     visible={showTemplates}
 *     currentNote={form.consultationNote}
 *     userId={userId}
 *     onApply={(tpl) => applyTemplate(tpl)}
 *     onClose={() => setShowTemplates(false)}
 *   />
 *
 * Applying a template:
 *   - Each field in the template REPLACES the corresponding consultation note
 *     field if the template provides that field.
 *   - Fields the template doesn't specify remain unchanged.
 *   - The parent decides how to handle the merge via `onApply`.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
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
import { ConsultationNote } from "../lib/cabinetTypes";
import { Icon } from "../lib/icons";
import {
  BUILT_IN_TEMPLATES,
  NoteTemplate,
  TEMPLATE_CATEGORIES,
  TemplateCategory,
  loadCustomTemplates,
  saveCustomTemplates,
} from "../lib/noteTemplates";
import { ColorPalette, radii, shadows, spacing, typography } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { tapLight, tapSuccess } from "../lib/haptics";
import { uuid } from "../lib/utils";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  /** The current state of the consultation note fields (used when saving as template) */
  currentNote: ConsultationNote;
  userId: string | null;
  /** Called with the chosen template — parent applies the fields it needs */
  onApply: (template: NoteTemplate) => void;
  onClose: () => void;
}

// ── Template row ──────────────────────────────────────────────────────────────

function TemplateRow({
  template,
  onApply,
  onDelete,
  colors,
}: {
  template: NoteTemplate;
  onApply: () => void;
  onDelete?: () => void;
  colors: ColorPalette;
}) {
const styles = useMemo(() => makeStyles(colors), [colors]);

  const preview = [
    template.motif,
    template.examination,
    template.diagnosis,
    template.treatment,
  ]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 100);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onApply}
      onLongPress={onDelete}
    >
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{template.label}</Text>
        {preview ? (
          <Text style={styles.rowPreview} numberOfLines={2}>
            {preview}
          </Text>
        ) : null}
      </View>
      <View style={styles.rowMeta}>
        {/* Field indicators */}
        <View style={styles.fieldDots}>
          {template.motif != null && (
            <View style={[styles.fieldDot, { backgroundColor: colors.brand + "88" }]} />
          )}
          {template.examination != null && (
            <View style={[styles.fieldDot, { backgroundColor: colors.success + "88" }]} />
          )}
          {template.diagnosis != null && (
            <View style={[styles.fieldDot, { backgroundColor: colors.gold + "88" }]} />
          )}
          {template.treatment != null && (
            <View style={[styles.fieldDot, { backgroundColor: "#2BA3B6" + "88" }]} />
          )}
        </View>
        <Icon name="chevronDown" size={14} color={colors.textTertiary} />
      </View>
    </Pressable>
  );
}

// ── Save-as-template mini-form ────────────────────────────────────────────────

function SaveForm({
  onSave,
  onCancel,
  hasContent,
  colors,
}: {
  onSave: (label: string, category: string) => void;
  onCancel: () => void;
  hasContent: boolean;
  colors: ColorPalette;
}) {
  const [label, setLabel] = useState("");
  const [cat, setCat] = useState("Général");
const styles = useMemo(() => makeStyles(colors), [colors]);

  const categories = TEMPLATE_CATEGORIES.filter(
    (c) => c !== "Tous" && c !== "Personnalisés",
  );

  return (
    <View style={styles.saveForm}>
      <Text style={styles.saveFormTitle}>Enregistrer comme modèle</Text>
      {!hasContent && (
        <Text style={styles.saveFormWarn}>
          ⚠ La note actuelle est vide — le modèle sera enregistré à vide.
        </Text>
      )}
      <TextInput
        style={styles.saveFormInput}
        value={label}
        onChangeText={setLabel}
        placeholder="Nom du modèle…"
        placeholderTextColor={colors.textTertiary}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => label.trim() && onSave(label.trim(), cat)}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.saveCatRow}
      >
        {categories.map((c) => (
          <Pressable
            key={c}
            style={[styles.saveCatChip, cat === c && styles.saveCatChipActive]}
            onPress={() => { tapLight(); setCat(c); }}
          >
            <Text
              style={[
                styles.saveCatText,
                cat === c && styles.saveCatTextActive,
              ]}
            >
              {c}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.saveFormBtns}>
        <Pressable style={styles.saveFormCancel} onPress={onCancel}>
          <Text style={styles.saveFormCancelText}>Annuler</Text>
        </Pressable>
        <Pressable
          style={[styles.saveFormConfirm, !label.trim() && styles.saveFormConfirmDisabled]}
          onPress={() => label.trim() && onSave(label.trim(), cat)}
          disabled={!label.trim()}
        >
          <Text style={styles.saveFormConfirmText}>Enregistrer</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function NoteTemplateSheet({
  visible,
  currentNote,
  userId,
  onApply,
  onClose,
}: Props) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [activeCategory, setActiveCategory] = useState<TemplateCategory>("Tous");
  const [customTemplates, setCustomTemplates] = useState<NoteTemplate[]>([]);
  const [showSaveForm, setShowSaveForm] = useState(false);

  // Load custom templates when the sheet opens
  useEffect(() => {
    if (!visible || !userId) return;
    loadCustomTemplates(userId).then(setCustomTemplates).catch(() => {});
  }, [visible, userId]);

  const filtered = useMemo(() => {
    const all = [
      ...BUILT_IN_TEMPLATES,
      ...customTemplates.map((t) => ({ ...t, category: "Personnalisés" as const })),
    ];
    if (activeCategory === "Tous") return all;
    if (activeCategory === "Personnalisés") return customTemplates;
    return BUILT_IN_TEMPLATES.filter((t) => t.category === activeCategory);
  }, [activeCategory, customTemplates]);

  const handleApply = useCallback(
    (tpl: NoteTemplate) => {
      tapSuccess();
      onApply(tpl);
      onClose();
    },
    [onApply, onClose],
  );

  const handleDelete = useCallback(
    (tpl: NoteTemplate) => {
      if (!tpl.isCustom && !customTemplates.find((c) => c.id === tpl.id)) return;
      Alert.alert(
        "Supprimer le modèle",
        `Supprimer "${tpl.label}" ?`,
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Supprimer",
            style: "destructive",
            onPress: async () => {
              const updated = customTemplates.filter((c) => c.id !== tpl.id);
              setCustomTemplates(updated);
              if (userId) await saveCustomTemplates(updated, userId);
            },
          },
        ],
      );
    },
    [customTemplates, userId],
  );

  const handleSaveTemplate = useCallback(
    async (label: string, category: string) => {
      const newTpl: NoteTemplate = {
        id: uuid(),
        label,
        category,
        isCustom: true,
        motif: currentNote.motif || undefined,
        examination: currentNote.examination || undefined,
        diagnosis: currentNote.diagnosis || undefined,
        treatment: currentNote.treatment || undefined,
      };
      const updated = [...customTemplates, newTpl];
      setCustomTemplates(updated);
      if (userId) await saveCustomTemplates(updated, userId);
      tapSuccess();
      setShowSaveForm(false);
    },
    [currentNote, customTemplates, userId],
  );

  const hasCurrentContent =
    !!(currentNote.motif || currentNote.examination || currentNote.diagnosis || currentNote.treatment);

  const visibleCats = TEMPLATE_CATEGORIES.filter(
    (c) => c !== "Personnalisés" || customTemplates.length > 0,
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Modèles de consultation</Text>
            <View style={styles.headerActions}>
              <Pressable
                style={styles.saveBtn}
                onPress={() => { tapLight(); setShowSaveForm((v) => !v); }}
              >
                <Icon name="add" size={14} color={colors.brand} />
                <Text style={styles.saveBtnText}>Enregistrer la note</Text>
              </Pressable>
              <Pressable onPress={onClose} hitSlop={10}>
                <Icon name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* Save-as-template form */}
          {showSaveForm && (
            <SaveForm
              onSave={handleSaveTemplate}
              onCancel={() => setShowSaveForm(false)}
              hasContent={hasCurrentContent}
              colors={colors}
            />
          )}

          {/* Field legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.brand }]} />
              <Text style={styles.legendText}>Motif</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
              <Text style={styles.legendText}>Examen</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.gold }]} />
              <Text style={styles.legendText}>Diagnostic</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#2BA3B6" }]} />
              <Text style={styles.legendText}>Traitement</Text>
            </View>
          </View>

          {/* Category tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catRow}
          >
            {visibleCats.map((cat) => (
              <Pressable
                key={cat}
                style={[styles.catTab, activeCategory === cat && styles.catTabActive]}
                onPress={() => { tapLight(); setActiveCategory(cat); }}
              >
                <Text
                  style={[
                    styles.catTabText,
                    activeCategory === cat && styles.catTabTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Template list */}
          <FlatList
            data={filtered}
            keyExtractor={(t) => t.id}
            renderItem={({ item }) => (
              <TemplateRow
                template={item}
                onApply={() => handleApply(item)}
                onDelete={
                  item.isCustom || customTemplates.find((c) => c.id === item.id)
                    ? () => handleDelete(item)
                    : undefined
                }
                colors={colors}
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Aucun modèle dans cette catégorie.</Text>
                {activeCategory === "Personnalisés" && (
                  <Text style={styles.emptyHint}>
                    Remplissez la note de consultation puis appuyez sur "Enregistrer la note" pour créer votre premier modèle.
                  </Text>
                )}
              </View>
            }
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          />

          {/* Long-press hint for custom templates */}
          {activeCategory !== "Tous" &&
            activeCategory !== "Personnalisés" &&
            filtered.some((t) => customTemplates.find((c) => c.id === t.id)) && (
              <Text style={styles.hint}>
                Appui long sur un modèle personnalisé pour le supprimer.
              </Text>
            )}
          {activeCategory === "Personnalisés" && customTemplates.length > 0 && (
            <Text style={styles.hint}>Appui long pour supprimer.</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      maxHeight: "85%",
      ...shadows.hero,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginTop: 10,
      marginBottom: 4,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      ...typography.h3,
      color: colors.textPrimary,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    saveBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.brand + "55",
      backgroundColor: colors.brandSoft,
    },
    saveBtnText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.brand,
    },

    // Save form
    saveForm: {
      margin: spacing.lg,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
    },
    saveFormTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    saveFormWarn: {
      fontSize: 11,
      color: colors.warning,
    },
    saveFormInput: {
      borderWidth: 1,
      borderColor: colors.brand,
      borderRadius: radii.md,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 14,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
    },
    saveCatRow: {
      flexDirection: "row",
      gap: spacing.xs,
      paddingVertical: 2,
    },
    saveCatChip: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    saveCatChipActive: {
      backgroundColor: colors.brandSoft,
      borderColor: colors.brand,
    },
    saveCatText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: "600",
    },
    saveCatTextActive: {
      color: colors.brand,
    },
    saveFormBtns: {
      flexDirection: "row",
      gap: spacing.sm,
      justifyContent: "flex-end",
    },
    saveFormCancel: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    saveFormCancelText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    saveFormConfirm: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: radii.md,
      backgroundColor: colors.brand,
    },
    saveFormConfirmDisabled: {
      opacity: 0.45,
    },
    saveFormConfirmText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textOnDark,
    },

    // Legend
    legend: {
      flexDirection: "row",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xs,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      fontSize: 10,
      color: colors.textTertiary,
    },

    // Category tabs
    catRow: {
      flexDirection: "row",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      gap: spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    catTab: {
      paddingHorizontal: 13,
      paddingVertical: 6,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    catTabActive: {
      backgroundColor: colors.brand,
      borderColor: colors.brand,
    },
    catTabText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    catTabTextActive: {
      color: colors.textOnDark,
    },

    // List
    list: { flex: 1 },
    listContent: { paddingVertical: spacing.xs },

    // Row
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.md,
    },
    rowPressed: {
      backgroundColor: colors.brandSoft,
    },
    rowContent: { flex: 1, gap: 3 },
    rowLabel: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    rowPreview: {
      fontSize: 11,
      color: colors.textSecondary,
      lineHeight: 15,
    },
    rowMeta: {
      alignItems: "flex-end",
      gap: 4,
    },
    fieldDots: {
      flexDirection: "row",
      gap: 3,
    },
    fieldDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },

    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: spacing.lg,
    },

    empty: {
      padding: spacing.xl,
      alignItems: "center",
      gap: spacing.sm,
    },
    emptyText: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: "center",
    },
    emptyHint: {
      fontSize: 11,
      color: colors.textTertiary,
      textAlign: "center",
      lineHeight: 16,
      maxWidth: 280,
    },

    hint: {
      fontSize: 10,
      color: colors.textTertiary,
      textAlign: "center",
      paddingVertical: spacing.sm,
    },
  });
