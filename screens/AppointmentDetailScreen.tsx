import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppointmentModal, TYPE_COLORS, STATUS_COLORS } from "../components/AppointmentModal";
import { useTopInset } from "../components/SafeScreen";
import { OrdonnanceModal } from "../components/OrdonnanceModal";
import { Icd10Picker } from "../components/Icd10Picker";
import { Icd10Entry } from "../lib/icd10";
import { NoteTemplateSheet } from "../components/NoteTemplateSheet";
import { NoteTemplate } from "../lib/noteTemplates";
import { CertificatModal } from "../components/CertificatModal";
import { PatientHistoryModal } from "../components/PatientHistoryModal";
import { useCabinet } from "../lib/CabinetContext";
import { useBilling } from "../lib/useBilling";
import { Appointment, AppointmentStatus, InvoiceRecord, VitalSigns, BillingLine, PaymentMethod, Patient } from "../lib/cabinetTypes";
import { paymentSummary } from "../lib/billing";
import { findOrphanAppts } from "../lib/orphanAppts";
import { Icon } from "../lib/icons";
import { radii, shadows, spacing, typography, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { useT } from "../lib/useT";
import { formatDateShort as formatDateLong, bmiClassify } from "../lib/format";
import { generateAndShareInvoice } from "../lib/invoicePdf";
import { uuid, todayIso } from "../lib/utils";
import { tapLight, tapSuccess } from "../lib/haptics";
import { ScalePressable } from "../components/ScalePressable";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PHOTOS_DIR = ((FileSystem as any).documentDirectory ?? "") + "appt-photos/";

export function AppointmentDetailScreen({ route, navigation }: any) {
  const { appointmentId } = route.params as { appointmentId: string };
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();
  const {
    appointments, patients, updateAppointment, deleteAppointment, deleteAppointmentSeries, addAppointment, addPatient, doctorProfile, addInvoice, invoices,
    addOrdonnance, addCertificat,
    ordonnances, certificats,
    apptPhotos, addApptPhoto, removeApptPhoto,
    apptPhotoLabels, setApptPhotoLabel,
    userId,
  } = useCabinet();
  const { billAppointmentItemized, recordPayment, lastBilledAmount } = useBilling();
  const insets = useSafeAreaInsets();
  const topInset = useTopInset();

  const appt = appointments.find((a) => a.id === appointmentId);

  // Most recent prior prescription for this patient → "Repeat last" in the modal.
  const lastOrdonnanceLines = useMemo(() => {
    if (!appt?.patientId) return undefined;
    const prior = ordonnances
      .filter((o) => o.patientId === appt.patientId && o.appointmentId !== appt.id && o.lines?.length)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return prior[0]?.lines;
  }, [ordonnances, appt?.patientId, appt?.id]);

  // Modals
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [ordonnanceVisible, setOrdonnanceVisible] = useState(false);
  const [certificatVisible, setCertificatVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [icd10Visible, setIcd10Visible] = useState(false);
  const [templateSheetVisible, setTemplateSheetVisible] = useState(false);

  // Photos
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [labelingUri, setLabelingUri] = useState<string | null>(null);

  // Payment sheet — itemized billing (base + acts − reduction) with deferred/partial collection
  const [showPayment, setShowPayment] = useState(false);
  const [payMode, setPayMode]         = useState<"bill" | "topup">("bill");
  const [billItems, setBillItems]     = useState<BillingLine[]>([]);
  const [billReduction, setBillReduction] = useState("");
  const [billCollected, setBillCollected] = useState("");
  const [payMethod, setPayMethod]     = useState<PaymentMethod>("cash");

  // Reimbursement section
  const [rmbAmount, setRmbAmount] = useState("");

  // Previous consultation banner
  const [prevSummaryDismissed, setPrevSummaryDismissed] = useState(false);

  /** Most recent prior appointment for the same patient that has a clinical note. */
  const prevAppt = useMemo(() => {
    if (!appt?.patientId) return null;
    const candidates = appointments.filter(
      (a) =>
        a.id !== appt.id &&
        a.patientId === appt.patientId &&
        (a.date < appt.date ||
          (a.date === appt.date && a.startTime < appt.startTime)) &&
        !!(
          a.consultationNote?.diagnosis ||
          a.consultationNote?.treatment ||
          a.consultationNote?.motif
        ),
    );
    if (candidates.length === 0) return null;
    return candidates.sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime),
    )[0];
  }, [appointments, appt?.id, appt?.patientId, appt?.date, appt?.startTime]);

  // Consultation timer
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [timerSecs,  setTimerSecs]  = useState(0);
  const timerPulse = useRef(new Animated.Value(1)).current;

  // Active tab
  const [tab, setTab] = useState<"consultation" | "documents" | "suivi">("consultation");

  // Invoice sheet
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState("200");
  const [invoiceGenerating, setInvoiceGenerating] = useState(false);
  const [invoiceActIdx, setInvoiceActIdx] = useState(0);
  const [invoiceTaux, setInvoiceTaux] = useState<70 | 80>(70);

  // Clinical notes — local editable state
  const [noteMotif, setNoteMotif] = useState("");
  const [noteExam, setNoteExam] = useState("");
  const [noteDiag, setNoteDiag] = useState("");
  const [noteTreatment, setNoteTreatment] = useState("");

  // Vital signs — local editable state (strings for TextInput)
  const [vsBpSys, setVsBpSys] = useState("");
  const [vsBpDia, setVsBpDia] = useState("");
  const [vsHr, setVsHr] = useState("");
  const [vsTemp, setVsTemp] = useState("");
  const [vsSpo2, setVsSpo2] = useState("");
  const [vsWeight, setVsWeight] = useState("");
  const [vsHeight, setVsHeight] = useState("");

  // Sync clinical notes + vitals from appointment when navigating here
  useEffect(() => {
    if (appt) {
      setPrevSummaryDismissed(false);
      setNoteMotif(appt.consultationNote?.motif || "");
      setNoteExam(appt.consultationNote?.examination || "");
      setNoteDiag(appt.consultationNote?.diagnosis || "");
      setNoteTreatment(appt.consultationNote?.treatment || "");
      // Vitals
      const vs = appt.vitalSigns;
      setVsBpSys(vs?.bpSys != null ? String(vs.bpSys) : "");
      setVsBpDia(vs?.bpDia != null ? String(vs.bpDia) : "");
      setVsHr(vs?.hr != null ? String(vs.hr) : "");
      setVsTemp(vs?.temp != null ? String(vs.temp) : "");
      setVsSpo2(vs?.spo2 != null ? String(vs.spo2) : "");
      setVsWeight(vs?.weight != null ? String(vs.weight) : "");
      setVsHeight(vs?.height != null ? String(vs.height) : "");
      // Reimbursement amount
      setRmbAmount(appt.reimbursementAmount != null ? String(appt.reimbursementAmount) : "");
    }
  }, [appt?.id]); // intentionally only on ID change

  // ── Timer: pulsing dot animation ─────────────────────────────────────────
  useEffect(() => {
    if (timerStart === null) { timerPulse.setValue(1); return; }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(timerPulse, { toValue: 0.25, duration: 750, useNativeDriver: true }),
        Animated.timing(timerPulse, { toValue: 1.0,  duration: 750, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [timerStart]);

  // ── Timer: tick every second ──────────────────────────────────────────────
  useEffect(() => {
    if (timerStart === null) return;
    const id = setInterval(
      () => setTimerSecs(Math.floor((Date.now() - timerStart) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [timerStart]);

  if (!appt) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
            <Icon name="back" size={22} color={colors.brand} />
          </Pressable>
          <Text style={styles.headerTitle}>{t("agenda.appointment")}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t("agenda.notFound")}</Text>
          <Pressable style={styles.backBtnLarge} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnLargeText}>{t("back")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const typeColor = TYPE_COLORS[appt.type];
  const statusColor = STATUS_COLORS[appt.status];
  const photos = apptPhotos[appt.id] ?? [];

  // ── Auto-save clinical notes on blur ──────────────────────────────────────
  const saveNotes = () => {
    updateAppointment({
      ...appt,
      consultationNote: {
        motif: noteMotif.trim(),
        examination: noteExam.trim(),
        diagnosis: noteDiag.trim(),
        treatment: noteTreatment.trim(),
      },
    });
  };

  // ── Apply a consultation note template ───────────────────────────────────
  const applyTemplate = (tpl: NoteTemplate) => {
    const next = {
      motif:       tpl.motif       !== undefined ? tpl.motif       : noteMotif,
      examination: tpl.examination !== undefined ? tpl.examination : noteExam,
      diagnosis:   tpl.diagnosis   !== undefined ? tpl.diagnosis   : noteDiag,
      treatment:   tpl.treatment   !== undefined ? tpl.treatment   : noteTreatment,
    };
    // Update local state for immediate display
    if (tpl.motif       !== undefined) setNoteMotif(tpl.motif);
    if (tpl.examination !== undefined) setNoteExam(tpl.examination);
    if (tpl.diagnosis   !== undefined) setNoteDiag(tpl.diagnosis);
    if (tpl.treatment   !== undefined) setNoteTreatment(tpl.treatment);
    // Persist straight away (bypasses the async state update)
    updateAppointment({ ...appt, consultationNote: next });
  };

  // ── Auto-save vital signs on blur ─────────────────────────────────────────
  const saveVitals = () => {
    const parse = (s: string) => { const n = parseFloat(s.replace(",", ".")); return isNaN(n) ? undefined : n; };
    const vs: VitalSigns = {
      bpSys: parse(vsBpSys),
      bpDia: parse(vsBpDia),
      hr: parse(vsHr),
      temp: parse(vsTemp),
      spo2: parse(vsSpo2),
      weight: parse(vsWeight),
      height: parse(vsHeight),
    };
    // Only save if at least one value is present
    const hasAny = Object.values(vs).some((v) => v !== undefined);
    updateAppointment({ ...appt, vitalSigns: hasAny ? vs : undefined });
  };

  // ── BMI calculation (live, display-only) ──────────────────────────────────
  const bmiValue = (() => {
    const w = parseFloat(vsWeight.replace(",", "."));
    const h = parseFloat(vsHeight.replace(",", "."));
    if (!w || !h || h <= 0) return null;
    return w / ((h / 100) * (h / 100));
  })();

  // ── Vital sign colour helpers ─────────────────────────────────────────────
  const vsColor = (key: keyof VitalSigns, val: number | null): string => {
    if (val === null || val === undefined) return colors.textPrimary;
    switch (key) {
      case "bpSys":  return val < 90 || val > 140 ? colors.danger : val > 130 ? colors.gold : colors.success;
      case "bpDia":  return val < 60 || val > 90  ? colors.danger : val > 85  ? colors.gold : colors.success;
      case "hr":     return val < 50 || val > 100  ? colors.danger : colors.success;
      case "temp":   return val < 36 || val > 38.5 ? colors.danger : val > 37.5 ? colors.gold : colors.success;
      case "spo2":   return val < 90 ? colors.danger : val < 95 ? colors.gold : colors.success;
      default:       return colors.textPrimary;
    }
  };

  // ── Timer helpers ─────────────────────────────────────────────────────────
  const scheduledMins = (() => {
    const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    return Math.max(0, toMin(appt.endTime) - toMin(appt.startTime));
  })();

  const timerDisplay = (() => {
    const m = Math.floor(timerSecs / 60);
    const s = timerSecs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  })();

  const timerRunning  = timerStart !== null;
  const timerOver     = timerRunning && scheduledMins > 0 && timerSecs > scheduledMins * 60;
  const timerProgress = scheduledMins > 0 ? Math.min(timerSecs / (scheduledMins * 60), 1) : 0;

  const handleTimerStop = () => {
    const elapsed = timerSecs;
    setTimerStart(null);
    setTimerSecs(0);
    if (elapsed < 60) return; // ignore very short runs
    const [sh, sm] = appt.startTime.split(":").map(Number);
    const newEndMin = sh * 60 + sm + Math.round(elapsed / 60);
    const newEnd =
      `${String(Math.floor(newEndMin / 60) % 24).padStart(2, "0")}:` +
      `${String(newEndMin % 60).padStart(2, "0")}`;
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const durStr = `${mins} min ${String(secs).padStart(2, "0")} s`;
    Alert.alert(
      `Durée : ${durStr}`,
      `Mettre à jour l'heure de fin à ${newEnd} ?`,
      [
        { text: "Non", style: "cancel" },
        { text: `Oui — ${newEnd}`, onPress: () => updateAppointment({ ...appt, endTime: newEnd }) },
      ],
    );
  };

  // ── Status change ─────────────────────────────────────────────────────────
  const handleStatusChange = (status: AppointmentStatus) => {
    updateAppointment({ ...appt, status });
    if (status === "in_consultation" && !timerRunning) {
      // Auto-start consultation timer when doctor begins the consultation
      setTimerStart(Date.now());
      setTimerSecs(0);
      setTab("consultation");
    }
    if (status === "completed" && !appt.billedAt) {
      openBillSheet();
    }
  };

  // ── Create patient record from an appointment booked under just a name ─────
  const handleCreatePatientFromAppt = () => {
    if (!appt) return;
    const parts = appt.patientName.trim().split(/\s+/);
    const newPatient: Patient = {
      id: uuid(),
      createdAt: new Date().toISOString(),
      firstName: parts[0] ?? appt.patientName.trim(),
      lastName: parts.slice(1).join(" ") || parts[0] || "",
      phone: appt.bookingPhone || undefined,
    };
    addPatient(newPatient);
    const orphans = findOrphanAppts(appointments, appt.patientName);
    orphans.forEach((a) => updateAppointment({ ...a, patientId: newPatient.id }));
    tapSuccess();
    Alert.alert(t("orphan.created"), t("orphan.linkedN").replace("{n}", String(orphans.length)));
  };

  // ── Itemized billing helpers ──────────────────────────────────────────────
  const openBillSheet = () => {
    if (!appt) return;
    if (appt.billedItems && appt.billedItems.length) {
      setBillItems(appt.billedItems.map((l) => ({ ...l })));
      setBillReduction(appt.billedReduction ? String(appt.billedReduction) : "");
      const tot = appt.billedItems.reduce((s, l) => s + l.qty * l.unitPrice, 0) - (appt.billedReduction ?? 0);
      setBillCollected(String(Math.max(0, tot)));
    } else {
      const base = Number(lastBilledAmount(appt.patientId, appt.patientName)) || 0;
      setBillItems([{ label: t(`agenda.types.${appt.type}`), qty: 1, unitPrice: base }]);
      setBillReduction("");
      setBillCollected(String(base));
    }
    setPayMethod("cash");
    setPayMode("bill");
    setShowPayment(true);
  };

  const openTopupSheet = () => {
    if (!appt) return;
    setBillCollected(String(paymentSummary(appt).balance));
    setPayMethod("cash");
    setPayMode("topup");
    setShowPayment(true);
  };

  const addBillAct = (label: string, price: number) =>
    setBillItems((prev) => [...prev, { label, qty: 1, unitPrice: price }]);
  const removeBillItem = (i: number) =>
    setBillItems((prev) => prev.filter((_, idx) => idx !== i));

  const billSubtotal   = billItems.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const billReductionN = Math.max(0, parseFloat(billReduction.replace(",", ".")) || 0);
  const billTotal      = Math.max(0, billSubtotal - billReductionN);
  const billCollectedN = Math.min(billTotal, Math.max(0, parseFloat(billCollected.replace(",", ".")) || 0));
  const billRemaining  = Math.max(0, billTotal - billCollectedN);

  // ── Payment confirm ───────────────────────────────────────────────────────
  const handlePaymentConfirm = () => {
    if (!appt) return;
    if (payMode === "topup") {
      const amt = Math.max(0, parseFloat(billCollected.replace(",", ".")) || 0);
      if (amt <= 0) { setShowPayment(false); return; }
      tapSuccess();
      recordPayment(appt, amt, payMethod);
      setShowPayment(false);
      return;
    }
    if (billTotal <= 0) { setShowPayment(false); return; }
    tapSuccess();
    billAppointmentItemized(appt, {
      items: billItems.map((l) => ({ label: l.label.trim() || t(`agenda.types.${appt.type}`), qty: Math.max(1, Math.round(l.qty) || 1), unitPrice: Number(l.unitPrice) || 0 })),
      reduction: billReductionN,
      collected: billCollectedN,
      method: payMethod,
    });
    setShowPayment(false);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = () => {
    if (appt.recurringRuleId) {
      Alert.alert(
        t("agenda.deleteConfirm"),
        t("agenda.deleteSeriesPrompt"),
        [
          { text: t("cancel"), style: "cancel" },
          {
            text: t("agenda.deleteOnlyThis"),
            onPress: () => { deleteAppointment(appt.id); navigation.goBack(); },
          },
          {
            text: t("agenda.deleteThisAndFollowing"),
            style: "destructive",
            onPress: () => { deleteAppointmentSeries(appt.recurringRuleId!, appt.date); navigation.goBack(); },
          },
        ]
      );
    } else {
      Alert.alert(t("agenda.deleteConfirm"), t("agenda.deleteWarning"), [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: () => {
            deleteAppointment(appt.id);
            navigation.goBack();
          },
        },
      ]);
    }
  };

  const handleSave = (updated: Appointment) => {
    updateAppointment(updated);
  };

  // ── Photo handlers ────────────────────────────────────────────────────────
  const copyPhotoToApp = async (uri: string): Promise<string> => {
    await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
    const filename = `${appt.id}_${Date.now()}.jpg`;
    const dest = PHOTOS_DIR + filename;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  };

  const handleAddPhoto = () => {
    Alert.alert(t("agenda.addPhoto"), "", [
      { text: t("agenda.photoCamera"), onPress: handleCamera },
      { text: t("agenda.photoGallery"), onPress: handleGallery },
      { text: t("cancel"), style: "cancel" },
    ]);
  };

  const handleCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("agenda.permissionRequired"), t("agenda.cameraPermission"));
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (result.canceled) return;
      const pickedUri = result.assets[0].uri;
      let finalUri = pickedUri;
      try { finalUri = await copyPhotoToApp(pickedUri); } catch { /* use raw uri */ }
      addApptPhoto(appt.id, finalUri);
      setLabelingUri(finalUri);
    } catch (err: any) {
      Alert.alert("Erreur", err?.message ?? "Impossible d'utiliser la caméra.");
    }
  };

  const handleGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("agenda.permissionRequired"), t("agenda.galleryPermission"));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (result.canceled) return;
      const pickedUri = result.assets[0].uri;
      let finalUri = pickedUri;
      try { finalUri = await copyPhotoToApp(pickedUri); } catch { /* use raw uri */ }
      addApptPhoto(appt.id, finalUri);
      setLabelingUri(finalUri);
    } catch (err: any) {
      Alert.alert("Erreur", err?.message ?? "Impossible d'accéder à la galerie.");
    }
  };

  const handleDeletePhoto = (uri: string) => {
    Alert.alert(t("agenda.photoDeleteConfirm"), t("agenda.photoDeleteWarning"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          try { await FileSystem.deleteAsync(uri, { idempotent: true }); } catch { /* silent */ }
          removeApptPhoto(appt.id, uri);
        },
      },
    ]);
  };

  // ── Invoice act types ─────────────────────────────────────────────────────
  const ACT_LABELS = [
    t("agenda.actConsultation"),
    t("agenda.actControl"),
    t("agenda.actSpecialist"),
    t("agenda.actTechnical"),
    t("agenda.actCare"),
  ];

  // ── Invoice generation ────────────────────────────────────────────────────
  const handleGenerateInvoice = async () => {
    const amount = parseFloat(invoiceAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) return;
    setInvoiceGenerating(true);
    try {
      const hasInsurance = !!(linkedPatient?.cnopsNumber);
      const invoiceNum = await generateAndShareInvoice({
        appt,
        doctor: doctorProfile,
        amount,
        actLabel: ACT_LABELS[invoiceActIdx],
        cnopsNumber: linkedPatient?.cnopsNumber,
        cin: linkedPatient?.cin,
        patientDob: linkedPatient?.dateOfBirth,
        taux: hasInsurance ? invoiceTaux : undefined,
      });
      if (invoiceNum) {
        const record: InvoiceRecord = {
          id: uuid(),
          appointmentId: appt.id,
          patientId: appt.patientId,
          patientName: appt.patientName,
          amount,
          actLabel: ACT_LABELS[invoiceActIdx],
          invoiceNumber: invoiceNum,
          issuedAt: new Date().toISOString(),
          cnopsNumber: linkedPatient?.cnopsNumber,
          taux: hasInsurance ? invoiceTaux : undefined,
        };
        addInvoice(record);
      }
      setShowInvoice(false);
    } catch {
      Alert.alert("", t("agenda.invoiceError"));
    } finally {
      setInvoiceGenerating(false);
    }
  };

  // ── Patient info for modals ────────────────────────────────────────────────
  const linkedPatient = patients.find((p) => p.id === appt.patientId);

  // ── Communication helpers ─────────────────────────────────────────────────

  /** Normalise any Moroccan number to the WhatsApp-ready format 212XXXXXXXXX */
  const formatPhoneForWhatsApp = (phone: string): string => {
    const digits = phone.replace(/[\s\-.()]/g, "");
    if (digits.startsWith("+")) return digits.slice(1);
    if (digits.startsWith("212")) return digits;
    if (digits.startsWith("0")) return "212" + digits.slice(1);
    return digits;
  };

  const handleCallPatient = () => {
    const phone = linkedPatient?.phone;
    if (!phone) { Alert.alert("", t("agenda.noPhoneNumber")); return; }
    Linking.openURL(`tel:${phone.replace(/\s/g, "")}`);
  };

  const handleWhatsAppReminder = () => {
    const phone = linkedPatient?.phone;
    if (!phone) { Alert.alert("", t("agenda.noPhoneNumber")); return; }

    const dateStr = new Date(appt.date + "T12:00:00").toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long",
    });
    const doctorName = doctorProfile.fullName ? `Dr. ${doctorProfile.fullName}` : "votre médecin";
    const address = doctorProfile.address ? `\n📍 ${doctorProfile.address}` : "";

    const message =
      `Bonjour ${appt.patientName},\n\n` +
      `Rappel de votre rendez-vous :\n` +
      `📅 ${dateStr}\n` +
      `⏰ ${appt.startTime}\n` +
      `👨‍⚕️ ${doctorName}` +
      address +
      `\n\nMerci de confirmer votre présence.`;

    const waNumber = formatPhoneForWhatsApp(phone);
    Linking.openURL(`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`);
  };

  const handleWhatsAppSummary = () => {
    const phone = linkedPatient?.phone;
    if (!phone) { Alert.alert("", t("agenda.noPhoneNumber")); return; }

    const firstName = appt.patientName.split(" ")[0];
    const dateStr = new Date(appt.date + "T12:00:00").toLocaleDateString("fr-FR", {
      day: "numeric", month: "long", year: "numeric",
    });
    const doctorName = doctorProfile.fullName ? `Dr. ${doctorProfile.fullName}` : "votre médecin";

    const lines: string[] = [
      `Bonjour ${firstName},`,
      ``,
      `Voici le résumé de votre consultation du ${dateStr} :`,
      ``,
    ];

    if (noteMotif.trim())     lines.push(`📋 *Motif* : ${noteMotif.trim()}`);
    if (noteExam.trim())      lines.push(`🩺 *Examen* : ${noteExam.trim()}`);
    if (noteDiag.trim())      lines.push(`🔍 *Diagnostic* : ${noteDiag.trim()}`);
    if (noteTreatment.trim()) lines.push(`💊 *Traitement* : ${noteTreatment.trim()}`);

    if (appt.followUpDate) {
      const followStr = appt.followUpDate.split("-").reverse().join("/");
      lines.push(`📅 *Prochain rendez-vous* : ${followStr}`);
    }

    lines.push(``, `${doctorName}`);
    if (doctorProfile.address) lines.push(`📍 ${doctorProfile.address}`);

    const waNumber = formatPhoneForWhatsApp(phone);
    Linking.openURL(`https://wa.me/${waNumber}?text=${encodeURIComponent(lines.join("\n"))}`);
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
          <Icon name="back" size={22} color={colors.brand} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{appt.patientName}</Text>
        <View style={styles.headerActions}>
          {linkedPatient && (
            <Pressable style={styles.iconBtn} onPress={() => setHistoryVisible(true)} hitSlop={8}>
              <Icon name="clock" size={17} color={colors.brand} />
            </Pressable>
          )}
          <Pressable style={styles.iconBtn} onPress={() => setEditModalVisible(true)} hitSlop={8}>
            <Icon name="edit" size={17} color={colors.brand} />
          </Pressable>
          <Pressable style={[styles.iconBtn, styles.iconBtnDanger]} onPress={handleDelete} hitSlop={8}>
            <Icon name="delete" size={17} color={colors.danger} />
          </Pressable>
        </View>
      </View>

      {/* ── Context bar: type/status badges + date/time + prev banner ── */}
      <View style={styles.contextBar}>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: typeColor + "22", borderColor: typeColor + "44" }]}>
            <Text style={[styles.badgeText, { color: typeColor }]}>
              {t(`agenda.types.${appt.type}`)}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusColor + "22", borderColor: statusColor + "44" }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {t(`agenda.statuses.${appt.status}`)}
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <Text style={styles.contextTime}>
            {formatDateLong(appt.date)}  ·  {appt.startTime}–{appt.endTime}
          </Text>
        </View>
        {prevAppt && !prevSummaryDismissed && (
          <View style={styles.prevBanner}>
            <View style={styles.prevBannerLeft}>
              <Icon name="clock" size={14} color={colors.brand} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.prevBannerDate}>
                  Dernière visite · {prevAppt.date.split("-").reverse().join("/")}
                </Text>
                {(() => {
                  const diag = prevAppt.consultationNote?.diagnosis?.trim();
                  const treat = prevAppt.consultationNote?.treatment?.trim();
                  const motif = prevAppt.consultationNote?.motif?.trim();
                  const snippet = [diag, treat].filter(Boolean).join(" · ") || motif || "";
                  return snippet ? (
                    <Text style={styles.prevBannerSnippet} numberOfLines={2}>{snippet}</Text>
                  ) : null;
                })()}
              </View>
            </View>
            <Pressable onPress={() => setPrevSummaryDismissed(true)} hitSlop={10} style={{ paddingTop: 1 }}>
              <Icon name="close" size={14} color={colors.textTertiary} />
            </Pressable>
          </View>
        )}
      </View>

      {/* ── Tab strip ── */}
      <View style={styles.tabStrip}>
        {([
          { key: "consultation" as const, label: t("agenda.tabConsultation"), icon: "clipboard"   as const },
          { key: "documents"    as const, label: t("agenda.tabDocuments"),    icon: "camera"      as const },
          { key: "suivi"        as const, label: t("agenda.tabSuivi"),        icon: "checkCircle" as const },
        ] as const).map(({ key, label, icon }) => (
          <Pressable
            key={key}
            style={[styles.tabBtn, tab === key && styles.tabBtnActive]}
            onPress={() => { tapLight(); setTab(key); }}
          >
            <Icon name={icon} size={12} color={tab === key ? colors.brand : colors.textTertiary} />
            <Text style={[styles.tabBtnText, tab === key && styles.tabBtnTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {/* ══════════════════ TAB: CONSULTATION ══════════════════ */}
      {tab === "consultation" && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.xl) + spacing.xxl }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Minuterie */}
          <View style={styles.timerCard}>
          {/* Header row */}
          <View style={styles.timerHeader}>
            <Icon name="clock" size={13} color={colors.brand} />
            <Text style={styles.timerTitle}>Minuterie</Text>
            <View style={{ flex: 1 }} />
            {timerRunning && (
              <View style={styles.timerBadge}>
                <Animated.View style={[styles.timerDot, { opacity: timerPulse }]} />
                <Text style={styles.timerBadgeText}>EN COURS</Text>
              </View>
            )}
          </View>

          {/* Time display */}
          <Text style={[styles.timerDisplay, timerOver && { color: colors.danger }]}>
            {timerDisplay}
          </Text>

          {/* Progress bar + hint */}
          {scheduledMins > 0 && (
            <View style={styles.timerProgressRow}>
              <View style={styles.timerTrack}>
                <View
                  style={[
                    styles.timerFill,
                    {
                      width: `${Math.round(timerProgress * 100)}%` as `${number}%`,
                      backgroundColor: timerOver ? colors.danger : colors.brand,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.timerHint, timerOver && { color: colors.danger }]}>
                {timerRunning && timerOver
                  ? `+${Math.floor((timerSecs - scheduledMins * 60) / 60)} min au-delà`
                  : `${scheduledMins} min prévues`}
              </Text>
            </View>
          )}

          {/* Start / Stop button */}
          <ScalePressable
            scaleTo={0.96}
            style={[styles.timerBtn, timerRunning && styles.timerBtnStop]}
            onPress={() => {
              tapLight();
              if (timerRunning) {
                handleTimerStop();
              } else {
                setTimerStart(Date.now());
                setTimerSecs(0);
              }
            }}
          >
            <Icon
              name={timerRunning ? "check" : "clock"}
              size={15}
              color={timerRunning ? colors.textOnDark : colors.brand}
            />
            <Text style={[styles.timerBtnText, timerRunning && { color: colors.textOnDark }]}>
              {timerRunning ? "Terminer la consultation" : "Démarrer"}
            </Text>
          </ScalePressable>
        </View>

        {/* ── No linked patient → offer to create the record ─────────── */}
        {!appt.patientId && (
          <ScalePressable scaleTo={0.97} style={styles.billCta} onPress={handleCreatePatientFromAppt}>
            <Icon name="add" size={16} color={colors.textOnDark} />
            <Text style={styles.billCtaText}>{t("orphan.createPatient")}</Text>
          </ScalePressable>
        )}

        {/* ── Patient medical context ────────────────────────────────── */}
        {linkedPatient && (
          linkedPatient.bloodType ||
          linkedPatient.allergies ||
          linkedPatient.antecedents ||
          linkedPatient.currentMedications
        ) ? (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Icon name="users" size={13} color={colors.textTertiary} />
              <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
                {t("agenda.patientContext")}
              </Text>
            </View>
            <View style={styles.patCtxCard}>
              {linkedPatient.bloodType ? (
                <View style={styles.patCtxRow}>
                  <Text style={styles.patCtxLabel}>{t("patients.bloodType")}</Text>
                  <View style={styles.patCtxBloodBadge}>
                    <Text style={styles.patCtxBloodBadgeText}>{linkedPatient.bloodType}</Text>
                  </View>
                </View>
              ) : null}
              {linkedPatient.allergies ? (
                <View style={[
                  styles.patCtxRow,
                  linkedPatient.bloodType ? styles.patCtxRowBorder : undefined,
                ]}>
                  <Text style={styles.patCtxLabel}>{t("patients.allergies")}</Text>
                  <Text style={[styles.patCtxValue, styles.patCtxAllergyValue]} numberOfLines={2}>
                    {linkedPatient.allergies}
                  </Text>
                </View>
              ) : null}
              {linkedPatient.antecedents ? (
                <View style={[
                  styles.patCtxRow,
                  (linkedPatient.bloodType || linkedPatient.allergies) ? styles.patCtxRowBorder : undefined,
                ]}>
                  <Text style={styles.patCtxLabel}>{t("patients.antecedents")}</Text>
                  <Text style={styles.patCtxValue} numberOfLines={2}>
                    {linkedPatient.antecedents}
                  </Text>
                </View>
              ) : null}
              {linkedPatient.currentMedications ? (
                <View style={[
                  styles.patCtxRow,
                  (linkedPatient.bloodType || linkedPatient.allergies || linkedPatient.antecedents)
                    ? styles.patCtxRowBorder : undefined,
                ]}>
                  <Text style={styles.patCtxLabel}>{t("patients.currentMedications")}</Text>
                  <Text style={styles.patCtxValue} numberOfLines={2}>
                    {linkedPatient.currentMedications}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* ── General notes (read-only if set, from modal) ───────────── */}
        {appt.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("agenda.notes")}</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{appt.notes}</Text>
            </View>
          </View>
        ) : null}

        {/* ── Clinical Notes — always editable inline ──────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Icon name="clipboard" size={13} color={colors.success} />
            <Text style={[styles.sectionTitle, { color: colors.success, flex: 1 }]}>
              {t("agenda.clinicalNotes")}
            </Text>
            <Pressable
              style={({ pressed }) => [styles.templateBtn, pressed && { opacity: 0.7 }]}
              onPress={() => { tapLight(); setTemplateSheetVisible(true); }}
            >
              <Icon name="book" size={10} color={colors.success} />
              <Text style={styles.templateBtnText}>Modèles</Text>
            </Pressable>
          </View>
          <View style={styles.clinicalCard}>
            <View style={styles.clinicalField}>
              <Text style={styles.clinicalFieldLabel}>{t("agenda.motif")}</Text>
              <TextInput
                style={styles.clinicalInput}
                value={noteMotif}
                onChangeText={setNoteMotif}
                onBlur={saveNotes}
                placeholder={t("agenda.motifPlaceholder")}
                placeholderTextColor={colors.textTertiary}
                multiline
              />
            </View>
            <View style={[styles.clinicalField, styles.clinicalFieldBorder]}>
              <Text style={styles.clinicalFieldLabel}>{t("agenda.examination")}</Text>
              <TextInput
                style={styles.clinicalInput}
                value={noteExam}
                onChangeText={setNoteExam}
                onBlur={saveNotes}
                placeholder={t("agenda.examinationPlaceholder")}
                placeholderTextColor={colors.textTertiary}
                multiline
              />
            </View>
            <View style={[styles.clinicalField, styles.clinicalFieldBorder]}>
              <View style={styles.clinicalFieldRow}>
                <Text style={styles.clinicalFieldLabel}>{t("agenda.diagnosis")}</Text>
                <Pressable
                  style={({ pressed }) => [styles.cimBtn, pressed && { opacity: 0.75 }]}
                  onPress={() => { tapLight(); setIcd10Visible(true); }}
                >
                  <Text style={styles.cimBtnText}>CIM-10</Text>
                </Pressable>
              </View>
              <TextInput
                style={styles.clinicalInput}
                value={noteDiag}
                onChangeText={setNoteDiag}
                onBlur={saveNotes}
                placeholder={t("agenda.diagnosisPlaceholder")}
                placeholderTextColor={colors.textTertiary}
                multiline
              />
            </View>
            <View style={[styles.clinicalField, styles.clinicalFieldBorder]}>
              <Text style={styles.clinicalFieldLabel}>{t("agenda.treatment")}</Text>
              <TextInput
                style={styles.clinicalInput}
                value={noteTreatment}
                onChangeText={setNoteTreatment}
                onBlur={saveNotes}
                placeholder={t("agenda.treatmentPlaceholder")}
                placeholderTextColor={colors.textTertiary}
                multiline
              />
            </View>
          </View>
        </View>

        {/* ── Vital Signs ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Icon name="heartPulse" size={13} color={colors.brand} />
            <Text style={styles.sectionTitle}>{t("agenda.vitalSigns")}</Text>
          </View>
          <View style={styles.vitalsCard}>
            {/* Row 1: Blood pressure + HR */}
            <View style={styles.vitalsRow}>
              {/* BP */}
              <View style={[styles.vitalsField, styles.vitalsBpField]}>
                <Text style={styles.vitalsFieldLabel}>{t("agenda.vsBp")}</Text>
                <View style={styles.vitalsBpInputRow}>
                  <View style={styles.vitalsBpHalf}>
                    <Text style={styles.vitalsBpSub}>{t("agenda.vsBpSys")}</Text>
                    <TextInput
                      style={[styles.vitalsInput, { color: vsColor("bpSys", parseFloat(vsBpSys) || null) }]}
                      value={vsBpSys}
                      onChangeText={setVsBpSys}
                      onBlur={saveVitals}
                      placeholder="120"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="decimal-pad"
                      maxLength={3}
                    />
                  </View>
                  <Text style={styles.vitalsBpSlash}>/</Text>
                  <View style={styles.vitalsBpHalf}>
                    <Text style={styles.vitalsBpSub}>{t("agenda.vsBpDia")}</Text>
                    <TextInput
                      style={[styles.vitalsInput, { color: vsColor("bpDia", parseFloat(vsBpDia) || null) }]}
                      value={vsBpDia}
                      onChangeText={setVsBpDia}
                      onBlur={saveVitals}
                      placeholder="80"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="decimal-pad"
                      maxLength={3}
                    />
                  </View>
                  <Text style={styles.vitalsUnit}>mmHg</Text>
                </View>
              </View>
              {/* HR */}
              <View style={styles.vitalsField}>
                <Text style={styles.vitalsFieldLabel}>{t("agenda.vsHr")}</Text>
                <View style={styles.vitalsInputRow}>
                  <TextInput
                    style={[styles.vitalsInput, { color: vsColor("hr", parseFloat(vsHr) || null) }]}
                    value={vsHr}
                    onChangeText={setVsHr}
                    onBlur={saveVitals}
                    placeholder="72"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                    maxLength={3}
                  />
                  <Text style={styles.vitalsUnit}>{t("agenda.vsHrUnit")}</Text>
                </View>
              </View>
            </View>

            <View style={styles.vitalsDivider} />

            {/* Row 2: Temp + SpO2 */}
            <View style={styles.vitalsRow}>
              <View style={styles.vitalsField}>
                <Text style={styles.vitalsFieldLabel}>{t("agenda.vsTemp")}</Text>
                <View style={styles.vitalsInputRow}>
                  <TextInput
                    style={[styles.vitalsInput, { color: vsColor("temp", parseFloat(vsTemp.replace(",", ".")) || null) }]}
                    value={vsTemp}
                    onChangeText={setVsTemp}
                    onBlur={saveVitals}
                    placeholder="37.0"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                    maxLength={4}
                  />
                  <Text style={styles.vitalsUnit}>{t("agenda.vsTempUnit")}</Text>
                </View>
              </View>
              <View style={styles.vitalsField}>
                <Text style={styles.vitalsFieldLabel}>{t("agenda.vsSpo2")}</Text>
                <View style={styles.vitalsInputRow}>
                  <TextInput
                    style={[styles.vitalsInput, { color: vsColor("spo2", parseFloat(vsSpo2) || null) }]}
                    value={vsSpo2}
                    onChangeText={setVsSpo2}
                    onBlur={saveVitals}
                    placeholder="98"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                    maxLength={3}
                  />
                  <Text style={styles.vitalsUnit}>{t("agenda.vsSpo2Unit")}</Text>
                </View>
              </View>
            </View>

            <View style={styles.vitalsDivider} />

            {/* Row 3: Weight + Height + BMI */}
            <View style={styles.vitalsRow}>
              <View style={styles.vitalsField}>
                <Text style={styles.vitalsFieldLabel}>{t("agenda.vsWeight")}</Text>
                <View style={styles.vitalsInputRow}>
                  <TextInput
                    style={[styles.vitalsInput, { color: colors.textPrimary }]}
                    value={vsWeight}
                    onChangeText={setVsWeight}
                    onBlur={saveVitals}
                    placeholder="70"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                    maxLength={5}
                  />
                  <Text style={styles.vitalsUnit}>{t("agenda.vsWeightUnit")}</Text>
                </View>
              </View>
              <View style={styles.vitalsField}>
                <Text style={styles.vitalsFieldLabel}>{t("agenda.vsHeight")}</Text>
                <View style={styles.vitalsInputRow}>
                  <TextInput
                    style={[styles.vitalsInput, { color: colors.textPrimary }]}
                    value={vsHeight}
                    onChangeText={setVsHeight}
                    onBlur={saveVitals}
                    placeholder="170"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                    maxLength={3}
                  />
                  <Text style={styles.vitalsUnit}>{t("agenda.vsHeightUnit")}</Text>
                </View>
              </View>
              {bmiValue !== null && (() => {
                const bc = bmiClassify(bmiValue);
                return (
                  <View style={[styles.vitalsField, styles.vitalsBmiField]}>
                    <Text style={styles.vitalsFieldLabel}>{t("agenda.vsBmi")}</Text>
                    <Text style={[styles.vitalsBmiValue, { color: bc.color }]}>{bmiValue.toFixed(1)}</Text>
                    <View style={[styles.bmiStageChip, { backgroundColor: bc.color + "22" }]}>
                      <Text style={[styles.bmiStageText, { color: bc.color }]}>{bc.stage}</Text>
                    </View>
                  </View>
                );
              })()}
            </View>
          </View>
        </View>

        </ScrollView>
      )}

      {/* ══════════════════ TAB: DOCUMENTS ══════════════════ */}
      {tab === "documents" && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.xl) + spacing.xxl }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* ── Examens & Documents ── */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Icon name="camera" size={13} color={colors.brand} />
              <Text style={styles.sectionTitle}>Examens & Documents</Text>
              <View style={{ flex: 1 }} />
              <Pressable onPress={handleAddPhoto} hitSlop={8}>
                <Icon name="add" size={18} color={colors.brand} />
              </Pressable>
            </View>
            {photos.length === 0 ? (
              <Pressable style={styles.photosEmpty} onPress={handleAddPhoto}>
                <Icon name="camera" size={22} color={colors.textTertiary} />
                <Text style={styles.photosEmptyText}>Ajouter un résultat ou document</Text>
              </Pressable>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photosRow}
              >
                {photos.map((uri) => {
                  const label = (apptPhotoLabels[appt.id] ?? {})[uri];
                  return (
                    <View key={uri} style={styles.photoThumbWrap}>
                      <Pressable onPress={() => setViewingPhoto(uri)}>
                        <Image source={{ uri }} style={styles.photoThumbImg} />
                      </Pressable>
                      {label ? (
                        <View style={styles.photoLabelBadge}>
                          <Text style={styles.photoLabelText} numberOfLines={1}>{label}</Text>
                        </View>
                      ) : null}
                      <Pressable
                        style={styles.photoDeleteBtn}
                        onPress={() => handleDeletePhoto(uri)}
                        hitSlop={4}
                      >
                        <Icon name="close" size={9} color="#fff" />
                      </Pressable>
                    </View>
                  );
                })}
                <Pressable style={styles.photoAddThumb} onPress={handleAddPhoto}>
                  <Icon name="add" size={22} color={colors.brand} />
                </Pressable>
              </ScrollView>
            )}
          </View>

          {/* ── Document buttons ── */}
          <View style={styles.docBtnRow}>
            <ScalePressable scaleTo={0.95} style={styles.docBtn} onPress={() => { tapLight(); setOrdonnanceVisible(true); }}>
              <Icon name="pill" size={17} color={colors.textOnDark} />
              <Text style={styles.docBtnText}>{t("patients.newOrdonnance")}</Text>
            </ScalePressable>
            <ScalePressable scaleTo={0.95} style={[styles.docBtn, styles.docBtnAlt]} onPress={() => { tapLight(); setCertificatVisible(true); }}>
              <Icon name="award" size={17} color={colors.brand} />
              <Text style={[styles.docBtnText, { color: colors.brand }]}>{t("agenda.newCertificat")}</Text>
            </ScalePressable>
          </View>

          {/* ── Documents issued at this appointment ── */}
          {(() => {
            const apptOrdo = ordonnances.filter((o) => o.appointmentId === appt.id);
            const apptCert = certificats.filter((c) => c.appointmentId === appt.id);
            if (apptOrdo.length === 0 && apptCert.length === 0) return null;
            return (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Émis lors de cette consultation</Text>
                <View style={styles.issuedDocsCard}>
                  {apptOrdo.map((o, idx) => (
                    <View
                      key={o.id}
                      style={[styles.issuedDocRow, idx > 0 && styles.issuedDocRowBorder]}
                    >
                      <Icon name="pill" size={14} color={colors.brand} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.issuedDocLabel}>
                          Ordonnance · {o.date.split("-").reverse().join("/")}
                        </Text>
                        {o.lines.length > 0 && (
                          <Text style={styles.issuedDocMeta} numberOfLines={1}>
                            {o.lines.map((l) => l.medication).filter(Boolean).join(", ")}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                  {apptCert.map((c, idx) => (
                    <View
                      key={c.id}
                      style={[
                        styles.issuedDocRow,
                        (idx > 0 || apptOrdo.length > 0) && styles.issuedDocRowBorder,
                      ]}
                    >
                      <Icon name="award" size={14} color={colors.success} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.issuedDocLabel}>
                          {c.type === "arret_travail"
                            ? `Arrêt de travail · ${c.durationDays ?? "?"} j`
                            : c.type === "aptitude"
                            ? "Certificat d'aptitude"
                            : c.type === "presence"
                            ? "Certificat de présence"
                            : "Certificat médical"}
                          {" · "}{c.date.split("-").reverse().join("/")}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            );
          })()}
        </ScrollView>
      )}

      {/* ══════════════════ TAB: SUIVI ══════════════════ */}
      {tab === "suivi" && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.xl) + spacing.xxl }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* ── Change status ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("agenda.changeStatus")}</Text>
            <View style={styles.statusRow}>
              {(["scheduled", "arrived", "in_consultation", "completed", "cancelled", "no_show"] as AppointmentStatus[]).map((s) => (
                <ScalePressable
                  key={s}
                  scaleTo={0.93}
                  style={[
                    styles.statusBtn,
                    appt.status === s && { backgroundColor: STATUS_COLORS[s], borderColor: STATUS_COLORS[s] },
                  ]}
                  onPress={() => { tapLight(); handleStatusChange(s); }}
                >
                  <Text style={[styles.statusBtnText, appt.status === s && { color: colors.textOnDark }]}>
                    {t(`agenda.statuses.${s}`)}
                  </Text>
                </ScalePressable>
              ))}
            </View>
          </View>

          {/* ── Follow-up scheduler ── */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Icon name="clock" size={13} color={colors.brand} />
              <Text style={styles.sectionTitle}>{t("agenda.followUp")}</Text>
            </View>
            {appt.followUpDate ? (
              <View style={styles.followUpBox}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.followUpSet}>
                    {t("agenda.followUpScheduled")} {appt.followUpDate.split("-").reverse().join("/")}
                  </Text>
                  {/* Check whether a follow-up appointment already exists for this patient on that date */}
                  {(() => {
                    const existing = appointments.find(
                      (a) =>
                        a.id !== appt.id &&
                        a.date === appt.followUpDate &&
                        (appt.patientId ? a.patientId === appt.patientId : a.patientName === appt.patientName) &&
                        a.status !== "cancelled"
                    );
                    if (existing) {
                      return (
                        <Text style={styles.followUpCreatedNote}>
                          {t("agenda.followUpApptExists")}
                        </Text>
                      );
                    }
                    return (
                      <ScalePressable
                        scaleTo={0.95}
                        style={styles.followUpCreateBtn}
                        onPress={() => {
                          tapSuccess();
                          addAppointment({
                            id: uuid(),
                            patientId: appt.patientId,
                            patientName: appt.patientName,
                            date: appt.followUpDate!,
                            startTime: appt.startTime,
                            endTime: appt.endTime,
                            type: "suivi",
                            status: "scheduled",
                            locationId: appt.locationId,
                          });
                          Alert.alert(
                            t("agenda.followUpApptCreated"),
                            `${appt.patientName} · ${appt.followUpDate!.split("-").reverse().join("/")}`,
                          );
                        }}
                      >
                        <Icon name="add" size={12} color={colors.textOnDark} />
                        <Text style={styles.followUpCreateBtnText}>{t("agenda.createFollowUpAppt")}</Text>
                      </ScalePressable>
                    );
                  })()}
                </View>
                <Pressable
                  style={styles.followUpClear}
                  onPress={() => updateAppointment({ ...appt, followUpDate: undefined })}
                  hitSlop={8}
                >
                  <Text style={styles.followUpClearText}>{t("agenda.clearFollowUp")}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.followUpChips}>
                {[
                  { label: t("agenda.followUpIn1Week"),   days: 7 },
                  { label: t("agenda.followUpIn1Month"),  days: 30 },
                  { label: t("agenda.followUpIn3Months"), days: 90 },
                  { label: t("agenda.followUpIn6Months"), days: 180 },
                ].map(({ label, days }) => {
                  const d = new Date(appt.date);
                  d.setDate(d.getDate() + days);
                  const iso = d.toISOString().slice(0, 10);
                  return (
                    <ScalePressable
                      key={days}
                      scaleTo={0.92}
                      style={styles.followUpChip}
                      onPress={() => { tapLight(); updateAppointment({ ...appt, followUpDate: iso }); }}
                    >
                      <Text style={styles.followUpChipText}>{label}</Text>
                    </ScalePressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* ── Communication ── */}
          {linkedPatient?.phone && (
            <View style={styles.commStrip}>
              <Pressable style={styles.commBtn} onPress={handleCallPatient}>
                <Icon name="phone" size={15} color={colors.brand} />
                <Text style={[styles.commBtnText, { color: colors.brand }]}>Appeler</Text>
              </Pressable>
              <View style={styles.commDivider} />
              <Pressable style={styles.commBtn} onPress={handleWhatsAppReminder}>
                <Icon name="messageCircle" size={15} color="#25D366" />
                <Text style={[styles.commBtnText, { color: "#25D366" }]}>Rappel</Text>
              </Pressable>
              <View style={styles.commDivider} />
              <Pressable style={styles.commBtn} onPress={handleWhatsAppSummary}>
                <Icon name="messageCircle" size={15} color="#25D366" />
                <Text style={[styles.commBtnText, { color: "#25D366" }]}>Résumé</Text>
              </Pressable>
            </View>
          )}

          {/* ── Invoice history for this appointment ── */}
          {(() => {
            const apptInvoices = invoices.filter(inv => inv.appointmentId === appt.id);
            if (apptInvoices.length === 0) return null;
            return (
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Icon name="fileCheck" size={13} color={colors.gold} />
                  <Text style={[styles.sectionTitle, { color: colors.gold }]}>
                    {t("agenda.invoiceHistory")}
                  </Text>
                </View>
                <View style={styles.issuedDocsCard}>
                  {apptInvoices.map((inv, idx) => (
                    <View
                      key={inv.id}
                      style={[styles.issuedDocRow, idx > 0 && styles.issuedDocRowBorder]}
                    >
                      <Icon name="fileCheck" size={14} color={colors.gold} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.issuedDocLabel}>
                          {inv.invoiceNumber} · {inv.actLabel}
                        </Text>
                        <Text style={styles.issuedDocMeta}>
                          {new Date(inv.issuedAt).toLocaleDateString("fr-FR")} · {Math.round(inv.amount).toLocaleString("fr-FR")} MAD
                          {inv.taux ? ` · AMO ${inv.taux}%` : ""}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            );
          })()}

          {/* ── Billing / payment status ── */}
          {(() => {
            const s = paymentSummary(appt);
            if (!appt.billedAt) {
              return (
                <ScalePressable scaleTo={0.97} style={styles.billCta} onPress={() => { tapLight(); openBillSheet(); }}>
                  <Icon name="dollarSign" size={16} color={colors.textOnDark} />
                  <Text style={styles.billCtaText}>{t("billing.billNow")}</Text>
                </ScalePressable>
              );
            }
            const statusColor = s.status === "paid" ? colors.success : s.status === "partial" ? colors.gold : colors.danger;
            return (
              <View style={styles.billStatusCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.billStatusAmount}>{s.due.toLocaleString("fr-FR")} MAD</Text>
                  <Text style={[styles.billStatusLabel, { color: statusColor }]}>
                    {s.status === "paid" ? t("billing.paid") : s.status === "partial" ? `${t("billing.partial")} · ${s.balance.toLocaleString("fr-FR")} MAD` : `${t("billing.deferred")} · ${s.balance.toLocaleString("fr-FR")} MAD`}
                  </Text>
                </View>
                {s.balance > 0 && (
                  <ScalePressable scaleTo={0.96} style={styles.billCollectBtn} onPress={() => { tapLight(); openTopupSheet(); }}>
                    <Text style={styles.billCollectText}>{t("billing.collect")}</Text>
                  </ScalePressable>
                )}
              </View>
            );
          })()}

          {/* ── Note d'honoraires ── */}
          <ScalePressable
            scaleTo={0.97}
            style={styles.invoiceBtn}
            onPress={() => {
              tapLight();
              setInvoiceAmount("200");
              setShowInvoice(true);
            }}
          >
            <Icon name="fileCheck" size={16} color={colors.gold} />
            <Text style={styles.invoiceBtnText}>{t("agenda.generateInvoice")}</Text>
            <View style={{ transform: [{ scaleX: -1 }] }}>
              <Icon name="back" size={14} color={colors.gold} />
            </View>
          </ScalePressable>

          {/* ── Remboursement AMO / CNOPS ── */}
          {(!!linkedPatient?.cnopsNumber || !!appt.reimbursementStatus) && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Icon name="fileCheck" size={13} color="#6b46c1" />
                <Text style={[styles.sectionTitle, { color: "#6b46c1" }]}>
                  Remboursement AMO / CNOPS
                </Text>
              </View>
              <View style={styles.rmbCard}>
                {/* Status chips */}
                <View style={styles.rmbChipRow}>
                  {(
                    [
                      { key: "pending"  as const, label: "En attente", color: "#D97706" },
                      { key: "received" as const, label: "Reçu",       color: colors.success },
                      { key: "rejected" as const, label: "Refusé",     color: colors.danger },
                    ]
                  ).map(({ key, label, color }) => {
                    const active = appt.reimbursementStatus === key;
                    return (
                      <Pressable
                        key={key}
                        style={[
                          styles.rmbChip,
                          active && { backgroundColor: color + "22", borderColor: color },
                        ]}
                        onPress={() => {
                          tapLight();
                          const amt = parseFloat(rmbAmount.replace(",", "."));
                          updateAppointment({
                            ...appt,
                            reimbursementStatus: key,
                            reimbursementAmount: !isNaN(amt) && amt > 0 ? amt : undefined,
                          });
                        }}
                      >
                        <View style={[styles.rmbChipDot, { backgroundColor: active ? color : "#c7b8ed" }]} />
                        <Text style={[styles.rmbChipText, active && { color, fontWeight: "700" }]}>
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Amount input — only for pending / received */}
                {(appt.reimbursementStatus === "pending" || appt.reimbursementStatus === "received") && (
                  <View style={styles.rmbAmountRow}>
                    <Text style={styles.rmbAmountLabel}>Montant remboursé (MAD)</Text>
                    <TextInput
                      style={styles.rmbAmountInput}
                      value={rmbAmount}
                      onChangeText={setRmbAmount}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#c7b8ed"
                      onBlur={() => {
                        const amt = parseFloat(rmbAmount.replace(",", "."));
                        updateAppointment({
                          ...appt,
                          reimbursementAmount: !isNaN(amt) && amt > 0 ? amt : undefined,
                        });
                      }}
                    />
                  </View>
                )}

                {/* Mutuelle paperwork (feuille de soins) */}
                <View style={styles.mutuelleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rmbAmountLabel}>Papiers mutuelle remplis</Text>
                    {appt.mutuellePapersFilled && appt.mutuellePapersDate && (
                      <Text style={styles.mutuelleDate}>Rempli le {formatDateLong(appt.mutuellePapersDate)}</Text>
                    )}
                  </View>
                  <Switch
                    value={!!appt.mutuellePapersFilled}
                    onValueChange={(v) => { tapLight(); updateAppointment({ ...appt, mutuellePapersFilled: v, mutuellePapersDate: v ? todayIso() : undefined }); }}
                    trackColor={{ true: "#6b46c1" }}
                  />
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Payment Bottom Sheet ──────────────────────────────────────── */}
      <Modal
        visible={showPayment}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPayment(false)}
      >
        <Pressable style={styles.payOverlay} onPress={() => setShowPayment(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "position" : undefined}
            keyboardVerticalOffset={0}
          >
            <Pressable
              style={[styles.paySheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.payHandle} />

              {/* Icon + Title */}
              <View style={styles.payHeader}>
                <View style={styles.payIconWrap}>
                  <Text style={styles.payIconText}>💳</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payTitle}>{t("agenda.paymentSheet")}</Text>
                  <Text style={styles.paySub}>{appt.patientName}</Text>
                </View>
                <Pressable onPress={() => setShowPayment(false)} hitSlop={12}>
                  <Icon name="close" size={20} color={colors.textTertiary} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
                {payMode === "bill" ? (
                  <>
                    {/* Act chips (from the doctor's act list) */}
                    {(doctorProfile.acteCodes?.length ?? 0) > 0 && (
                      <View style={styles.actPickerRow}>
                        {doctorProfile.acteCodes!.map((a) => (
                          <Pressable key={a.id} style={styles.actChip} onPress={() => addBillAct(a.label, a.price ?? 0)}>
                            <Text style={styles.actChipText}>+ {a.code}{a.price != null ? ` · ${a.price}` : ""}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                    {/* Itemized lines */}
                    {billItems.map((l, i) => (
                      <View key={i} style={styles.billLine}>
                        <Text style={styles.billLineLabel} numberOfLines={1}>{l.label}</Text>
                        <TextInput
                          style={styles.billLinePrice}
                          value={String(l.unitPrice)}
                          onChangeText={(v) => setBillItems((prev) => prev.map((x, idx) => idx === i ? { ...x, unitPrice: parseFloat(v.replace(",", ".")) || 0 } : x))}
                          keyboardType="decimal-pad"
                        />
                        <Pressable hitSlop={8} disabled={billItems.length <= 1} onPress={() => removeBillItem(i)}>
                          <Icon name="close" size={16} color={billItems.length <= 1 ? colors.border : colors.textTertiary} />
                        </Pressable>
                      </View>
                    ))}
                    {/* Reduction */}
                    <View style={styles.billLine}>
                      <Text style={styles.billLineLabel}>{t("billing.reduction")}</Text>
                      <TextInput
                        style={styles.billLinePrice}
                        value={billReduction}
                        onChangeText={setBillReduction}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={colors.textTertiary}
                      />
                      <View style={{ width: 16 }} />
                    </View>
                    {/* Totals */}
                    <View style={styles.billTotalRow}>
                      <Text style={styles.billTotalLabel}>{t("billing.total")}</Text>
                      <Text style={styles.billTotalValue}>{billTotal.toLocaleString("fr-FR")} MAD</Text>
                    </View>
                    {/* Collected */}
                    <Text style={styles.billFieldLabel}>{t("billing.collected")}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                      <TextInput
                        style={[styles.acteInput, { flex: 1 }]}
                        value={billCollected}
                        onChangeText={setBillCollected}
                        keyboardType="decimal-pad"
                      />
                      <Pressable style={styles.billQuick} onPress={() => setBillCollected(String(billTotal))}>
                        <Text style={styles.billQuickText}>{t("billing.full")}</Text>
                      </Pressable>
                      <Pressable style={styles.billQuick} onPress={() => setBillCollected("0")}>
                        <Text style={styles.billQuickText}>{t("billing.defer")}</Text>
                      </Pressable>
                    </View>
                    {billRemaining > 0 && (
                      <Text style={styles.billRemaining}>{t("billing.remaining")}: {billRemaining.toLocaleString("fr-FR")} MAD</Text>
                    )}
                  </>
                ) : (
                  <>
                    <View style={styles.billTotalRow}><Text style={styles.billTotalLabel}>{t("billing.total")}</Text><Text style={styles.billTotalValue}>{paymentSummary(appt).due.toLocaleString("fr-FR")} MAD</Text></View>
                    <View style={styles.billLine}><Text style={styles.billLineLabel}>{t("billing.alreadyPaid")}</Text><Text style={styles.actePriceTxt}>{paymentSummary(appt).paid.toLocaleString("fr-FR")} MAD</Text></View>
                    <View style={styles.billLine}><Text style={[styles.billLineLabel, { color: colors.danger }]}>{t("billing.remaining")}</Text><Text style={[styles.actePriceTxt, { color: colors.danger }]}>{paymentSummary(appt).balance.toLocaleString("fr-FR")} MAD</Text></View>
                    <Text style={styles.billFieldLabel}>{t("billing.amount")}</Text>
                    <TextInput style={styles.acteInput} value={billCollected} onChangeText={setBillCollected} keyboardType="decimal-pad" autoFocus />
                  </>
                )}
                {/* Payment method */}
                <Text style={styles.billFieldLabel}>{t("billing.method")}</Text>
                <View style={styles.actPickerRow}>
                  {(["cash", "card", "cheque", "transfer"] as PaymentMethod[]).map((m) => (
                    <Pressable key={m} style={[styles.actChip, payMethod === m && styles.actChipActive]} onPress={() => setPayMethod(m)}>
                      <Text style={[styles.actChipText, payMethod === m && styles.actChipTextActive]}>{t(`billing.method_${m}`)}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              {/* Actions */}
              <ScalePressable scaleTo={0.96} style={styles.payConfirmBtn} onPress={handlePaymentConfirm}>
                <Icon name="check" size={18} color={colors.textOnDark} />
                <Text style={styles.payConfirmText}>{payMode === "topup" ? t("billing.recordPayment") : t("agenda.recordPayment")}</Text>
              </ScalePressable>
              <ScalePressable scaleTo={0.96} style={styles.paySkipBtn} onPress={() => setShowPayment(false)}>
                <Text style={styles.paySkipText}>{t("agenda.skipPayment")}</Text>
              </ScalePressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* ── Invoice bottom sheet ─────────────────────────────────────── */}
      <Modal
        visible={showInvoice}
        animationType="slide"
        transparent
        onRequestClose={() => setShowInvoice(false)}
      >
        <Pressable style={styles.payOverlay} onPress={() => setShowInvoice(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "position" : undefined}
            keyboardVerticalOffset={0}
          >
            <Pressable
              style={[styles.paySheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.payHandle} />

              {/* Header */}
              <View style={styles.payHeader}>
                <View style={[styles.payIconWrap, { backgroundColor: colors.gold + "22" }]}>
                  <Icon name="fileCheck" size={20} color={colors.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payTitle}>{t("agenda.generateInvoice")}</Text>
                  <Text style={styles.paySub}>{appt.patientName}</Text>
                </View>
                <Pressable onPress={() => setShowInvoice(false)} hitSlop={12}>
                  <Icon name="close" size={20} color={colors.textTertiary} />
                </Pressable>
              </View>

              {/* Act type picker */}
              <Text style={styles.payAmountLabel}>{t("agenda.invoiceActType")}</Text>
              <View style={styles.actPickerRow}>
                {ACT_LABELS.map((label, idx) => (
                  <Pressable
                    key={idx}
                    style={[styles.actChip, invoiceActIdx === idx && styles.actChipActive]}
                    onPress={() => setInvoiceActIdx(idx)}
                  >
                    <Text style={[styles.actChipText, invoiceActIdx === idx && styles.actChipTextActive]}>
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Amount */}
              <Text style={styles.payAmountLabel}>{t("agenda.invoiceAmount")}</Text>
              <TextInput
                style={styles.payInput}
                value={invoiceAmount}
                onChangeText={setInvoiceAmount}
                keyboardType="decimal-pad"
                placeholder="200"
                placeholderTextColor={colors.textTertiary}
                autoFocus
                selectTextOnFocus
              />

              {/* CNOPS/AMO section — only when patient has insurance number */}
              {!!linkedPatient?.cnopsNumber && (
                <View style={styles.cnopsBox}>
                  <View style={styles.cnopsHeader}>
                    <Icon name="fileCheck" size={13} color={"#6b46c1"} />
                    <Text style={styles.cnopsLabel}>{t("agenda.invoiceCnops")}</Text>
                    <Text style={styles.cnopsNum}>{linkedPatient.cnopsNumber}</Text>
                  </View>
                  <View style={styles.tauxRow}>
                    <Text style={styles.tauxLabel}>{t("agenda.invoiceTaux")}</Text>
                    {([70, 80] as const).map((taux) => (
                      <Pressable
                        key={taux}
                        style={[styles.tauxBtn, invoiceTaux === taux && styles.tauxBtnActive]}
                        onPress={() => setInvoiceTaux(taux)}
                      >
                        <Text style={[styles.tauxBtnText, invoiceTaux === taux && styles.tauxBtnTextActive]}>
                          {taux}%
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {/* Preview */}
                  {(() => {
                    const amt = parseFloat(invoiceAmount.replace(",", "."));
                    if (isNaN(amt) || amt <= 0) return null;
                    const remb = (amt * invoiceTaux) / 100;
                    const share = amt - remb;
                    return (
                      <View style={styles.rembPreview}>
                        <View style={styles.rembItem}>
                          <Text style={styles.rembItemLbl}>{t("agenda.invoiceRemb")}</Text>
                          <Text style={[styles.rembItemAmt, { color: "#6b46c1" }]}>
                            {remb.toLocaleString("fr-MA", { minimumFractionDigits: 2 })} MAD
                          </Text>
                        </View>
                        <View style={styles.rembDivider} />
                        <View style={styles.rembItem}>
                          <Text style={styles.rembItemLbl}>{t("agenda.invoiceShare")}</Text>
                          <Text style={[styles.rembItemAmt, { color: colors.textPrimary }]}>
                            {share.toLocaleString("fr-MA", { minimumFractionDigits: 2 })} MAD
                          </Text>
                        </View>
                      </View>
                    );
                  })()}
                </View>
              )}

              <Pressable
                style={[
                  styles.payConfirmBtn,
                  { backgroundColor: colors.gold },
                  invoiceGenerating && { opacity: 0.65 },
                ]}
                onPress={handleGenerateInvoice}
                disabled={invoiceGenerating}
              >
                <Icon name="fileCheck" size={18} color={colors.textOnDark} />
                <Text style={styles.payConfirmText}>
                  {invoiceGenerating ? t("agenda.invoiceGenerating") : t("agenda.invoiceGenerate")}
                </Text>
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* ── CIM-10 picker ────────────────────────────────────────────── */}
      <Icd10Picker
        visible={icd10Visible}
        onClose={() => setIcd10Visible(false)}
        onSelect={(entry: Icd10Entry) => {
          const tag = `[${entry.code}] ${entry.desc}`;
          setNoteDiag((prev) => (prev.trim() ? prev.trimEnd() + "\n" + tag : tag));
          setIcd10Visible(false);
          // Auto-save after appending
          setTimeout(saveNotes, 50);
        }}
      />

      {/* ── Consultation note templates ───────────────────────────────── */}
      <NoteTemplateSheet
        visible={templateSheetVisible}
        currentNote={{
          motif:       noteMotif,
          examination: noteExam,
          diagnosis:   noteDiag,
          treatment:   noteTreatment,
        }}
        userId={userId}
        onApply={applyTemplate}
        onClose={() => setTemplateSheetVisible(false)}
      />

      {/* ── Edit modal ───────────────────────────────────────────────── */}
      <AppointmentModal
        visible={editModalVisible}
        initial={appt}
        selectedDate={appt.date}
        patients={patients}
        onSave={handleSave}
        onClose={() => setEditModalVisible(false)}
        t={t}
      />

      {/* ── Ordonnance modal ─────────────────────────────────────────── */}
      <OrdonnanceModal
        visible={ordonnanceVisible}
        patientName={appt.patientName}
        patientId={appt.patientId}
        appointmentId={appt.id}
        doctorProfile={doctorProfile}
        allergies={linkedPatient?.allergies}
        lastLines={lastOrdonnanceLines}
        onSave={addOrdonnance}
        onClose={() => setOrdonnanceVisible(false)}
        t={t}
      />

      {/* ── Certificat modal ─────────────────────────────────────────── */}
      <CertificatModal
        visible={certificatVisible}
        patientName={appt.patientName}
        patientGender={linkedPatient?.gender}
        appointmentId={appt.id}
        doctorProfile={doctorProfile}
        onSave={addCertificat}
        onClose={() => setCertificatVisible(false)}
        t={t}
      />

      {/* ── Patient History Modal ────────────────────────────────────── */}
      {linkedPatient && (
        <PatientHistoryModal
          visible={historyVisible}
          patient={linkedPatient}
          appointments={appointments}
          ordonnances={ordonnances}
          certificats={certificats}
          onClose={() => setHistoryVisible(false)}
          t={t}
        />
      )}

      {/* ── Full-screen photo viewer ──────────────────────────────────── */}
      <Modal
        visible={viewingPhoto !== null}
        animationType="fade"
        onRequestClose={() => setViewingPhoto(null)}
      >
        <Pressable style={styles.photoViewer} onPress={() => setViewingPhoto(null)}>
          {viewingPhoto && (
            <Image
              source={{ uri: viewingPhoto }}
              style={styles.photoViewerImg}
              resizeMode="contain"
            />
          )}
          <Pressable
            style={[styles.photoViewerClose, { top: Math.max(insets.top + 8, 20) }]}
            onPress={() => setViewingPhoto(null)}
            hitSlop={12}
          >
            <Icon name="close" size={20} color="#fff" />
          </Pressable>
          {viewingPhoto && (apptPhotoLabels[appt.id] ?? {})[viewingPhoto] ? (
            <View style={[styles.photoViewerLabel, { bottom: Math.max(insets.bottom + 16, 32) }]}>
              <Text style={styles.photoViewerLabelText}>
                {(apptPhotoLabels[appt.id] ?? {})[viewingPhoto]}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </Modal>

      {/* ── Label-selection sheet (slides up after adding a photo) ──── */}
      <Modal
        visible={labelingUri !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setLabelingUri(null)}
      >
        <Pressable style={styles.payOverlay} onPress={() => setLabelingUri(null)}>
          <Pressable
            style={[styles.labelSheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.payHandle} />
            <Text style={styles.labelSheetTitle}>Type de document</Text>
            <Text style={styles.labelSheetSub}>Étiqueter ce fichier pour le retrouver facilement</Text>
            <View style={styles.labelChipsGrid}>
              {[
                "NFS", "Biochimie", "Radiologie", "ECG",
                "Échographie", "Scanner", "IRM", "Bactério",
                "Histologie", "Autre",
              ].map((lbl) => (
                <Pressable
                  key={lbl}
                  style={({ pressed }) => [styles.labelChip, pressed && { opacity: 0.75 }]}
                  onPress={() => {
                    if (labelingUri) {
                      setApptPhotoLabel(appt.id, labelingUri, lbl);
                    }
                    setLabelingUri(null);
                  }}
                >
                  <Text style={styles.labelChipText}>{lbl}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={styles.labelSkipBtn}
              onPress={() => setLabelingUri(null)}
            >
              <Text style={styles.labelSkipText}>Ignorer</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border, ...shadows.card,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radii.md,
    alignItems: "center", justifyContent: "center", backgroundColor: colors.brandSoft,
  },
  headerTitle: {
    flex: 1, fontSize: 17, fontWeight: "800", color: colors.textPrimary,
    textAlign: "center", marginHorizontal: spacing.sm, letterSpacing: -0.3,
  },
  headerActions: { flexDirection: "row", gap: spacing.sm },
  iconBtn: {
    width: 36, height: 36, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center", backgroundColor: colors.bg,
  },
  iconBtnDanger: { borderColor: colors.dangerSoft, backgroundColor: colors.dangerSoft },

  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },

  badgeRow: { flexDirection: "row", gap: spacing.sm },
  badge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radii.pill, borderWidth: 1 },
  badgeText: { fontSize: 13, fontWeight: "700" },

  // ── Context bar (below header) ─────────────────────────────────────────
  contextBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.sm + 2,
    gap: spacing.xs,
  },
  contextTime: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    flexShrink: 1,
  },

  // ── Tab strip ─────────────────────────────────────────────────────────
  tabStrip: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnActive: {
    borderBottomColor: colors.brand,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textTertiary,
  },
  tabBtnTextActive: {
    color: colors.brand,
    fontWeight: "700",
  },

  // Communication strip
  commStrip: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadows.card,
  },
  commBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 13,
  },
  commBtnText: { fontSize: 13, fontWeight: "700" },
  commDivider: { width: 1, backgroundColor: colors.border, marginVertical: 10 },

  card: {
    backgroundColor: colors.surface, borderRadius: radii.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadows.card,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cardLabel: { ...typography.caption, color: colors.textTertiary, flex: 1 },
  cardValue: { ...typography.body, color: colors.textPrimary, fontWeight: "600" },

  section: { gap: spacing.sm },
  sectionTitle: {
    fontSize: 11, fontWeight: "700", color: colors.brand,
    textTransform: "uppercase", letterSpacing: 0.4,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },

  notesCard: {
    backgroundColor: colors.surface, borderRadius: radii.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  notesText: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },

  // ── Vital signs card ──────────────────────────────────────────────────
  vitalsCard: {
    backgroundColor: colors.brandSoft + "33",
    borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.brand + "22",
    overflow: "hidden",
  },
  vitalsRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  vitalsDivider: { height: 1, backgroundColor: colors.brand + "15", marginHorizontal: spacing.md },
  vitalsField: { flex: 1, gap: 4 },
  vitalsBpField: { flex: 2 },
  vitalsBmiField: { alignItems: "center", justifyContent: "center", paddingTop: spacing.xs },
  vitalsFieldLabel: {
    fontSize: 9, fontWeight: "700", color: colors.brand,
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  vitalsInputRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  vitalsBpInputRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  vitalsBpHalf: { flex: 1, alignItems: "center" },
  vitalsBpSub: { fontSize: 8, color: colors.textTertiary, textTransform: "uppercase", letterSpacing: 0.3 },
  vitalsBpSlash: { fontSize: 18, fontWeight: "300", color: colors.textTertiary, marginBottom: 2 },
  vitalsInput: {
    fontSize: 20, fontWeight: "800",
    minWidth: 36, textAlign: "center",
    padding: 0, color: colors.textPrimary,
  },
  vitalsUnit: { fontSize: 10, color: colors.textTertiary, fontWeight: "600", marginTop: 2 },
  vitalsBmiValue: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  bmiStageChip: { marginTop: 3, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 8, alignSelf: "center" },
  bmiStageText: { fontSize: 9, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.3 },

  // ── Clinical notes editable card ───────────────────────────────────────
  clinicalCard: {
    backgroundColor: colors.successSoft + "44",
    borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.success + "33",
    overflow: "hidden",
  },
  clinicalField: { padding: spacing.md, gap: 6 },
  clinicalFieldBorder: { borderTopWidth: 1, borderTopColor: colors.success + "22" },
  clinicalFieldRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  clinicalFieldLabel: {
    fontSize: 10, fontWeight: "700", color: colors.success,
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  cimBtn: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.brand + "18",
    borderWidth: 1, borderColor: colors.brand + "44",
  },
  cimBtnText: {
    fontSize: 9, fontWeight: "800", color: colors.brand,
    letterSpacing: 0.5,
  },
  templateBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.success + "18",
    borderWidth: 1,
    borderColor: colors.success + "44",
  },
  templateBtnText: {
    fontSize: 9,
    fontWeight: "800" as const,
    color: colors.success,
    letterSpacing: 0.5,
  },
  clinicalInput: {
    fontSize: 14, color: colors.textPrimary, lineHeight: 20,
    minHeight: 38, padding: 0,
  },

  // ── Status row ─────────────────────────────────────────────────────────
  statusRow: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" },
  statusBtn: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusBtnText: { fontSize: 11, fontWeight: "600", color: colors.textTertiary },

  // ── Follow-up scheduler ───────────────────────────────────────────────
  followUpBox: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: colors.brandSoft, borderRadius: radii.md,
    paddingHorizontal: spacing.md, paddingVertical: 10, gap: spacing.sm,
  },
  followUpSet: { fontSize: 13, fontWeight: "600", color: colors.brand, marginBottom: 6 },
  followUpCreateBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.brand, borderRadius: radii.pill,
    paddingHorizontal: 10, paddingVertical: 5, alignSelf: "flex-start",
  },
  followUpCreateBtnText: { fontSize: 11, fontWeight: "700", color: colors.textOnDark },
  followUpCreatedNote: { fontSize: 11, color: colors.success, fontStyle: "italic", marginTop: 2 },
  followUpClear: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radii.pill, backgroundColor: colors.border,
    marginTop: 2,
  },
  followUpClearText: { fontSize: 11, color: colors.textSecondary },
  followUpChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  followUpChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radii.pill, borderWidth: 1.5, borderColor: colors.brand + "55",
    backgroundColor: colors.brandSoft,
  },
  followUpChipText: { fontSize: 12, fontWeight: "600", color: colors.brand },

  // ── Issued documents list ─────────────────────────────────────────────────
  issuedDocsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  issuedDocRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  issuedDocRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  issuedDocLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  issuedDocMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // ── Document buttons ───────────────────────────────────────────────────
  docBtnRow: { flexDirection: "row", gap: spacing.md },
  docBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, backgroundColor: colors.brand,
    borderRadius: radii.lg, paddingVertical: 14,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28, shadowRadius: 8, elevation: 4,
  },
  docBtnAlt: {
    backgroundColor: colors.brandSoft,
    shadowColor: "transparent",
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1.5, borderColor: colors.brand + "66",
  },
  docBtnText: { color: colors.textOnDark, fontWeight: "700", fontSize: 14 },
  invoiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.gold + "55",
    backgroundColor: colors.gold + "11",
    marginTop: spacing.sm,
  },
  invoiceBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.gold,
  },
  payAmountLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textTertiary,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ── Payment sheet ──────────────────────────────────────────────────────
  payOverlay: {
    flex: 1, justifyContent: "flex-end",
    backgroundColor: colors.surfaceDark + "55",
  },
  paySheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.md,
  },
  payHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border,
    alignSelf: "center", marginBottom: spacing.sm,
  },
  payHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  payIconWrap: {
    width: 44, height: 44, borderRadius: radii.md,
    backgroundColor: colors.brandSoft,
    alignItems: "center", justifyContent: "center",
  },
  payIconText: { fontSize: 22 },
  payTitle: { ...typography.h3, color: colors.textPrimary },
  paySub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  payInput: {
    borderWidth: 1.5, borderColor: colors.brand,
    borderRadius: radii.lg, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md, fontSize: 36, fontWeight: "800",
    color: colors.textPrimary, textAlign: "center",
    backgroundColor: colors.brandSoft + "44",
    letterSpacing: -1,
  },
  payConfirmBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, backgroundColor: colors.success,
    borderRadius: radii.lg, paddingVertical: 15,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  payConfirmText: { color: colors.textOnDark, fontWeight: "700", fontSize: 15, letterSpacing: 0.2 },
  paySkipBtn: { alignItems: "center", paddingVertical: spacing.sm },
  paySkipText: { fontSize: 14, color: colors.textTertiary },

  // ── Itemized billing ──────────────────────────────────────────────────
  billLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  billLineLabel: { flex: 1, fontSize: 14, color: colors.textPrimary },
  billLinePrice: { width: 80, textAlign: "right", fontSize: 14, fontWeight: "700", color: colors.textPrimary, paddingVertical: 2 },
  actePriceTxt: { fontSize: 14, fontWeight: "700", color: colors.textSecondary },
  billTotalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, marginTop: 2 },
  billTotalLabel: { fontSize: 15, fontWeight: "800", color: colors.textPrimary },
  billTotalValue: { fontSize: 17, fontWeight: "800", color: colors.brand },
  billFieldLabel: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginTop: spacing.sm, marginBottom: 5 },
  acteInput: { backgroundColor: colors.bg, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  billQuick: { borderWidth: 1, borderColor: colors.brand, borderRadius: radii.sm, paddingHorizontal: 12, paddingVertical: 9 },
  billQuickText: { fontSize: 12, fontWeight: "700", color: colors.brand },
  billRemaining: { marginTop: 8, fontSize: 13, fontWeight: "700", color: colors.danger },
  billCta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.success, borderRadius: radii.lg, paddingVertical: 14, marginTop: spacing.md },
  billCtaText: { color: colors.textOnDark, fontWeight: "700", fontSize: 15 },
  billStatusCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.bg, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginTop: spacing.md },
  billStatusAmount: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
  billStatusLabel: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  billCollectBtn: { backgroundColor: colors.brand, borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 9 },
  billCollectText: { color: colors.textOnDark, fontWeight: "700", fontSize: 13 },

  // ── Act-type chips ────────────────────────────────────────────────────
  actPickerRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.sm },
  actChip: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radii.pill, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  actChipActive: { backgroundColor: colors.gold + "22", borderColor: colors.gold },
  actChipText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
  actChipTextActive: { color: colors.gold, fontWeight: "700" },

  // ── CNOPS/AMO section ─────────────────────────────────────────────────
  cnopsBox: {
    backgroundColor: "#6b46c118",
    borderRadius: radii.md,
    borderWidth: 1, borderColor: "#c7b8ed",
    padding: spacing.md,
    gap: spacing.sm,
  },
  cnopsHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  cnopsLabel: {
    fontSize: 11, fontWeight: "700", color: "#6b46c1",
    textTransform: "uppercase", letterSpacing: 0.5, flex: 1,
  },
  cnopsNum: { fontSize: 12, fontWeight: "700", color: "#6b46c1" },
  tauxRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  tauxLabel: { fontSize: 12, color: "#4a5568", flex: 1 },
  tauxBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: radii.pill, borderWidth: 1.5, borderColor: "#c7b8ed",
    backgroundColor: colors.surface,
  },
  tauxBtnActive: { backgroundColor: "#6b46c1", borderColor: "#6b46c1" },
  tauxBtnText: { fontSize: 12, fontWeight: "700", color: "#6b46c1" },
  tauxBtnTextActive: { color: "#fff" },
  rembPreview: {
    flexDirection: "row",
    borderTopWidth: 1, borderTopColor: "#c7b8ed",
    paddingTop: spacing.sm,
  },
  rembItem: { flex: 1, alignItems: "center" },
  rembDivider: { width: 1, backgroundColor: "#c7b8ed" },
  rembItemLbl: { fontSize: 10, color: "#718096", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 },
  rembItemAmt: { fontSize: 14, fontWeight: "800" },

  // ── Photos ────────────────────────────────────────────────────────────
  photosEmpty: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border,
    borderStyle: "dashed", backgroundColor: colors.surface,
  },
  photosEmptyText: { fontSize: 14, color: colors.textTertiary },
  photosRow: { flexDirection: "row", gap: spacing.sm, paddingVertical: 4 },
  photoThumbWrap: { position: "relative" },
  photoThumbImg: {
    width: 80, height: 80, borderRadius: radii.md,
    backgroundColor: colors.border,
  },
  photoLabelBadge: {
    position: "absolute", bottom: 4, left: 4, right: 4,
    backgroundColor: "rgba(0,0,0,0.62)",
    borderRadius: 4,
    paddingHorizontal: 4, paddingVertical: 2,
    alignItems: "center",
  },
  photoLabelText: {
    fontSize: 8, fontWeight: "700", color: "#fff",
    textTransform: "uppercase", letterSpacing: 0.3,
  },
  photoDeleteBtn: {
    position: "absolute", top: -6, right: -6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: colors.bg,
    zIndex: 10,
  },
  photoAddThumb: {
    width: 80, height: 80, borderRadius: radii.md,
    borderWidth: 1.5, borderColor: colors.brand + "55",
    borderStyle: "dashed", backgroundColor: colors.brandSoft,
    alignItems: "center", justifyContent: "center",
  },

  // ── Photo viewer ──────────────────────────────────────────────────────
  photoViewer: {
    flex: 1, backgroundColor: "#000",
    alignItems: "center", justifyContent: "center",
  },
  photoViewerImg: { width: "100%", height: "100%" },
  photoViewerClose: {
    position: "absolute", right: spacing.lg,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center", justifyContent: "center",
  },
  photoViewerLabel: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.72)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  photoViewerLabelText: {
    color: "#fff", fontSize: 13, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 1,
  },

  // ── Label-selection sheet ──────────────────────────────────────────────
  labelSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.md,
  },
  labelSheetTitle: {
    fontSize: 17, fontWeight: "800", color: colors.textPrimary,
    textAlign: "center", letterSpacing: -0.3,
  },
  labelSheetSub: {
    fontSize: 13, color: colors.textSecondary, textAlign: "center",
    marginTop: -spacing.xs,
  },
  labelChipsGrid: {
    flexDirection: "row", flexWrap: "wrap",
    gap: spacing.sm, justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  labelChip: {
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1.5, borderColor: colors.brand + "55",
    backgroundColor: colors.brandSoft,
  },
  labelChipText: {
    fontSize: 13, fontWeight: "700", color: colors.brand,
  },
  labelSkipBtn: {
    alignItems: "center", paddingVertical: spacing.sm,
  },
  labelSkipText: {
    fontSize: 14, color: colors.textTertiary,
  },

  // ── Consultation timer ────────────────────────────────────────────────
  timerCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.brand + "33",
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  timerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timerTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.brand,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.danger + "18",
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.danger + "44",
  },
  timerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  timerBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.danger,
    letterSpacing: 0.6,
  },
  timerDisplay: {
    fontSize: 44,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -1,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
    paddingVertical: spacing.xs,
  },
  timerProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  timerTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.brand + "22",
    overflow: "hidden",
  },
  timerFill: {
    height: "100%",
    borderRadius: 3,
  },
  timerHint: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textTertiary,
    minWidth: 90,
    textAlign: "right",
  },
  timerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: 12,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.brand + "55",
    backgroundColor: colors.brandSoft,
    marginTop: spacing.xs,
  },
  timerBtnStop: {
    backgroundColor: colors.success,
    borderColor: colors.success,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  timerBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.brand,
  },

  // ── Patient medical context card ──────────────────────────────────────
  patCtxCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  patCtxRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.md,
  },
  patCtxRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  patCtxLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    width: 112,
    paddingTop: 1,
  },
  patCtxValue: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  patCtxAllergyValue: {
    color: colors.danger,
    fontWeight: "600" as const,
  },
  patCtxBloodBadge: {
    alignSelf: "center" as const,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.brand + "44",
  },
  patCtxBloodBadgeText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: colors.brand,
    letterSpacing: 0.3,
  },

  // ── Reimbursement section ─────────────────────────────────────────────
  rmbCard: {
    backgroundColor: "#6b46c118",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "#c7b8ed",
    overflow: "hidden",
  },
  rmbChipRow: {
    flexDirection: "row",
    padding: spacing.md,
    gap: spacing.xs,
  },
  rmbChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: "#c7b8ed",
    backgroundColor: colors.surface,
  },
  rmbChipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  rmbChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b46c1",
  },
  rmbAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#e9e0fa",
    paddingTop: spacing.sm,
  },
  rmbAmountLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#6b46c1",
  },
  mutuelleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#e9e0fa",
  },
  mutuelleDate: { fontSize: 11, color: "#8b7bb8", marginTop: 2 },
  rmbAmountInput: {
    borderWidth: 1.5,
    borderColor: "#c7b8ed",
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    fontSize: 16,
    fontWeight: "800",
    color: "#6b46c1",
    minWidth: 100,
    textAlign: "right",
    backgroundColor: colors.surface,
  },

  // ── Previous consultation banner ──────────────────────────────────────
  prevBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.brandSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.brand + "33",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  prevBannerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  prevBannerDate: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.brand,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  prevBannerSnippet: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },

  // ── Not found ─────────────────────────────────────────────────────────
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  notFoundText: { ...typography.h3, color: colors.textSecondary },
  backBtnLarge: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    backgroundColor: colors.brand, borderRadius: radii.lg,
  },
  backBtnLargeText: { color: colors.textOnDark, fontWeight: "700", fontSize: 15 },
});
