import React, { useEffect, useState, useMemo } from "react";
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DoctorProfile, Ordonnance, OrdonnanceLine } from "../lib/cabinetTypes";
import { Icon } from "../lib/icons";
import { track } from "../lib/analytics";
import { tapSuccess } from "../lib/haptics";
import { radii, shadows, spacing, typography, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { MedicationAutocomplete } from "./MedicationAutocomplete";
import { DrugEntry } from "../lib/moroccanDrugs";
import { sharedModalStyles as _sharedModalStyles, makeSharedStyles } from "../lib/sharedStyles";
import { uuid, todayIso } from "../lib/utils";
import { todayFr } from "../lib/format";

const TEMPLATES_KEY = "blackpine.ordonnance.templates";

interface OrdonnanceTemplate {
  id: string;
  name: string;
  lines: OrdonnanceLine[];
  notes: string;
  createdAt: string;
}

const EMPTY_LINE: Omit<OrdonnanceLine, "id"> = {
  medication: "",
  dosage: "",
  frequency: "",
  duration: "",
};

// ── Allergy safety helpers (mirror of web OrdonnanceModal) ──────────────────────
const NONE_ALLERGY = new Set(["aucune", "aucun", "ras", "neant", "non", "rien", "none", "no", "-", "0", "nil"]);

// RN/Hermes-safe accent folding (avoids String.prototype.normalize availability questions).
function normalizeTxt(s: string): string {
  return s.toLowerCase()
    .replace(/[àâä]/g, "a").replace(/[éèêë]/g, "e").replace(/[îï]/g, "i")
    .replace(/[ôö]/g, "o").replace(/[ûüù]/g, "u").replace(/ç/g, "c");
}

function parseAllergyTerms(allergies?: string): string[] {
  if (!allergies) return [];
  const norm = normalizeTxt(allergies).trim();
  if (!norm || NONE_ALLERGY.has(norm)) return [];
  return norm.split(/[,;/\n·]+/).map((x) => x.trim()).filter((x) => x.length >= 3 && !NONE_ALLERGY.has(x));
}

function drugConflicts(med: string, terms: string[]): boolean {
  if (!med.trim() || terms.length === 0) return false;
  const d = normalizeTxt(med);
  return terms.some((term) => d.includes(term));
}

interface Props {
  visible: boolean;
  patientName: string;
  patientId?: string;
  /** Set when the modal is opened from AppointmentDetailScreen. */
  appointmentId?: string;
  doctorProfile: DoctorProfile;
  /** Patient's recorded allergies (free text) — drives the safety banner. */
  allergies?: string;
  /** This patient's most recent prior prescription lines — for "Repeat last". */
  lastLines?: OrdonnanceLine[];
  onClose: () => void;
  onSave?: (o: Ordonnance) => void;
  t: (k: string) => string;
}

// ─── HTML Template ──────────────────────────────────────────────────────────

export function buildOrdonnanceHTML(
  patientName: string,
  lines: OrdonnanceLine[],
  notes: string,
  doctorProfile: DoctorProfile,
): string {
  const dr = doctorProfile.fullName ? `Dr. ${doctorProfile.fullName}` : "Docteur";
  const specialty = doctorProfile.specialtyLabel || "";
  const ds = doctorProfile.documentSettings ?? {};
  const inpe = (ds.showInpe !== false && doctorProfile.inpe) ? `N° INPE : ${doctorProfile.inpe}` : "";
  const address = doctorProfile.address || "";
  const phone = doctorProfile.phone || "";
  const dateStr = todayFr();
  const cityParts = address.split(",");
  const city = cityParts.length > 1 ? cityParts[cityParts.length - 1].trim() : "";

  const medsHtml = lines
    .filter((l) => l.medication.trim())
    .map(
      (l, i) => `
      <div class="med-item">
        <div class="med-header">
          <span class="med-num">${i + 1}</span>
          <span class="med-name">${l.medication}</span>
        </div>
        <div class="med-details">
          ${l.dosage ? `<span class="med-detail-pill">Dose : ${l.dosage}</span>` : ""}
          ${l.frequency ? `<span class="med-detail-pill">Fréquence : ${l.frequency}</span>` : ""}
          ${l.duration ? `<span class="med-detail-pill">Durée : ${l.duration}</span>` : ""}
        </div>
      </div>`,
    )
    .join("");

  const metaLine = [specialty, inpe].filter(Boolean).join("  ·  ");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Helvetica Neue", Arial, sans-serif; color: #1a1a1a; background: white; }
  .page { padding: 18mm 16mm 14mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start;
            padding-bottom: 14px; border-bottom: 2.5px solid #1B4F72; margin-bottom: 20px; }
  .doctor-name { font-size: 20pt; font-weight: 800; color: #1B4F72; margin-bottom: 5px; }
  .doctor-meta { font-size: 9pt; color: #555; line-height: 1.7; }
  .header-date { text-align: right; font-size: 9pt; color: #555; padding-top: 4px; }
  .doc-title { text-align: center; font-size: 13pt; font-weight: 800; letter-spacing: 3px;
               text-transform: uppercase; border: 2px solid #1B4F72; color: #1B4F72;
               padding: 9px 20px; margin: 20px 0; }
  .patient-box { background: #f0f6fb; border-left: 4px solid #1B4F72;
                 padding: 10px 14px; margin: 16px 0 22px; border-radius: 0 6px 6px 0; }
  .patient-label { font-size: 7.5pt; text-transform: uppercase; color: #888;
                   letter-spacing: 1.2px; margin-bottom: 4px; }
  .patient-name { font-size: 15pt; font-weight: 700; }
  .rx-symbol { font-size: 32pt; color: #1B4F72; font-style: italic;
               font-weight: 900; margin: 14px 0 10px; line-height: 1; }
  .med-item { margin: 11px 0; padding: 12px 14px; border: 1px solid #dde;
              border-radius: 7px; page-break-inside: avoid; }
  .med-header { display: flex; align-items: center; gap: 10px; margin-bottom: 7px; }
  .med-num { display: inline-flex; align-items: center; justify-content: center;
             background: #1B4F72; color: white; width: 24px; height: 24px;
             border-radius: 12px; font-size: 10pt; font-weight: 800; flex-shrink: 0; }
  .med-name { font-size: 13pt; font-weight: 700; }
  .med-details { display: flex; flex-wrap: wrap; gap: 6px; margin-left: 34px; }
  .med-detail-pill { background: #f4f8ff; border: 1px solid #c8ddf4;
                     border-radius: 20px; padding: 2px 10px;
                     font-size: 9pt; color: #3a5f8a; }
  .notes-section { margin-top: 22px; padding-top: 14px; border-top: 1px dashed #ccc; }
  .notes-label { font-size: 8pt; text-transform: uppercase; color: #888;
                 letter-spacing: 1px; margin-bottom: 7px; }
  .notes-text { font-size: 11pt; color: #333; line-height: 1.65; }
  .signature-area { margin-top: 52px; display: flex; justify-content: flex-end; }
  .signature-box { text-align: center; }
  .signature-city { font-size: 9pt; color: #555; margin-bottom: 44px; }
  .signature-line { border-top: 1px solid #aaa; padding-top: 7px;
                    font-size: 9pt; color: #666; min-width: 180px; }
  .footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #eee;
            text-align: center; font-size: 7pt; color: #bbb; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="doctor-name">${dr}</div>
      <div class="doctor-meta">
        ${metaLine ? `${metaLine}<br>` : ""}
        ${ds.headerNote ? `${ds.headerNote}<br>` : ""}
        ${address ? `${address}<br>` : ""}
        ${phone ? phone : ""}
      </div>
    </div>
    <div class="header-date">Date : ${dateStr}</div>
  </div>

  <div class="doc-title">Ordonnance Médicale</div>

  <div class="patient-box">
    <div class="patient-label">Patient(e)</div>
    <div class="patient-name">${patientName}</div>
  </div>

  <div class="rx-symbol">&#x211E;</div>

  ${medsHtml || "<p style='color:#aaa;font-style:italic;font-size:11pt;margin:10px 0'>(aucun médicament)</p>"}

  ${notes.trim() ? `
  <div class="notes-section">
    <div class="notes-label">Instructions</div>
    <div class="notes-text">${notes}</div>
  </div>` : ""}

  <div class="signature-area">
    <div class="signature-box">
      <div class="signature-city">${city ? `Fait à ${city}, le ${dateStr}` : `Fait le ${dateStr}`}</div>
      <div class="signature-line">Signature et cachet du médecin</div>
    </div>
  </div>

  <div class="footer">${ds.footerNote ? `${ds.footerNote} · ` : ""}Généré par BLACKPINE Cabinet · ${dateStr}</div>
</div>
</body>
</html>`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function OrdonnanceModal({ visible, patientName, patientId, appointmentId, doctorProfile, allergies, lastLines, onClose, onSave, t }: Props) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const sharedModalStyles = makeSharedStyles(colors);
  const insets = useSafeAreaInsets();
  const [lines, setLines] = useState<OrdonnanceLine[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  // Templates
  const [templates, setTemplates] = useState<OrdonnanceTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");

  useEffect(() => {
    if (visible) {
      setLines([]);
      setNotes("");
      setLoading(false);
      setShowTemplates(false);
      setShowSaveTemplate(false);
      setTemplateName("");
      loadTemplates();
    }
  }, [visible]);

  const loadTemplates = async () => {
    try {
      const raw = await AsyncStorage.getItem(TEMPLATES_KEY);
      setTemplates(raw ? JSON.parse(raw) : []);
    } catch {
      setTemplates([]);
    }
  };

  const saveAsTemplate = async () => {
    if (!templateName.trim()) return;
    const tpl: OrdonnanceTemplate = {
      id: uuid(),
      name: templateName.trim(),
      lines: lines.map((l) => ({ ...l, id: uuid() })),
      notes,
      createdAt: todayIso(),
    };
    const next = [...templates, tpl];
    setTemplates(next);
    await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(next));
    setShowSaveTemplate(false);
    setTemplateName("");
  };

  const applyTemplate = (tpl: OrdonnanceTemplate) => {
    setLines(tpl.lines.map((l) => ({ ...l, id: uuid() })));
    setNotes(tpl.notes);
    setShowTemplates(false);
  };

  const deleteTemplate = async (id: string) => {
    Alert.alert(t("delete"), t("ordonnance.deleteTemplate") || "Supprimer ce modèle?", [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          const next = templates.filter((t) => t.id !== id);
          setTemplates(next);
          await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(next));
        },
      },
    ]);
  };

  const addLine = () => {
    setLines((prev) => [...prev, { id: uuid(), ...EMPTY_LINE }]);
  };

  const updateLine = (id: string, field: keyof Omit<OrdonnanceLine, "id">, val: string) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: val } : l)));
  };

  const removeLine = (id: string) => {
    Alert.alert(t("ordonnance.confirmDelete"), undefined, [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: () => setLines((prev) => prev.filter((l) => l.id !== id)),
      },
    ]);
  };

  const persistOrdonnance = (): Ordonnance => {
    const ordonnance: Ordonnance = {
      id: uuid(),
      patientId,
      appointmentId,
      patientName,
      date: todayIso(),
      lines: lines.filter((l) => l.medication.trim()),
      notes: notes.trim() || undefined,
    };
    onSave?.(ordonnance);
    return ordonnance;
  };

  const handleShare = async () => {
    if (loading) return;
    setLoading(true);
    try {
      persistOrdonnance();
      track("action:print_ordonnance");
      tapSuccess();
      const html = buildOrdonnanceHTML(patientName, lines, notes, doctorProfile);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Ordonnance - ${patientName}`,
        UTI: "com.adobe.pdf",
      });
    } catch {
      // user cancelled or error
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = async () => {
    if (loading) return;
    persistOrdonnance();
    const validLines = lines.filter((l) => l.medication.trim());
    const medsText = validLines
      .map((l, i) => {
        const parts = [`${i + 1}. ${l.medication}`];
        if (l.dosage) parts.push(`   Dose : ${l.dosage}`);
        if (l.frequency) parts.push(`   Fréquence : ${l.frequency}`);
        if (l.duration) parts.push(`   Durée : ${l.duration}`);
        return parts.join("\n");
      })
      .join("\n\n");
    const text = `📋 *Ordonnance - ${patientName}*\n📅 ${todayFr()}\n\n${medsText}${notes.trim() ? `\n\n📝 ${notes.trim()}` : ""}\n\n_Généré par BLACKPINE Cabinet_`;
    const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert("WhatsApp", "WhatsApp n'est pas installé sur cet appareil.");
    }
  };

  const hasLines = lines.some((l) => l.medication.trim().length > 0);

  // ── Allergy safety ──────────────────────────────────────────────────────────
  const allergyRaw      = (allergies ?? "").trim();
  const showAllergyInfo = allergyRaw !== "" && !NONE_ALLERGY.has(normalizeTxt(allergyRaw));
  const allergyTerms    = parseAllergyTerms(allergyRaw);
  const conflictMeds    = [...new Set(
    lines.filter((l) => drugConflicts(l.medication, allergyTerms)).map((l) => l.medication.trim()),
  )];

  const repeatLast = () => {
    if (!lastLines || lastLines.length === 0) return;
    const apply = () => setLines(lastLines.map((l) => ({ ...l, id: uuid() })));
    if (hasLines) {
      Alert.alert(t("ordonnance.repeatLast"), t("ordonnance.repeatLastConfirm"), [
        { text: t("cancel"), style: "cancel" },
        { text: t("ordonnance.repeatLast"), onPress: apply },
      ]);
    } else {
      apply();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={sharedModalStyles.overlay}>
        <View style={[sharedModalStyles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
          <View style={sharedModalStyles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Icon name="pill" size={18} color={colors.brand} />
              <Text style={sharedModalStyles.title}>{t("ordonnance.title")}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Icon name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Patient badge */}
          <View style={styles.patientBadge}>
            <Icon name="profile" size={14} color={colors.brand} />
            <Text style={styles.patientBadgeText}>{patientName}</Text>
            <Text style={styles.dateBadge}>{todayFr()}</Text>
          </View>

          {/* Allergy safety banner */}
          {showAllergyInfo && (
            <View style={[styles.allergyBanner, conflictMeds.length > 0 && styles.allergyBannerConflict]}>
              <Icon name="warning" size={14} color={conflictMeds.length > 0 ? colors.danger : colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.allergyText, conflictMeds.length > 0 && { color: colors.danger }]}>
                  {t("ordonnance.allergyKnown")}: {allergyRaw}
                </Text>
                {conflictMeds.length > 0 && (
                  <Text style={styles.allergyConflictText}>
                    ⚠️ {t("ordonnance.allergyConflict")}: {conflictMeds.join(", ")}
                  </Text>
                )}
              </View>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Lines */}
            {lines.length === 0 ? (
              <View style={styles.emptyLines}>
                <Icon name="pill" size={32} color={colors.brandSoft} />
                <Text style={styles.emptyText}>{t("ordonnance.empty")}</Text>
              </View>
            ) : (
              lines.map((line, idx) => (
                <View key={line.id} style={[styles.lineCard, drugConflicts(line.medication, allergyTerms) && styles.lineCardConflict]}>
                  <View style={styles.lineNumRow}>
                    <View style={styles.lineNum}>
                      <Text style={styles.lineNumText}>{idx + 1}</Text>
                    </View>
                    <Pressable onPress={() => removeLine(line.id)} hitSlop={8}>
                      <Icon name="delete" size={16} color={colors.danger} />
                    </Pressable>
                  </View>
                  <Text style={styles.lineLabel}>{t("ordonnance.medication")}</Text>
                  <MedicationAutocomplete
                    value={line.medication}
                    onChangeText={(v) => updateLine(line.id, "medication", v)}
                    placeholder={t("ordonnance.medicationPlaceholder")}
                    placeholderTextColor={colors.textTertiary}
                    onSelectDrug={(drug: DrugEntry) => {
                      // Auto-fill dosage / frequency / duration only if still empty
                      if (drug.dosage && !line.dosage)
                        updateLine(line.id, "dosage", drug.dosage);
                      if (drug.frequency && !line.frequency)
                        updateLine(line.id, "frequency", drug.frequency);
                      if (drug.duration && !line.duration)
                        updateLine(line.id, "duration", drug.duration);
                    }}
                  />
                  <View style={styles.lineRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lineLabel}>{t("ordonnance.dosage")}</Text>
                      <TextInput
                        style={styles.lineInput}
                        value={line.dosage}
                        onChangeText={(v) => updateLine(line.id, "dosage", v)}
                        placeholder={t("ordonnance.dosagePlaceholder")}
                        placeholderTextColor={colors.textTertiary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lineLabel}>{t("ordonnance.duration")}</Text>
                      <TextInput
                        style={styles.lineInput}
                        value={line.duration}
                        onChangeText={(v) => updateLine(line.id, "duration", v)}
                        placeholder={t("ordonnance.durationPlaceholder")}
                        placeholderTextColor={colors.textTertiary}
                      />
                    </View>
                  </View>
                  <Text style={styles.lineLabel}>{t("ordonnance.frequency")}</Text>
                  <TextInput
                    style={styles.lineInput}
                    value={line.frequency}
                    onChangeText={(v) => updateLine(line.id, "frequency", v)}
                    placeholder={t("ordonnance.frequencyPlaceholder")}
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              ))
            )}

            {/* Add line button */}
            <Pressable style={styles.addLineBtn} onPress={addLine}>
              <Icon name="add" size={16} color={colors.brand} />
              <Text style={styles.addLineBtnText}>{t("ordonnance.addLine")}</Text>
            </Pressable>

            {/* General notes */}
            <Text style={styles.sectionLabel}>{t("ordonnance.notes")}</Text>
            <TextInput
              style={[styles.lineInput, styles.textarea]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t("ordonnance.notesPlaceholder")}
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* ── Repeat last prescription ────────────────────────── */}
            {lastLines && lastLines.length > 0 && (
              <Pressable style={styles.repeatBtn} onPress={repeatLast}>
                <Icon name="refresh" size={15} color={colors.brand} />
                <Text style={styles.repeatBtnText}>{t("ordonnance.repeatLast")}</Text>
              </Pressable>
            )}

            {/* ── Templates panel ─────────────────────────────────── */}
            <Pressable style={styles.templatesToggle} onPress={() => setShowTemplates((v) => !v)}>
              <Icon name="clipboard" size={15} color={colors.brand} />
              <Text style={styles.templatesToggleText}>{t("ordonnance.templates")}</Text>
              <View style={{ flex: 1 }} />
              <Icon name={showTemplates ? "chevronUp" : "chevronDown"} size={16} color={colors.brand} />
            </Pressable>

            {showTemplates && (
              <View style={styles.templatesPanel}>
                {templates.length === 0 ? (
                  <Text style={styles.noTemplatesText}>{t("ordonnance.noTemplates")}</Text>
                ) : (
                  templates.map((tpl) => (
                    <View key={tpl.id} style={styles.templateRow}>
                      <Pressable style={styles.templateLoad} onPress={() => applyTemplate(tpl)}>
                        <Icon name="pill" size={13} color={colors.brand} />
                        <Text style={styles.templateName}>{tpl.name}</Text>
                        <Text style={styles.templateMeta}>{tpl.lines.length} méd.</Text>
                      </Pressable>
                      <Pressable onPress={() => deleteTemplate(tpl.id)} hitSlop={8}>
                        <Icon name="delete" size={15} color={colors.danger} />
                      </Pressable>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ── Save as template ────────────────────────────────── */}
            {hasLines && !showSaveTemplate && (
              <Pressable style={styles.saveTemplateBtn} onPress={() => setShowSaveTemplate(true)}>
                <Icon name="add" size={14} color={colors.brand} />
                <Text style={styles.saveTemplateBtnText}>{t("ordonnance.saveAsTemplate")}</Text>
              </Pressable>
            )}
            {showSaveTemplate && (
              <View style={styles.saveTemplateRow}>
                <TextInput
                  style={[styles.lineInput, { flex: 1 }]}
                  value={templateName}
                  onChangeText={setTemplateName}
                  placeholder={t("ordonnance.templateNamePlaceholder")}
                  placeholderTextColor={colors.textTertiary}
                  autoFocus
                />
                <Pressable
                  style={[styles.saveTemplateConfirm, !templateName.trim() && { opacity: 0.4 }]}
                  onPress={saveAsTemplate}
                  disabled={!templateName.trim()}
                >
                  <Icon name="check" size={16} color={colors.textOnDark} />
                </Pressable>
                <Pressable onPress={() => setShowSaveTemplate(false)} hitSlop={8}>
                  <Icon name="close" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>
            )}

            {/* ── Action buttons ───────────────────────────────────── */}
            <View style={styles.actionRow}>
              <Pressable
                style={[styles.shareBtn, (!hasLines || loading) && styles.shareBtnDisabled, { flex: 1 }]}
                onPress={handleShare}
                disabled={!hasLines || loading}
              >
                <Icon name="share" size={16} color={colors.textOnDark} />
                <Text style={styles.shareBtnText}>
                  {loading ? "…" : t("ordonnance.shareAsPdf")}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.whatsappBtn, !hasLines && styles.shareBtnDisabled]}
                onPress={handleWhatsApp}
                disabled={!hasLines}
              >
                <Text style={styles.whatsappBtnText}>WhatsApp</Text>
              </Pressable>
            </View>
            <View style={{ height: spacing.xl }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  patientBadge: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.brandSoft, borderRadius: radii.md,
    paddingHorizontal: spacing.md, paddingVertical: 8, marginBottom: spacing.md,
  },
  patientBadgeText: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.brand },
  dateBadge: { fontSize: 12, color: colors.textSecondary },
  emptyLines: { alignItems: "center", paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { ...typography.caption, color: colors.textTertiary, textAlign: "center" },
  lineCard: {
    backgroundColor: colors.bg, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md, ...shadows.card,
  },
  lineCardConflict: { borderColor: colors.danger, borderWidth: 1.5 },
  allergyBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: colors.warningSoft ?? "#FBF0DD",
    borderWidth: 1, borderColor: colors.warning,
    borderRadius: radii.md, padding: spacing.sm + 2, marginBottom: spacing.md,
  },
  allergyBannerConflict: {
    backgroundColor: colors.dangerSoft ?? "#FDEAEA", borderColor: colors.danger,
  },
  allergyText: { flex: 1, fontSize: 12.5, fontWeight: "700", color: "#9a6e00", lineHeight: 17 },
  allergyConflictText: { fontSize: 12, fontWeight: "700", color: colors.danger, marginTop: 3 },
  repeatBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    backgroundColor: colors.brandSoft ?? colors.bg,
    borderWidth: 1, borderColor: colors.brand,
    borderRadius: radii.md, paddingVertical: spacing.sm + 1, marginBottom: spacing.sm,
  },
  repeatBtnText: { fontSize: 13.5, fontWeight: "700", color: colors.brand },
  lineNumRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: spacing.sm,
  },
  lineNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.brand, alignItems: "center", justifyContent: "center",
  },
  lineNumText: { fontSize: 12, fontWeight: "700", color: colors.textOnDark },
  lineLabel: {
    fontSize: 10, fontWeight: "600", color: colors.brand,
    textTransform: "uppercase", letterSpacing: 0.4,
    marginBottom: 4, marginTop: spacing.sm,
  },
  lineInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: colors.textPrimary, backgroundColor: colors.surface,
  },
  lineRow: { flexDirection: "row", gap: spacing.sm },
  addLineBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, borderWidth: 1.5, borderColor: colors.brand,
    borderStyle: "dashed", borderRadius: radii.lg,
    paddingVertical: 12, marginBottom: spacing.md,
  },
  addLineBtnText: { fontSize: 14, fontWeight: "600", color: colors.brand },
  sectionLabel: {
    fontSize: 11, fontWeight: "600", color: colors.brand,
    textTransform: "uppercase", letterSpacing: 0.4,
    marginBottom: 6, marginTop: spacing.sm,
  },
  textarea: { height: 72, paddingTop: 10 },
  templatesToggle: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    borderWidth: 1, borderColor: colors.brand + "44",
    borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: 10,
    marginTop: spacing.md, backgroundColor: colors.brandSoft,
  },
  templatesToggleText: { fontSize: 13, fontWeight: "600", color: colors.brand },
  templatesPanel: {
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, padding: spacing.sm, marginTop: 4,
    backgroundColor: colors.bg, gap: spacing.xs,
  },
  noTemplatesText: {
    fontSize: 13, color: colors.textTertiary, textAlign: "center", paddingVertical: spacing.sm,
  },
  templateRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingVertical: 6,
  },
  templateLoad: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radii.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  templateName: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  templateMeta: { fontSize: 11, color: colors.textSecondary },
  saveTemplateBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.xs, paddingVertical: 8, marginTop: 6,
  },
  saveTemplateBtnText: { fontSize: 12, fontWeight: "600", color: colors.brand },
  saveTemplateRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 6,
  },
  saveTemplateConfirm: {
    backgroundColor: colors.brand, borderRadius: radii.sm,
    padding: 10,
  },
  actionRow: {
    flexDirection: "row", gap: spacing.sm, marginTop: spacing.md,
  },
  shareBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, backgroundColor: colors.brand,
    borderRadius: radii.lg, paddingVertical: 15,
  },
  shareBtnDisabled: { backgroundColor: colors.borderStrong },
  shareBtnText: { color: colors.textOnDark, fontWeight: "700", fontSize: 14 },
  whatsappBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#25D366", borderRadius: radii.lg,
    paddingHorizontal: spacing.lg, paddingVertical: 15,
  },
  whatsappBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
