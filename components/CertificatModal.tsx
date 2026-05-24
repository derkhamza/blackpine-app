import React, { useState, useMemo } from "react";
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
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CertificatMedical, CertificatType, DoctorProfile } from "../lib/cabinetTypes";
import { DatePickerField } from "./DatePickerField";
import { Icon } from "../lib/icons";
import { radii, shadows, spacing, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { sharedModalStyles as _sharedModalStyles, makeSharedStyles } from "../lib/sharedStyles";
import { uuid, todayIso, addDays as addDaysUtil } from "../lib/utils";
import { formatDateShort as formatDate, todayFr } from "../lib/format";

// CertificatModal uses inclusive end-dates (3 days = day N to N+2)
function addDays(iso: string, n: number): string {
  return addDaysUtil(iso, n, true);
}

const CERT_TYPES: CertificatType[] = ["arret_travail", "aptitude", "presence", "autre"];

const CERT_ICONS: Record<CertificatType, "award" | "fileCheck" | "check" | "clipboard"> = {
  arret_travail: "fileCheck",
  aptitude: "award",
  presence: "check",
  autre: "clipboard",
};

interface Props {
  visible: boolean;
  patientName: string;
  patientGender?: "M" | "F";
  /** Set when the modal is opened from AppointmentDetailScreen. */
  appointmentId?: string;
  doctorProfile: DoctorProfile;
  onClose: () => void;
  onSave?: (c: CertificatMedical) => void;
  t: (k: string) => string;
}

// ─── HTML Template ──────────────────────────────────────────────────────────

export function buildCertificatHTML(
  certType: CertificatType,
  patientName: string,
  patientGender: "M" | "F" | undefined,
  fromDate: string,
  duration: number,
  toDate: string,
  notes: string,
  doctorProfile: DoctorProfile,
  t: (k: string) => string,
): string {
  const dr = doctorProfile.fullName ? `Dr. ${doctorProfile.fullName}` : "Docteur";
  const specialty = doctorProfile.specialtyLabel || "";
  const inpe = doctorProfile.inpe ? `N° INPE : ${doctorProfile.inpe}` : "";
  const address = doctorProfile.address || "";
  const phone = doctorProfile.phone || "";
  const dateStr = formatDate(todayIso());
  const cityParts = address.split(",");
  const city = cityParts.length > 1 ? cityParts[cityParts.length - 1].trim() : "";
  const patientTitle = patientGender === "F" ? "Mme" : "M.";
  const patient = `${patientTitle} ${patientName}`;
  const metaLine = [specialty, inpe].filter(Boolean).join("  ·  ");

  const CERT_TYPE_LABELS: Record<CertificatType, string> = {
    arret_travail: t("certificat.arret_travail"),
    aptitude: t("certificat.aptitude"),
    presence: t("certificat.presence"),
    autre: t("certificat.autre"),
  };

  let bodyText = "";
  if (certType === "arret_travail") {
    bodyText = `${t("certificat.certify")}<br><br><strong>${patient}</strong><br><br>
      ${t("certificat.arretText")} <strong>${formatDate(fromDate)}</strong> ${t("certificat.toText")}
      <strong>${formatDate(toDate)}</strong> (${duration} jour${duration > 1 ? "s" : ""}).`;
  } else if (certType === "aptitude") {
    bodyText = `${t("certificat.certify")}<br><br><strong>${patient}</strong><br><br>${t("certificat.aptitudeText")}`;
  } else if (certType === "presence") {
    bodyText = `${t("certificat.certify")}<br><br><strong>${patient}</strong><br><br>${t("certificat.presenceText")}`;
  } else {
    bodyText = `${t("certificat.certify")}<br><br><strong>${patient}</strong><br><br>${t("certificat.autreText")}`;
  }

  if (notes.trim()) {
    bodyText += `<br><br><em>${notes}</em>`;
  }

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
  .cert-badge { display: inline-block; background: #1B4F72; color: white;
                font-size: 8pt; font-weight: 700; text-transform: uppercase;
                letter-spacing: 1.5px; padding: 4px 14px; border-radius: 20px; margin-bottom: 14px; }
  .doc-title { text-align: center; font-size: 14pt; font-weight: 800; letter-spacing: 3px;
               text-transform: uppercase; border: 2px solid #1B4F72; color: #1B4F72;
               padding: 9px 20px; margin: 16px 0 24px; }
  .cert-body { font-size: 12pt; line-height: 1.8; color: #222;
               border: 1px solid #dde; border-radius: 8px; padding: 20px 22px;
               background: #f9fbff; margin-bottom: 30px; }
  .cert-intro { font-size: 10pt; color: #555; margin-bottom: 12px; }
  .certify-label { font-size: 8pt; text-transform: uppercase; color: #888;
                   letter-spacing: 1px; margin-bottom: 4px; }
  .signature-area { margin-top: 50px; display: flex; justify-content: flex-end; }
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
        ${address ? `${address}<br>` : ""}
        ${phone ? phone : ""}
      </div>
    </div>
    <div class="header-date">Date : ${dateStr}</div>
  </div>

  <div style="text-align:center">
    <span class="cert-badge">${CERT_TYPE_LABELS[certType]}</span>
  </div>
  <div class="doc-title">Certificat Médical</div>

  <div class="cert-body">
    <div class="certify-label">${t("certificat.doctorTitle")}</div>
    <div style="font-size:13pt;font-weight:700;margin:6px 0 16px">${dr}</div>
    <div>${bodyText}</div>
  </div>

  <div class="signature-area">
    <div class="signature-box">
      <div class="signature-city">${city ? `Fait à ${city}, le ${dateStr}` : `Fait le ${dateStr}`}</div>
      <div class="signature-line">${t("certificat.signature")}</div>
    </div>
  </div>

  <div class="footer">Généré par BLACKPINE Cabinet · ${dateStr}</div>
</div>
</body>
</html>`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CertificatModal({
  visible, patientName, patientGender, appointmentId, doctorProfile, onClose, onSave, t,
}: Props) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const sharedModalStyles = makeSharedStyles(colors);
  const insets = useSafeAreaInsets();
  const [certType, setCertType] = useState<CertificatType>("arret_travail");
  const [fromDate, setFromDate] = useState(todayIso());
  const [durationDays, setDurationDays] = useState("3");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setCertType("arret_travail");
      setFromDate(todayIso());
      setDurationDays("3");
      setNotes("");
      setLoading(false);
    }
  }, [visible]);

  const duration = parseInt(durationDays) || 1;
  const toDate = certType === "arret_travail" ? addDays(fromDate, duration) : "";

  const persistCertificat = () => {
    const certificat: CertificatMedical = {
      id: uuid(),
      patientName,
      appointmentId,
      date: todayIso(),
      type: certType,
      durationDays: certType === "arret_travail" ? duration : undefined,
      fromDate: certType === "arret_travail" ? fromDate : undefined,
      notes: notes.trim() || undefined,
    };
    onSave?.(certificat);
    return certificat;
  };

  const handleShare = async () => {
    if (loading) return;
    setLoading(true);
    try {
      persistCertificat();
      const html = buildCertificatHTML(
        certType, patientName, patientGender,
        fromDate, duration, toDate, notes, doctorProfile, t,
      );
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Certificat - ${patientName}`,
        UTI: "com.adobe.pdf",
      });
    } catch {
      // cancelled
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = async () => {
    if (loading) return;
    persistCertificat();
    const CERT_TYPE_LABELS: Record<CertificatType, string> = {
      arret_travail: t("certificat.arret_travail"),
      aptitude: t("certificat.aptitude"),
      presence: t("certificat.presence"),
      autre: t("certificat.autre"),
    };
    const patientTitle = patientGender === "F" ? "Mme" : "M.";
    let body = `📋 *Certificat Médical - ${CERT_TYPE_LABELS[certType]}*\n👤 ${patientTitle} ${patientName}\n📅 ${formatDate(todayIso())}`;
    if (certType === "arret_travail") {
      body += `\n\n🗓 Arrêt du ${formatDate(fromDate)} au ${formatDate(toDate)} (${duration} jour${duration > 1 ? "s" : ""})`;
    }
    if (notes.trim()) body += `\n\n📝 ${notes.trim()}`;
    body += "\n\n_Généré par BLACKPINE Cabinet_";
    const url = `whatsapp://send?text=${encodeURIComponent(body)}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert("WhatsApp", "WhatsApp n'est pas installé sur cet appareil.");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={sharedModalStyles.overlay}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
          <View style={sharedModalStyles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Icon name="award" size={18} color={colors.brand} />
              <Text style={sharedModalStyles.title}>{t("certificat.title")}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Icon name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Patient badge */}
          <View style={styles.patientBadge}>
            <Icon name="profile" size={14} color={colors.brand} />
            <Text style={styles.patientBadgeText}>{patientName}</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Type selector */}
            <Text style={styles.sectionLabel}>{t("certificat.type")}</Text>
            <View style={styles.typeGrid}>
              {CERT_TYPES.map((ct) => (
                <Pressable
                  key={ct}
                  style={[styles.typeBtn, certType === ct && styles.typeBtnActive]}
                  onPress={() => setCertType(ct)}
                >
                  <Icon
                    name={CERT_ICONS[ct]}
                    size={18}
                    color={certType === ct ? colors.textOnDark : colors.brand}
                  />
                  <Text style={[styles.typeBtnText, certType === ct && styles.typeBtnTextActive]}>
                    {t(`certificat.${ct}`)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Arrêt de travail fields */}
            {certType === "arret_travail" && (
              <>
                <View style={styles.row}>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.sectionLabel}>{t("certificat.fromDate")}</Text>
                    <DatePickerField
                      value={fromDate}
                      onChange={setFromDate}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionLabel}>{t("certificat.durationDays")}</Text>
                    <TextInput
                      style={styles.input}
                      value={durationDays}
                      onChangeText={setDurationDays}
                      placeholder={t("certificat.durationPlaceholder")}
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
                <View style={styles.previewBox}>
                  <Text style={styles.previewText}>
                    Du {formatDate(fromDate)} au {formatDate(toDate)} · {duration} jour{duration > 1 ? "s" : ""}
                  </Text>
                </View>
              </>
            )}

            {/* Notes */}
            <Text style={styles.sectionLabel}>{t("certificat.notes")}</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t("certificat.notesPlaceholder")}
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <Pressable
                style={[styles.shareBtn, loading && styles.shareBtnDisabled, { flex: 1 }]}
                onPress={handleShare}
                disabled={loading}
              >
                <Icon name="share" size={16} color={colors.textOnDark} />
                <Text style={styles.shareBtnText}>
                  {loading ? "…" : t("certificat.shareAsPdf")}
                </Text>
              </Pressable>
              <Pressable
                style={styles.whatsappBtn}
                onPress={handleWhatsApp}
                disabled={loading}
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
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg, maxHeight: "88%",
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border,
    alignSelf: "center", marginTop: 10, marginBottom: spacing.md,
  },
  header: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: spacing.sm,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  patientBadge: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.brandSoft, borderRadius: radii.md,
    paddingHorizontal: spacing.md, paddingVertical: 8, marginBottom: spacing.md,
  },
  patientBadgeText: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.brand },
  sectionLabel: {
    fontSize: 10, fontWeight: "600", color: colors.brand,
    textTransform: "uppercase", letterSpacing: 0.4,
    marginBottom: 6, marginTop: spacing.md,
  },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  typeBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.bg, flex: 1, minWidth: "45%",
  },
  typeBtnActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  typeBtnText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, flex: 1 },
  typeBtnTextActive: { color: colors.textOnDark },
  row: { flexDirection: "row", gap: spacing.sm },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: colors.textPrimary, backgroundColor: colors.bg,
  },
  textarea: { height: 72, paddingTop: 10 },
  previewBox: {
    backgroundColor: colors.brandSoft, borderRadius: radii.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginTop: spacing.xs,
  },
  previewText: { fontSize: 13, color: colors.brand, fontWeight: "600", textAlign: "center" },
  actionRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  shareBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, backgroundColor: colors.brand,
    borderRadius: radii.lg, paddingVertical: 15, ...shadows.card,
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
