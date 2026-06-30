/**
 * WaTemplatesScreen — manage reusable WhatsApp message templates.
 *
 * Templates hold a name, category and body (with {patient}/{date}/{heure}/
 * {docteur}/{cabinet} placeholders). Persisted per-user via CabinetContext,
 * mirroring the web app's WhatsApp template management.
 */
import React, { useMemo, useState } from "react";
import {
  Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeScreen } from "../components/SafeScreen";
import { useCabinet } from "../lib/CabinetContext";
import { useColors } from "../lib/ThemeContext";
import { useT } from "../lib/useT";
import { Icon } from "../lib/icons";
import { radii, shadows, spacing, typography, ColorPalette } from "../lib/theme";
import { uuid } from "../lib/utils";
import { WaTemplate, WaTemplateCategory, WA_TEMPLATE_CATEGORY_LABELS } from "../lib/cabinetTypes";

const CATS: WaTemplateCategory[] = ["rappel", "confirmation", "suivi", "resultats", "autre"];
const CAT_COLOR: Record<WaTemplateCategory, string> = {
  rappel: "#1890C5", confirmation: "#15A876", suivi: "#9B72D0", resultats: "#D4962A", autre: "#888888",
};

export function WaTemplatesScreen({ navigation }: { navigation?: any }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();
  const { waTemplates, addWaTemplate, updateWaTemplate, deleteWaTemplate } = useCabinet();
  const [modal, setModal] = useState<{ tpl?: WaTemplate } | null>(null);

  return (
    <SafeScreen>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation?.goBack()} hitSlop={8}>
          <Icon name="back" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("waTpl.title")}</Text>
        <Pressable style={styles.addBtn} onPress={() => setModal({})}>
          <Icon name="add" size={18} color={colors.textOnDark} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.hint}>{t("waTpl.hint")}</Text>
        {waTemplates.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="messageCircle" size={30} color={colors.textTertiary} />
            <Text style={styles.emptyText}>{t("waTpl.empty")}</Text>
          </View>
        ) : (
          waTemplates.map((w) => {
            const cc = CAT_COLOR[w.category];
            return (
              <Pressable key={w.id} style={styles.card} onPress={() => setModal({ tpl: w })}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{w.name}</Text>
                  <View style={styles.tagRow}>
                    <View style={[styles.tag, { backgroundColor: cc + "22" }]}>
                      <Text style={[styles.tagText, { color: cc }]}>{WA_TEMPLATE_CATEGORY_LABELS[w.category]}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardBody} numberOfLines={3}>{w.body}</Text>
                </View>
              </Pressable>
            );
          })
        )}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {modal && (
        <WaTemplateModal
          initial={modal.tpl}
          onSave={(w) => { modal.tpl ? updateWaTemplate(w) : addWaTemplate(w); setModal(null); }}
          onDelete={modal.tpl ? () => { deleteWaTemplate(modal.tpl!.id); setModal(null); } : undefined}
          onClose={() => setModal(null)}
          t={t}
        />
      )}
    </SafeScreen>
  );
}

function WaTemplateModal({
  initial, onSave, onDelete, onClose, t,
}: {
  initial?: WaTemplate;
  onSave: (w: WaTemplate) => void;
  onDelete?: () => void;
  onClose: () => void;
  t: (k: string) => string;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCat] = useState<WaTemplateCategory>(initial?.category ?? "rappel");
  const [body, setBody] = useState(initial?.body ?? "");
  const valid = name.trim() && body.trim();
  const submit = () => {
    if (!valid) return;
    onSave({ id: initial?.id ?? uuid(), name: name.trim(), category, body: body.trim() });
  };
  const insert = (token: string) => setBody((b) => b + token);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.mOverlay}>
        <View style={styles.mSheet}>
          <View style={styles.mHandle} />
          <View style={styles.mHeader}>
            <Text style={styles.mTitle}>{initial ? t("waTpl.edit") : t("waTpl.add")}</Text>
            <Pressable onPress={onClose} hitSlop={10}><Icon name="close" size={22} color={colors.textSecondary} /></Pressable>
          </View>
          <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.mLabel}>{t("waTpl.name")}</Text>
            <TextInput style={styles.mInput} value={name} onChangeText={setName}
              placeholder="…" placeholderTextColor={colors.textTertiary} />

            <Text style={styles.mLabel}>{t("waTpl.category")}</Text>
            <View style={styles.chipRow}>
              {CATS.map((c) => (
                <Pressable key={c}
                  style={[styles.chip, category === c && { backgroundColor: CAT_COLOR[c] + "22", borderColor: CAT_COLOR[c] }]}
                  onPress={() => setCat(c)}>
                  <Text style={[styles.chipText, category === c && { color: CAT_COLOR[c], fontWeight: "700" }]}>
                    {WA_TEMPLATE_CATEGORY_LABELS[c]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.mLabel}>{t("waTpl.body")}</Text>
            <TextInput style={[styles.mInput, { height: 120, textAlignVertical: "top" }]} value={body} onChangeText={setBody}
              multiline placeholder="…" placeholderTextColor={colors.textTertiary} />
            <Text style={styles.mLabel}>{t("waTpl.placeholders")}</Text>
            <View style={styles.chipRow}>
              {["{patient}", "{date}", "{heure}", "{docteur}", "{cabinet}"].map((tok) => (
                <Pressable key={tok} style={styles.tokChip} onPress={() => insert(tok)}>
                  <Text style={styles.tokChipText}>{tok}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <View style={styles.mBtnRow}>
            {onDelete && (
              <Pressable style={styles.mDeleteBtn} onPress={onDelete}>
                <Icon name="delete" size={16} color={colors.danger} />
              </Pressable>
            )}
            <Pressable style={styles.mCancelBtn} onPress={onClose}><Text style={styles.mCancelText}>{t("cancel")}</Text></Pressable>
            <Pressable style={[styles.mSaveBtn, !valid && { opacity: 0.5 }]} disabled={!valid} onPress={submit}>
              <Text style={styles.mSaveText}>{t("save")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md,
    backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  backBtn: { width: 38, height: 38, borderRadius: radii.md, alignItems: "center", justifyContent: "center", backgroundColor: c.brandSoft },
  headerTitle: { ...typography.h3, color: c.textPrimary, flex: 1 },
  addBtn: { width: 38, height: 38, borderRadius: radii.md, backgroundColor: c.brand, alignItems: "center", justifyContent: "center" },

  scroll: { padding: spacing.lg, gap: spacing.sm },
  hint: { fontSize: 12, color: c.textSecondary, marginBottom: spacing.xs },
  card: { backgroundColor: c.surface, borderRadius: radii.lg, padding: spacing.md, borderWidth: 1, borderColor: c.border, ...shadows.card },
  cardName: { fontSize: 15, fontWeight: "700", color: c.textPrimary },
  cardBody: { fontSize: 13, color: c.textSecondary, marginTop: 6, lineHeight: 18 },
  tagRow: { flexDirection: "row", gap: 6, marginTop: 5 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.pill },
  tagText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },

  empty: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xxl },
  emptyText: { fontSize: 13, color: c.textTertiary },

  mOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000055" },
  mSheet: { backgroundColor: c.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
  mHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: "center", marginBottom: spacing.md },
  mHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  mTitle: { ...typography.h3, color: c.textPrimary },
  mLabel: { fontSize: 12, fontWeight: "600", color: c.textSecondary, marginBottom: 6, marginTop: spacing.sm },
  mInput: { backgroundColor: c.bg, borderRadius: radii.sm, borderWidth: 1, borderColor: c.border, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, color: c.textPrimary },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill, borderWidth: 1, borderColor: c.border, backgroundColor: c.bg },
  chipText: { fontSize: 12, color: c.textSecondary },
  tokChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.sm, backgroundColor: c.brandSoft },
  tokChipText: { fontSize: 12, color: c.brand, fontWeight: "600" },
  mBtnRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg, alignItems: "center" },
  mDeleteBtn: { width: 46, paddingVertical: 13, borderRadius: radii.lg, borderWidth: 1, borderColor: c.danger + "55", alignItems: "center" },
  mCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: radii.lg, borderWidth: 1, borderColor: c.border, alignItems: "center" },
  mCancelText: { fontSize: 15, fontWeight: "600", color: c.textSecondary },
  mSaveBtn: { flex: 1, paddingVertical: 13, borderRadius: radii.lg, backgroundColor: c.brand, alignItems: "center" },
  mSaveText: { fontSize: 15, fontWeight: "700", color: c.textOnDark },
});
