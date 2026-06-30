/**
 * NotesScreen — a doctor's internal notes & tasks board (pense-bête).
 *
 * Notes are free-text colour-coded cards; tasks add a done toggle + optional
 * due date. Pinned items float to the top. Persisted per-user via CabinetContext
 * (local), mirroring the web app's Notes page.
 */
import React, { useMemo, useState } from "react";
import {
  Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from "react-native";
import { SafeScreen } from "../components/SafeScreen";
import { useCabinet } from "../lib/CabinetContext";
import { useColors } from "../lib/ThemeContext";
import { useT } from "../lib/useT";
import { Icon } from "../lib/icons";
import { radii, shadows, spacing, typography, ColorPalette } from "../lib/theme";
import { uuid, todayIso } from "../lib/utils";
import { InternalNote, NoteColor, NOTE_COLOR_VALUES } from "../lib/cabinetTypes";

const COLORS: NoteColor[] = ["yellow", "blue", "green", "pink"];

export function NotesScreen({ navigation }: { navigation?: any }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();
  const { notes, addNote, updateNote, deleteNote } = useCabinet();
  const [modal, setModal] = useState<{ note?: InternalNote } | null>(null);

  // Pinned first, then tasks-not-done, then by most-recent update.
  const sorted = useMemo(() => [...notes].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    const ad = a.type === "task" && a.isDone, bd = b.type === "task" && b.isDone;
    if (ad !== bd) return ad ? 1 : -1;
    return (b.updatedAt || "").localeCompare(a.updatedAt || "");
  }), [notes]);

  const toggleDone = (n: InternalNote) =>
    updateNote({ ...n, isDone: !n.isDone, updatedAt: new Date().toISOString() });
  const togglePin = (n: InternalNote) =>
    updateNote({ ...n, isPinned: !n.isPinned, updatedAt: new Date().toISOString() });

  return (
    <SafeScreen>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation?.goBack()} hitSlop={8}>
          <Icon name="back" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("notes.title")}</Text>
        <Pressable style={styles.addBtn} onPress={() => setModal({})}>
          <Icon name="add" size={18} color={colors.textOnDark} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {sorted.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="clipboard" size={30} color={colors.textTertiary} />
            <Text style={styles.emptyText}>{t("notes.empty")}</Text>
            <Pressable style={styles.emptyBtn} onPress={() => setModal({})}>
              <Text style={styles.emptyBtnText}>{t("notes.add")}</Text>
            </Pressable>
          </View>
        ) : (
          sorted.map((n) => {
            const c = NOTE_COLOR_VALUES[n.color];
            const done = n.type === "task" && n.isDone;
            return (
              <Pressable key={n.id} style={[styles.card, { backgroundColor: c.bg, borderColor: c.border }]} onPress={() => setModal({ note: n })}>
                {n.type === "task" && (
                  <Pressable style={[styles.check, { borderColor: c.text }, done && { backgroundColor: c.text }]} onPress={() => toggleDone(n)} hitSlop={8}>
                    {done && <Icon name="check" size={12} color={c.bg} />}
                  </Pressable>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: c.text }, done && styles.struck]}>{n.title}</Text>
                  {!!n.body && <Text style={[styles.cardBody, { color: c.text }]} numberOfLines={3}>{n.body}</Text>}
                  {n.type === "task" && !!n.dueDate && (
                    <Text style={[styles.due, { color: c.text }]}>{t("notes.due")} {n.dueDate}</Text>
                  )}
                </View>
                <Pressable onPress={() => togglePin(n)} hitSlop={8}>
                  <Icon name={n.isPinned ? "award" : "chevronUp"} size={15} color={n.isPinned ? c.text : c.border} />
                </Pressable>
              </Pressable>
            );
          })
        )}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {modal && (
        <NoteModal
          initial={modal.note}
          onSave={(n) => { modal.note ? updateNote(n) : addNote(n); setModal(null); }}
          onDelete={modal.note ? () => { deleteNote(modal.note!.id); setModal(null); } : undefined}
          onClose={() => setModal(null)}
          t={t}
        />
      )}
    </SafeScreen>
  );
}

// ─── Note / task modal ─────────────────────────────────────────────────────────

function NoteModal({
  initial, onSave, onDelete, onClose, t,
}: {
  initial?: InternalNote;
  onSave: (n: InternalNote) => void;
  onDelete?: () => void;
  onClose: () => void;
  t: (k: string) => string;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [isTask, setIsTask] = useState(initial?.type === "task");
  const [title, setTitle]   = useState(initial?.title ?? "");
  const [body, setBody]     = useState(initial?.body ?? "");
  const [color, setColor]   = useState<NoteColor>(initial?.color ?? "yellow");
  const [isPinned, setPin]  = useState(initial?.isPinned ?? false);
  const [dueDate, setDue]   = useState(initial?.dueDate ?? "");

  const submit = () => {
    if (!title.trim()) return;
    const now = new Date().toISOString();
    onSave({
      id: initial?.id ?? uuid(),
      type: isTask ? "task" : "note",
      title: title.trim(),
      body: body.trim() || undefined,
      color,
      isPinned,
      isDone: initial?.isDone ?? false,
      dueDate: isTask ? (dueDate.trim() || undefined) : undefined,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    });
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.mOverlay}>
        <View style={styles.mSheet}>
          <View style={styles.mHandle} />
          <View style={styles.mHeader}>
            <Text style={styles.mTitle}>{initial ? t("notes.edit") : t("notes.add")}</Text>
            <Pressable onPress={onClose} hitSlop={10}><Icon name="close" size={22} color={colors.textSecondary} /></Pressable>
          </View>
          <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
            <View style={styles.typeRow}>
              <Pressable style={[styles.typeChip, !isTask && styles.typeChipActive]} onPress={() => setIsTask(false)}>
                <Text style={[styles.typeChipText, !isTask && styles.typeChipTextActive]}>{t("notes.typeNote")}</Text>
              </Pressable>
              <Pressable style={[styles.typeChip, isTask && styles.typeChipActive]} onPress={() => setIsTask(true)}>
                <Text style={[styles.typeChipText, isTask && styles.typeChipTextActive]}>{t("notes.typeTask")}</Text>
              </Pressable>
            </View>

            <Text style={styles.mLabel}>{t("notes.titleField")}</Text>
            <TextInput style={styles.mInput} value={title} onChangeText={setTitle}
              placeholder="…" placeholderTextColor={colors.textTertiary} />

            {!isTask && (
              <>
                <Text style={styles.mLabel}>{t("notes.body")}</Text>
                <TextInput style={[styles.mInput, { height: 90 }]} value={body} onChangeText={setBody} multiline
                  placeholder="…" placeholderTextColor={colors.textTertiary} />
              </>
            )}

            {isTask && (
              <>
                <Text style={styles.mLabel}>{t("notes.dueDate")}</Text>
                <TextInput style={styles.mInput} value={dueDate} onChangeText={setDue}
                  placeholder="YYYY-MM-DD" placeholderTextColor={colors.textTertiary} />
              </>
            )}

            <Text style={styles.mLabel}>{t("notes.color")}</Text>
            <View style={styles.colorRow}>
              {COLORS.map((cl) => {
                const cv = NOTE_COLOR_VALUES[cl];
                return (
                  <Pressable key={cl} onPress={() => setColor(cl)}
                    style={[styles.swatch, { backgroundColor: cv.bg, borderColor: color === cl ? cv.text : cv.border }, color === cl && { borderWidth: 3 }]} />
                );
              })}
            </View>

            <View style={styles.pinRow}>
              <Text style={styles.mLabel}>{t("notes.pin")}</Text>
              <Switch value={isPinned} onValueChange={setPin} trackColor={{ true: colors.brand }} />
            </View>
          </ScrollView>
          <View style={styles.mBtnRow}>
            {onDelete && (
              <Pressable style={styles.mDeleteBtn} onPress={onDelete}>
                <Icon name="delete" size={16} color={colors.danger} />
              </Pressable>
            )}
            <Pressable style={styles.mCancelBtn} onPress={onClose}><Text style={styles.mCancelText}>{t("cancel")}</Text></Pressable>
            <Pressable style={[styles.mSaveBtn, !title.trim() && { opacity: 0.5 }]} disabled={!title.trim()} onPress={submit}>
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
  card: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, borderRadius: radii.lg, borderWidth: 1, padding: spacing.md },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  cardBody: { fontSize: 13, marginTop: 3, opacity: 0.9 },
  due: { fontSize: 11, fontWeight: "600", marginTop: 4, opacity: 0.8 },
  struck: { textDecorationLine: "line-through", opacity: 0.6 },

  empty: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xxl },
  emptyText: { fontSize: 13, color: c.textTertiary },
  emptyBtn: { marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radii.lg, backgroundColor: c.brand },
  emptyBtnText: { color: c.textOnDark, fontWeight: "700", fontSize: 14 },

  mOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000055" },
  mSheet: { backgroundColor: c.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
  mHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: "center", marginBottom: spacing.md },
  mHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  mTitle: { ...typography.h3, color: c.textPrimary },
  mLabel: { fontSize: 12, fontWeight: "600", color: c.textSecondary, marginBottom: 6, marginTop: spacing.sm },
  mInput: { backgroundColor: c.bg, borderRadius: radii.sm, borderWidth: 1, borderColor: c.border, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, color: c.textPrimary },
  typeRow: { flexDirection: "row", gap: spacing.xs, marginBottom: spacing.xs },
  typeChip: { flex: 1, paddingVertical: 9, borderRadius: radii.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.bg, alignItems: "center" },
  typeChipActive: { backgroundColor: c.brandSoft, borderColor: c.brand },
  typeChipText: { fontSize: 13, fontWeight: "600", color: c.textSecondary },
  typeChipTextActive: { color: c.brand },
  colorRow: { flexDirection: "row", gap: spacing.sm, marginTop: 2 },
  swatch: { width: 38, height: 38, borderRadius: 10, borderWidth: 1 },
  pinRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xs },
  mBtnRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg, alignItems: "center" },
  mDeleteBtn: { width: 46, paddingVertical: 13, borderRadius: radii.lg, borderWidth: 1, borderColor: c.danger + "55", alignItems: "center" },
  mCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: radii.lg, borderWidth: 1, borderColor: c.border, alignItems: "center" },
  mCancelText: { fontSize: 15, fontWeight: "600", color: c.textSecondary },
  mSaveBtn: { flex: 1, paddingVertical: 13, borderRadius: radii.lg, backgroundColor: c.brand, alignItems: "center" },
  mSaveText: { fontSize: 15, fontWeight: "700", color: c.textOnDark },
});
