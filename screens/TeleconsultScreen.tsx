/**
 * TeleconsultScreen — schedule and track remote (video) consultations.
 *
 * Sessions hold the patient, platform (Meet/Zoom/Teams/Jitsi/other), meeting
 * link, date/time, status and notes. Persisted per-user via CabinetContext,
 * mirroring the web app's Teleconsultation page.
 */
import React, { useMemo, useState } from "react";
import {
  Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeScreen } from "../components/SafeScreen";
import { useCabinet } from "../lib/CabinetContext";
import { useColors } from "../lib/ThemeContext";
import { useT } from "../lib/useT";
import { Icon } from "../lib/icons";
import { radii, shadows, spacing, typography, ColorPalette } from "../lib/theme";
import { uuid, todayIso } from "../lib/utils";
import {
  TeleSession, TelePlatform, TeleStatus,
  TELE_PLATFORM_LABELS, TELE_PLATFORM_COLORS,
  TELE_STATUS_LABELS, TELE_STATUS_COLORS,
} from "../lib/cabinetTypes";

const PLATFORMS: TelePlatform[] = ["googlemeet", "zoom", "teams", "jitsi", "autre"];
const STATUSES: TeleStatus[] = ["scheduled", "in_progress", "completed", "cancelled"];

export function TeleconsultScreen({ navigation }: { navigation?: any }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();
  const { teleSessions, addTeleSession, updateTeleSession, deleteTeleSession } = useCabinet();
  const [modal, setModal] = useState<{ session?: TeleSession } | null>(null);

  const sorted = useMemo(
    () => [...teleSessions].sort((a, b) =>
      b.scheduledDate.localeCompare(a.scheduledDate) || b.scheduledTime.localeCompare(a.scheduledTime)),
    [teleSessions],
  );

  const openLink = (url?: string) => {
    if (!url) return;
    const full = /^https?:\/\//.test(url) ? url : `https://${url}`;
    Linking.openURL(full).catch(() => {});
  };

  return (
    <SafeScreen>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation?.goBack()} hitSlop={8}>
          <Icon name="back" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("tele.title")}</Text>
        <Pressable style={styles.addBtn} onPress={() => setModal({})}>
          <Icon name="add" size={18} color={colors.textOnDark} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {sorted.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="monitor" size={30} color={colors.textTertiary} />
            <Text style={styles.emptyText}>{t("tele.empty")}</Text>
            <Pressable style={styles.emptyBtn} onPress={() => setModal({})}>
              <Text style={styles.emptyBtnText}>{t("tele.add")}</Text>
            </Pressable>
          </View>
        ) : (
          sorted.map((s) => {
            const pColor = TELE_PLATFORM_COLORS[s.platform];
            const stColor = TELE_STATUS_COLORS[s.status];
            return (
              <Pressable key={s.id} style={styles.card} onPress={() => setModal({ session: s })}>
                <View style={[styles.platBar, { backgroundColor: pColor }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{s.patientName}</Text>
                  <Text style={styles.cardSub}>{s.scheduledDate} · {s.scheduledTime}{s.duration ? ` · ${s.duration} min` : ""}</Text>
                  <View style={styles.tagRow}>
                    <View style={[styles.tag, { backgroundColor: pColor + "22" }]}>
                      <Text style={[styles.tagText, { color: pColor }]}>{TELE_PLATFORM_LABELS[s.platform]}</Text>
                    </View>
                    <View style={[styles.tag, { backgroundColor: stColor + "22" }]}>
                      <Text style={[styles.tagText, { color: stColor }]}>{TELE_STATUS_LABELS[s.status]}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.actions}>
                  {!!s.link && (
                    <Pressable style={[styles.joinBtn, { backgroundColor: pColor }]} onPress={() => openLink(s.link)} hitSlop={6}>
                      <Icon name="monitor" size={14} color={colors.textOnDark} />
                      <Text style={styles.joinText}>{t("tele.join")}</Text>
                    </Pressable>
                  )}
                  {!!s.patientPhone && (
                    <Pressable style={styles.callBtn} onPress={() => Linking.openURL(`tel:${s.patientPhone}`)} hitSlop={6}>
                      <Icon name="phone" size={15} color={colors.brand} />
                    </Pressable>
                  )}
                </View>
              </Pressable>
            );
          })
        )}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {modal && (
        <TeleModal
          initial={modal.session}
          onSave={(s) => { modal.session ? updateTeleSession(s) : addTeleSession(s); setModal(null); }}
          onDelete={modal.session ? () => { deleteTeleSession(modal.session!.id); setModal(null); } : undefined}
          onClose={() => setModal(null)}
          t={t}
        />
      )}
    </SafeScreen>
  );
}

// ─── Tele session modal ────────────────────────────────────────────────────────

function TeleModal({
  initial, onSave, onDelete, onClose, t,
}: {
  initial?: TeleSession;
  onSave: (s: TeleSession) => void;
  onDelete?: () => void;
  onClose: () => void;
  t: (k: string) => string;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [patientName, setName]   = useState(initial?.patientName ?? "");
  const [patientPhone, setPhone] = useState(initial?.patientPhone ?? "");
  const [platform, setPlatform]  = useState<TelePlatform>(initial?.platform ?? "googlemeet");
  const [link, setLink]          = useState(initial?.link ?? "");
  const [date, setDate]          = useState(initial?.scheduledDate ?? todayIso());
  const [time, setTime]          = useState(initial?.scheduledTime ?? "09:00");
  const [duration, setDuration]  = useState(initial?.duration != null ? String(initial.duration) : "");
  const [status, setStatus]      = useState<TeleStatus>(initial?.status ?? "scheduled");
  const [notes, setNotes]        = useState(initial?.notes ?? "");

  const submit = () => {
    if (!patientName.trim()) return;
    const d = parseInt(duration, 10);
    onSave({
      id: initial?.id ?? uuid(),
      patientName: patientName.trim(),
      patientPhone: patientPhone.trim() || undefined,
      patientId: initial?.patientId,
      platform,
      link: link.trim() || undefined,
      scheduledDate: date,
      scheduledTime: time,
      duration: Number.isFinite(d) ? d : undefined,
      status,
      notes: notes.trim() || undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    });
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.mOverlay}>
        <View style={styles.mSheet}>
          <View style={styles.mHandle} />
          <View style={styles.mHeader}>
            <Text style={styles.mTitle}>{initial ? t("tele.edit") : t("tele.add")}</Text>
            <Pressable onPress={onClose} hitSlop={10}><Icon name="close" size={22} color={colors.textSecondary} /></Pressable>
          </View>
          <ScrollView style={{ maxHeight: 440 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.mLabel}>{t("tele.patient")}</Text>
            <TextInput style={styles.mInput} value={patientName} onChangeText={setName}
              placeholder="…" placeholderTextColor={colors.textTertiary} />

            <Text style={styles.mLabel}>{t("tele.phone")}</Text>
            <TextInput style={styles.mInput} value={patientPhone} onChangeText={setPhone} keyboardType="phone-pad"
              placeholder="06…" placeholderTextColor={colors.textTertiary} />

            <Text style={styles.mLabel}>{t("tele.platform")}</Text>
            <View style={styles.chipRow}>
              {PLATFORMS.map((p) => (
                <Pressable key={p}
                  style={[styles.chip, platform === p && { backgroundColor: TELE_PLATFORM_COLORS[p] + "22", borderColor: TELE_PLATFORM_COLORS[p] }]}
                  onPress={() => setPlatform(p)}>
                  <Text style={[styles.chipText, platform === p && { color: TELE_PLATFORM_COLORS[p], fontWeight: "700" }]}>
                    {TELE_PLATFORM_LABELS[p]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.mLabel}>{t("tele.link")}</Text>
            <TextInput style={styles.mInput} value={link} onChangeText={setLink} autoCapitalize="none" autoCorrect={false}
              placeholder="https://…" placeholderTextColor={colors.textTertiary} />

            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.mLabel}>{t("tele.date")}</Text>
                <TextInput style={styles.mInput} value={date} onChangeText={setDate}
                  placeholder="YYYY-MM-DD" placeholderTextColor={colors.textTertiary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mLabel}>{t("tele.time")}</Text>
                <TextInput style={styles.mInput} value={time} onChangeText={setTime}
                  placeholder="HH:MM" placeholderTextColor={colors.textTertiary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mLabel}>{t("tele.duration")}</Text>
                <TextInput style={styles.mInput} value={duration} onChangeText={setDuration} keyboardType="numeric"
                  placeholder="min" placeholderTextColor={colors.textTertiary} />
              </View>
            </View>

            <Text style={styles.mLabel}>{t("tele.status")}</Text>
            <View style={styles.chipRow}>
              {STATUSES.map((st) => (
                <Pressable key={st}
                  style={[styles.chip, status === st && { backgroundColor: TELE_STATUS_COLORS[st] + "22", borderColor: TELE_STATUS_COLORS[st] }]}
                  onPress={() => setStatus(st)}>
                  <Text style={[styles.chipText, status === st && { color: TELE_STATUS_COLORS[st], fontWeight: "700" }]}>
                    {TELE_STATUS_LABELS[st]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.mLabel}>{t("tele.notes")}</Text>
            <TextInput style={[styles.mInput, { height: 60 }]} value={notes} onChangeText={setNotes} multiline
              placeholder="…" placeholderTextColor={colors.textTertiary} />
          </ScrollView>
          <View style={styles.mBtnRow}>
            {onDelete && (
              <Pressable style={styles.mDeleteBtn} onPress={onDelete}>
                <Icon name="delete" size={16} color={colors.danger} />
              </Pressable>
            )}
            <Pressable style={styles.mCancelBtn} onPress={onClose}><Text style={styles.mCancelText}>{t("cancel")}</Text></Pressable>
            <Pressable style={[styles.mSaveBtn, !patientName.trim() && { opacity: 0.5 }]} disabled={!patientName.trim()} onPress={submit}>
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
  card: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: c.surface, borderRadius: radii.lg, padding: spacing.md,
    borderWidth: 1, borderColor: c.border, ...shadows.card,
  },
  platBar: { width: 4, alignSelf: "stretch", borderRadius: 2 },
  cardName: { fontSize: 15, fontWeight: "700", color: c.textPrimary },
  cardSub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 5 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.pill },
  tagText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  actions: { alignItems: "flex-end", gap: 6 },
  joinBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radii.pill },
  joinText: { fontSize: 12, fontWeight: "700", color: c.textOnDark },
  callBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: c.brandSoft },

  empty: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xxl },
  emptyText: { fontSize: 13, color: c.textTertiary },
  emptyBtn: { marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radii.lg, backgroundColor: c.brand },
  emptyBtnText: { color: c.textOnDark, fontWeight: "700", fontSize: 14 },

  // Modal
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
  mBtnRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg, alignItems: "center" },
  mDeleteBtn: { width: 46, paddingVertical: 13, borderRadius: radii.lg, borderWidth: 1, borderColor: c.danger + "55", alignItems: "center" },
  mCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: radii.lg, borderWidth: 1, borderColor: c.border, alignItems: "center" },
  mCancelText: { fontSize: 15, fontWeight: "600", color: c.textSecondary },
  mSaveBtn: { flex: 1, paddingVertical: 13, borderRadius: radii.lg, backgroundColor: c.brand, alignItems: "center" },
  mSaveText: { fontSize: 15, fontWeight: "700", color: c.textOnDark },
});
