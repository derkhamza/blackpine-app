import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DoctorProfile, ExamRequest, ExamRequestLine, ExamRequestCategory } from "../lib/cabinetTypes";
import { EXAM_CATALOG, EXAM_REQ_CATEGORIES, EXAM_REQ_CATEGORY_COLORS } from "../lib/examCatalog";
import { shareExamRequest } from "../lib/examRequestPdf";
import { Icon } from "../lib/icons";
import { tapSuccess } from "../lib/haptics";
import { radii, spacing, typography, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { uuid } from "../lib/utils";

interface Props {
  visible: boolean;
  patientName: string;
  patientId?: string;
  date: string;
  doctorProfile: DoctorProfile;
  initial?: ExamRequest;
  onSave: (e: ExamRequest) => void;
  onClose: () => void;
  t: (k: string) => string;
}

export function ExamRequestModal({ visible, patientName, patientId, date, doctorProfile, initial, onSave, onClose, t }: Props) {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [lines, setLines] = useState<ExamRequestLine[]>([]);
  const [indication, setIndication] = useState("");
  const [cat, setCat] = useState<ExamRequestCategory>("biologie");
  const [draft, setDraft] = useState("");
  const [draftDetail, setDraftDetail] = useState("");

  useEffect(() => {
    if (visible) {
      setLines(initial?.lines ? initial.lines.map((l) => ({ ...l })) : []);
      setIndication(initial?.indication ?? "");
      setCat("biologie");
      setDraft(""); setDraftDetail("");
    }
  }, [visible, initial]);

  const catLabel = (c: ExamRequestCategory) => t("examReq.cat." + c);

  const addLine = (label: string, detail?: string) => {
    if (!label.trim()) return;
    setLines((prev) => [...prev, { category: cat, label: label.trim(), detail: detail?.trim() || undefined }]);
    setDraft(""); setDraftDetail("");
  };
  const removeLine = (i: number) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  const clean = () => lines.filter((l) => l.label.trim());
  const canSubmit = clean().length > 0;

  const buildRecord = (): ExamRequest => ({
    id: initial?.id ?? uuid(),
    patientId,
    patientName,
    date,
    lines: clean(),
    indication: indication.trim() || undefined,
    source: initial?.source ?? "appointment",
    appointmentId: initial?.appointmentId,
    createdAt: initial?.createdAt ?? new Date().toISOString(),
  });

  const handleSaveOnly = () => { if (!canSubmit) return; onSave(buildRecord()); onClose(); };
  const handlePrint = async () => {
    if (!canSubmit) return;
    tapSuccess();
    onSave(buildRecord());
    await shareExamRequest(patientName, clean(), indication.trim() || undefined, date, doctorProfile);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <View style={s.handle} />
          <View style={s.header}>
            <Text style={s.title}>{t("examReq.titleShort")}</Text>
            <Pressable onPress={onClose} hitSlop={12}><Icon name="close" size={20} color={colors.textTertiary} /></Pressable>
          </View>
          <Text style={s.patient}>{patientName}</Text>

          <ScrollView style={{ maxHeight: 460 }} keyboardShouldPersistTaps="handled">
            <View style={s.chipRow}>
              {EXAM_REQ_CATEGORIES.map((c) => (
                <Pressable key={c} style={[s.catChip, cat === c && { borderColor: EXAM_REQ_CATEGORY_COLORS[c], backgroundColor: EXAM_REQ_CATEGORY_COLORS[c] + "22" }]} onPress={() => setCat(c)}>
                  <Text style={[s.catChipText, cat === c && { color: EXAM_REQ_CATEGORY_COLORS[c], fontWeight: "800" }]}>{catLabel(c)}</Text>
                </Pressable>
              ))}
            </View>

            <View style={s.suggestWrap}>
              {EXAM_CATALOG[cat].map((x) => (
                <Pressable key={x} style={s.suggestChip} onPress={() => addLine(x)}>
                  <Text style={s.suggestChipText} numberOfLines={1}>+ {x}</Text>
                </Pressable>
              ))}
            </View>

            <TextInput style={s.input} value={draft} onChangeText={setDraft} placeholder={t("examReq.examPlaceholder")} placeholderTextColor={colors.textTertiary} />
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: 6 }}>
              <TextInput style={[s.input, { flex: 1 }]} value={draftDetail} onChangeText={setDraftDetail} placeholder={t("examReq.detailPlaceholder")} placeholderTextColor={colors.textTertiary} />
              <Pressable style={s.addBtn} onPress={() => addLine(draft, draftDetail)}>
                <Text style={s.addBtnText}>{t("examReq.addExam")}</Text>
              </Pressable>
            </View>

            {lines.length > 0 && <View style={{ marginTop: spacing.md }}>
              {lines.map((l, i) => (
                <View key={i} style={s.lineRow}>
                  <View style={[s.lineDot, { backgroundColor: EXAM_REQ_CATEGORY_COLORS[l.category] }]} />
                  <Text style={s.lineLabel} numberOfLines={2}>{l.label}{l.detail ? " — " + l.detail : ""}</Text>
                  <Pressable hitSlop={8} onPress={() => removeLine(i)}><Icon name="close" size={15} color={colors.textTertiary} /></Pressable>
                </View>
              ))}
            </View>}

            <Text style={s.fieldLabel}>{t("examReq.indicationLabel")}</Text>
            <TextInput style={[s.input, { height: 64, textAlignVertical: "top" }]} value={indication} onChangeText={setIndication} placeholder={t("examReq.indicationPlaceholder")} placeholderTextColor={colors.textTertiary} multiline />
          </ScrollView>

          <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.md }}>
            <Pressable style={s.saveBtn} disabled={!canSubmit} onPress={handleSaveOnly}>
              <Text style={s.saveText}>{t("examReq.saveOnly")}</Text>
            </Pressable>
            <Pressable style={[s.printBtn, !canSubmit && { opacity: 0.5 }]} disabled={!canSubmit} onPress={handlePrint}>
              <Icon name="fileCheck" size={16} color={colors.textOnDark} />
              <Text style={s.printText}>{t("examReq.printBtn")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000055" },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: "center", marginBottom: spacing.sm },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { ...typography.h3, color: c.textPrimary },
  patient: { fontSize: 13, color: c.textSecondary, marginBottom: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: spacing.sm },
  catChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.bg },
  catChipText: { fontSize: 12, fontWeight: "600", color: c.textSecondary },
  suggestWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: spacing.sm },
  suggestChip: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: radii.sm, borderWidth: 1, borderColor: c.brand + "55", backgroundColor: c.brandSoft },
  suggestChipText: { fontSize: 11.5, color: c.brand, fontWeight: "600" },
  input: { backgroundColor: c.bg, borderRadius: radii.md, borderWidth: 1, borderColor: c.border, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 14, color: c.textPrimary },
  addBtn: { justifyContent: "center", paddingHorizontal: 14, borderRadius: radii.md, backgroundColor: c.brand },
  addBtnText: { color: c.textOnDark, fontWeight: "700", fontSize: 13 },
  lineRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: c.border },
  lineDot: { width: 8, height: 8, borderRadius: 4 },
  lineLabel: { flex: 1, fontSize: 13.5, color: c.textPrimary },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: c.textSecondary, marginTop: spacing.md, marginBottom: 5 },
  saveBtn: { flex: 1, paddingVertical: 13, borderRadius: radii.lg, borderWidth: 1, borderColor: c.border, alignItems: "center" },
  saveText: { fontSize: 14, fontWeight: "600", color: c.textSecondary },
  printBtn: { flex: 1.4, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: spacing.sm, paddingVertical: 13, borderRadius: radii.lg, backgroundColor: c.brand },
  printText: { fontSize: 14, fontWeight: "700", color: c.textOnDark },
});
