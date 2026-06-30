import React, { useEffect, useMemo, useRef, useState } from "react";
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
import {
  Appointment,
  AppointmentStatus,
  AppointmentType,
  CabinetLocation,
  ConsultationNote,
  Patient,
} from "../lib/cabinetTypes";
import { useCabinet } from "../lib/CabinetContext";
import { DatePickerField } from "./DatePickerField";
import { Icon } from "../lib/icons";
import { radii, spacing, typography, colors, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { uuid, todayIso, nowHHMM, addDays } from "../lib/utils";
import { tapLight, tapSuccess } from "../lib/haptics";
import { sharedModalStyles as _sharedModalStyles, makeSharedStyles } from "../lib/sharedStyles";
import { TimeDrumPicker, snapToMinuteGrid } from "./TimeDrumPicker";
import { NoteTemplateSheet } from "./NoteTemplateSheet";
import { NoteTemplate } from "../lib/noteTemplates";
import { getStoredUser } from "../lib/api";
import { scheduleFollowUpNotification, cancelFollowUpNotification, requestNotificationPermissions } from "../lib/notifications";

// ─── constants ───────────────────────────────────────────────────────────────

export const TYPE_COLORS: Record<AppointmentType, string> = {
  consultation: colors.brand,
  controle: "#0FB5C4",
  suivi: colors.success,
  procedure: colors.gold,
  urgence: colors.danger,
  autre: colors.textTertiary,
};

export const STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled:       colors.brand,
  arrived:         colors.gold,
  in_consultation: "#7C3AED",
  completed:       colors.success,
  cancelled:       colors.textTertiary,
  no_show:         colors.warning,
};

export const EMPTY_APPT: Omit<Appointment, "id"> = {
  patientName: "",
  date: todayIso(),
  startTime: "09:00",
  endTime: "09:30",
  type: "consultation",
  notes: "",
  status: "scheduled",
  consultationNote: {},
};

// ─── time helpers ─────────────────────────────────────────────────────────────

/** Round an HH:MM string up to the next 15-minute boundary */
function roundTo15(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const rounded = Math.ceil(m / 15) * 15;
  const totalMin = h * 60 + rounded;
  const rh = Math.floor(totalMin / 60) % 24;
  const rm = totalMin % 60;
  return `${String(rh).padStart(2, "0")}:${String(rm).padStart(2, "0")}`;
}

/** Add `mins` to an HH:MM string, wraps at midnight */
function addMins(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + mins;
  const rh = Math.floor(total / 60) % 24;
  const rm = total % 60;
  return `${String(rh).padStart(2, "0")}:${String(rm).padStart(2, "0")}`;
}

/** True if the two half-open intervals [s1,e1) and [s2,e2) overlap */
function timesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  return toMin(s1) < toMin(e2) && toMin(e1) > toMin(s2);
}

// ─── Recurrence helpers ───────────────────────────────────────────────────────

type RecurFreq = "weekly" | "biweekly" | "monthly";

function addDaysToIso(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonthsToIso(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

function generateRecurDates(base: string, freq: RecurFreq, count: number): string[] {
  const dates: string[] = [];
  for (let i = 1; i < count; i++) {
    if (freq === "weekly")   dates.push(addDaysToIso(base, 7 * i));
    else if (freq === "biweekly") dates.push(addDaysToIso(base, 14 * i));
    else                     dates.push(addMonthsToIso(base, i));
  }
  return dates;
}

function formatIsoShort(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

// ─── AppointmentModal ────────────────────────────────────────────────────────

export function AppointmentModal({
  visible, initial, selectedDate, patients, locations = [], prefilledPatientId, onSave, onClose, t,
}: {
  visible: boolean; initial: Appointment | null; selectedDate: string;
  patients: Patient[]; locations?: CabinetLocation[];
  /** Pre-select a patient when opening in "new appointment" mode. */
  prefilledPatientId?: string;
  onSave: (a: Appointment) => void;
  onClose: () => void; t: (k: string) => string;
}) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const sharedModalStyles = makeSharedStyles(colors);
  const insets = useSafeAreaInsets();
  const { appointments, addAppointment } = useCabinet();

  const buildInitialForm = (): Omit<Appointment, "id"> => {
    if (initial) return { ...initial };
    const base = { ...EMPTY_APPT, date: selectedDate };
    if (prefilledPatientId) {
      const p = patients.find((pt) => pt.id === prefilledPatientId);
      if (p) {
        base.patientId   = p.id;
        base.patientName = `${p.firstName} ${p.lastName}`;
      }
    }
    return base;
  };

  const [form, setForm] = useState<Omit<Appointment, "id">>(buildInitialForm);
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [showClinical, setShowClinical] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [recurEnabled, setRecurEnabled] = useState(false);
  const [recurFreq, setRecurFreq] = useState<RecurFreq>("weekly");
  const [recurCount, setRecurCount] = useState(4);
  const [userId, setUserId] = useState<string | null>(null);

  // Load userId once for template storage
  useEffect(() => {
    getStoredUser().then((u) => setUserId(u?.id ?? null)).catch(() => {});
  }, []);

  // Tracks whether the user manually changed endTime (if not, it follows startTime)
  const endTimeManual = useRef(false);

  useEffect(() => {
    const base: Omit<Appointment, "id"> = initial
      ? { ...initial }
      : { ...EMPTY_APPT, date: selectedDate };

    if (!initial) {
      // Smart defaults: pre-fill to now rounded up to next 15 min + 30 min duration
      const start = roundTo15(nowHHMM());
      base.startTime = start;
      base.endTime = addMins(start, 30);
      // Pre-fill patient if requested
      if (prefilledPatientId) {
        const p = patients.find((pt) => pt.id === prefilledPatientId);
        if (p) {
          base.patientId   = p.id;
          base.patientName = `${p.firstName} ${p.lastName}`;
        }
      }
    } else {
      // Snap existing times to 5-minute grid so the drum picker aligns correctly
      base.startTime = snapToMinuteGrid(initial.startTime);
      base.endTime = snapToMinuteGrid(initial.endTime);
    }

    setForm(base);
    setPatientSearch("");
    endTimeManual.current = false;
    setRecurEnabled(false);
    setRecurFreq("weekly");
    setRecurCount(4);
    setShowClinical(
      !!initial?.consultationNote &&
        Object.values(initial.consultationNote).some((v) => v && v.trim().length > 0)
    );
  }, [initial, selectedDate, visible, prefilledPatientId]);

  const set = (key: keyof Omit<Appointment, "id">, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const setClinical = (key: keyof ConsultationNote, val: string) =>
    setForm((f) => ({
      ...f,
      consultationNote: { ...(f.consultationNote ?? {}), [key]: val },
    }));

  // Picker always delivers valid HH:MM; auto-advance endTime unless user moved it
  const handleStartTimeChange = (v: string) => {
    set("startTime", v);
    if (!endTimeManual.current) set("endTime", addMins(v, 30));
  };

  const handleEndTimeChange = (v: string) => {
    endTimeManual.current = true;
    set("endTime", v);
  };

  const timeRe = /^\d{2}:\d{2}$/;
  const isValid =
    form.patientName.trim().length > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(form.date) &&
    timeRe.test(form.startTime) &&
    timeRe.test(form.endTime);

  // Conflict detection: find any other appointment on the same date that overlaps
  const conflictAppt = useMemo(() => {
    if (!timeRe.test(form.startTime) || !timeRe.test(form.endTime)) return null;
    return (
      appointments.find(
        (a) =>
          a.id !== initial?.id &&
          a.date === form.date &&
          a.status !== "cancelled" &&
          a.status !== "no_show" &&
          timesOverlap(form.startTime, form.endTime, a.startTime, a.endTime)
      ) ?? null
    );
  }, [appointments, form.date, form.startTime, form.endTime, initial]);

  // ── Free-slot suggestions ─────────────────────────────────────────────────
  const freeSlots = useMemo(() => {
    const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const fromMin = (n: number) =>
      `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

    const occupied = appointments.filter(
      (a) =>
        a.id !== initial?.id &&
        a.date === form.date &&
        a.status !== "cancelled" &&
        a.status !== "no_show",
    );

    const DURATION = 30;
    const WORK_START = 8 * 60;  // 08:00
    const WORK_END   = 19 * 60; // last start at 19:00 → ends 19:30

    // On today start from the next 30-min boundary, otherwise from 08:00
    const nowRaw  = new Date().getHours() * 60 + new Date().getMinutes();
    const nowSnap = Math.ceil(nowRaw / 30) * 30;
    const fromMin_ = form.date === todayIso() ? Math.max(WORK_START, nowSnap) : WORK_START;

    const slots: string[] = [];
    for (let t = fromMin_; t <= WORK_END && slots.length < 6; t += DURATION) {
      const s = fromMin(t);
      const e = fromMin(t + DURATION);
      const busy = occupied.some(
        (a) => toMin(s) < toMin(a.endTime) && toMin(e) > toMin(a.startTime),
      );
      if (!busy) slots.push(s);
    }
    return slots;
  }, [appointments, form.date, initial]);

  // Filtered patient list for the picker
  const filteredPickerPatients = useMemo(() => {
    const q = patientSearch.toLowerCase().trim();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q))
    );
  }, [patients, patientSearch]);

  const handleSave = () => {
    if (!isValid) return;
    tapSuccess();
    const base = { ...form, patientName: form.patientName.trim() };

    if (recurEnabled && !initial) {
      // Save all occurrences with a shared recurringRuleId so the series can be managed together
      const recurringRuleId = uuid();
      const futureDates = generateRecurDates(form.date, recurFreq, recurCount);
      addAppointment({ id: uuid(), ...base, recurringRuleId });
      futureDates.forEach(date => addAppointment({ id: uuid(), ...base, date, recurringRuleId }));
      onClose();
    } else {
      onSave({ id: initial?.id ?? uuid(), ...base });
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={sharedModalStyles.overlay}>
        <View style={[sharedModalStyles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
          <View style={sharedModalStyles.handle} />
          <View style={sharedModalStyles.header}>
            <Text style={sharedModalStyles.title}>
              {initial ? t("agenda.editAppointment") : t("agenda.addAppointment")}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Icon name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Patient name */}
            <Text style={sharedModalStyles.formLabel}>{t("agenda.patientName")}</Text>
            <View style={styles.patientInputRow}>
              <TextInput
                style={[sharedModalStyles.formInput, { flex: 1 }]}
                value={form.patientName}
                onChangeText={(v) => set("patientName", v)}
                placeholder={t("agenda.patientNamePlaceholder")}
                placeholderTextColor={colors.textTertiary}
                returnKeyType="next"
              />
              {patients.length > 0 && (
                <Pressable
                  style={styles.pickPatientBtn}
                  onPress={() => { tapLight(); setShowPatientPicker(true); }}
                >
                  <Icon name="users" size={16} color={colors.brand} />
                </Pressable>
              )}
            </View>

            {/* Date */}
            <Text style={sharedModalStyles.formLabel}>{t("agenda.date")}</Text>
            <DatePickerField
              value={form.date}
              onChange={(v) => set("date", v)}
            />

            {/* ── Free-slot suggestions ── */}
            {freeSlots.length > 0 && (
              <View style={styles.slotRow}>
                <View style={styles.slotLabelRow}>
                  <Icon name="zap" size={11} color={colors.brand} />
                  <Text style={styles.slotLabel}>Créneaux libres</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.slotChips}
                >
                  {freeSlots.map((slot) => {
                    const active = form.startTime === slot;
                    return (
                      <Pressable
                        key={slot}
                        style={({ pressed }) => [
                          styles.slotChip,
                          active && styles.slotChipActive,
                          pressed && { opacity: 0.72 },
                        ]}
                        onPress={() => {
                          tapLight();
                          endTimeManual.current = false;
                          handleStartTimeChange(slot);
                        }}
                      >
                        <Text style={[styles.slotChipText, active && styles.slotChipTextActive]}>
                          {slot}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Times */}
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={sharedModalStyles.formLabel}>{t("agenda.startTime")}</Text>
                <TimeDrumPicker value={form.startTime} onChange={handleStartTimeChange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={sharedModalStyles.formLabel}>{t("agenda.endTime")}</Text>
                <TimeDrumPicker value={form.endTime} onChange={handleEndTimeChange} />
              </View>
            </View>

            {/* Conflict warning — always occupies the same height so nothing shifts */}
            <View style={[styles.conflictZone, !!conflictAppt && styles.conflictZoneActive]}>
              {conflictAppt ? (
                <>
                  <Icon name="alertCircle" size={13} color={colors.warning} />
                  <Text style={styles.conflictText} numberOfLines={1}>
                    {t("agenda.conflictWarning")} {conflictAppt.patientName} ({conflictAppt.startTime}–{conflictAppt.endTime})
                  </Text>
                </>
              ) : null}
            </View>

            {/* Type */}
            <Text style={sharedModalStyles.formLabel}>{t("agenda.type")}</Text>
            <View style={styles.chipRow}>
              {(["consultation", "controle", "suivi", "procedure", "urgence", "autre"] as AppointmentType[]).map(
                (tp) => (
                  <Pressable
                    key={tp}
                    style={[styles.chip, form.type === tp && { backgroundColor: TYPE_COLORS[tp], borderColor: TYPE_COLORS[tp] }]}
                    onPress={() => { tapLight(); set("type", tp); }}
                  >
                    <Text style={[styles.chipText, form.type === tp && { color: colors.textOnDark }]}>
                      {t(`agenda.types.${tp}`)}
                    </Text>
                  </Pressable>
                )
              )}
            </View>

            {/* Notes */}
            <Text style={sharedModalStyles.formLabel}>{t("agenda.notes")}</Text>
            <TextInput
              style={[sharedModalStyles.formInput, sharedModalStyles.formTextarea]}
              value={form.notes ?? ""}
              onChangeText={(v) => set("notes", v)}
              placeholder={t("agenda.notesPlaceholder")}
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Location selector (only shown when locations are configured) */}
            {locations.length > 0 && (
              <>
                <Text style={sharedModalStyles.formLabel}>{t("locations.name")}</Text>
                <View style={styles.chipRow}>
                  <Pressable
                    style={[styles.chip, !form.locationId && { backgroundColor: colors.brandSoft, borderColor: colors.brand }]}
                    onPress={() => { tapLight(); set("locationId", ""); }}
                  >
                    <Text style={[styles.chipText, !form.locationId && { color: colors.brand, fontWeight: "700" }]}>
                      —
                    </Text>
                  </Pressable>
                  {locations.map((loc) => {
                    const active = form.locationId === loc.id;
                    const c = loc.color || colors.brand;
                    return (
                      <Pressable
                        key={loc.id}
                        style={[styles.chip, active && { backgroundColor: c + "22", borderColor: c }]}
                        onPress={() => { tapLight(); set("locationId", loc.id); }}
                      >
                        <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: c }} />
                        <Text style={[styles.chipText, active && { color: c, fontWeight: "700" }]}>
                          {loc.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {/* Clinical notes collapsible */}
            <View style={styles.clinicalToggleRow}>
              <Pressable
                style={[styles.clinicalToggle, { flex: 1 }]}
                onPress={() => { tapLight(); setShowClinical((v) => !v); }}
              >
                <Icon name="clipboard" size={14} color={colors.success} />
                <Text style={styles.clinicalToggleText}>
                  {showClinical ? t("agenda.hideClinical") : t("agenda.showClinical")}
                </Text>
              </Pressable>
              <Pressable
                style={styles.templatesBtn}
                onPress={() => { tapLight(); setShowClinical(true); setShowTemplates(true); }}
              >
                <Icon name="zap" size={12} color={colors.brand} />
                <Text style={styles.templatesBtnText}>Modèles</Text>
              </Pressable>
            </View>

            {showClinical && (
              <View style={styles.clinicalSection}>
                <Text style={sharedModalStyles.formLabel}>{t("agenda.motif")}</Text>
                <TextInput
                  style={[sharedModalStyles.formInput, sharedModalStyles.formTextarea]}
                  value={form.consultationNote?.motif ?? ""}
                  onChangeText={(v) => setClinical("motif", v)}
                  placeholder={t("agenda.motifPlaceholder")}
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
                <Text style={sharedModalStyles.formLabel}>{t("agenda.examination")}</Text>
                <TextInput
                  style={[sharedModalStyles.formInput, sharedModalStyles.formTextarea]}
                  value={form.consultationNote?.examination ?? ""}
                  onChangeText={(v) => setClinical("examination", v)}
                  placeholder={t("agenda.examinationPlaceholder")}
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                <Text style={sharedModalStyles.formLabel}>{t("agenda.diagnosis")}</Text>
                <TextInput
                  style={[sharedModalStyles.formInput, sharedModalStyles.formTextarea]}
                  value={form.consultationNote?.diagnosis ?? ""}
                  onChangeText={(v) => setClinical("diagnosis", v)}
                  placeholder={t("agenda.diagnosisPlaceholder")}
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
                <Text style={sharedModalStyles.formLabel}>{t("agenda.treatment")}</Text>
                <TextInput
                  style={[sharedModalStyles.formInput, sharedModalStyles.formTextarea]}
                  value={form.consultationNote?.treatment ?? ""}
                  onChangeText={(v) => setClinical("treatment", v)}
                  placeholder={t("agenda.treatmentPlaceholder")}
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            )}

            {/* ── Follow-up reminder ── */}
            <View style={styles.followUpSection}>
              <View style={styles.followUpHeader}>
                <Icon name="heartPulse" size={14} color={colors.gold} />
                <Text style={styles.followUpTitle}>Rappel de suivi</Text>
                {form.followUpDate && (
                  <Pressable
                    onPress={() => {
                      tapLight();
                      setForm((f) => ({ ...f, followUpDate: undefined }));
                    }}
                    hitSlop={8}
                  >
                    <Icon name="close" size={13} color={colors.textTertiary} />
                  </Pressable>
                )}
              </View>

              {/* Quick-select chips */}
              <View style={styles.followUpChips}>
                {[
                  { label: "3 jours", days: 3 },
                  { label: "1 sem.", days: 7 },
                  { label: "2 sem.", days: 14 },
                  { label: "1 mois", days: 30 },
                ].map(({ label, days }) => {
                  const targetDate = addDays(form.date, days);
                  const active = form.followUpDate === targetDate;
                  return (
                    <Pressable
                      key={label}
                      style={[styles.followUpChip, active && styles.followUpChipActive]}
                      onPress={async () => {
                        tapLight();
                        setForm((f) => ({ ...f, followUpDate: targetDate }));
                        await requestNotificationPermissions();
                      }}
                    >
                      <Text style={[styles.followUpChipText, active && styles.followUpChipTextActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Selected date display */}
              {form.followUpDate && (
                <View style={styles.followUpDateBadge}>
                  <Icon name="calendar" size={12} color={colors.gold} />
                  <Text style={styles.followUpDateText}>
                    Rappel fixé au {new Date(form.followUpDate + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </Text>
                </View>
              )}
            </View>

            {/* ── Recurrence (new appointments only) ── */}
            {!initial && (
              <>
                <Pressable
                  style={[styles.clinicalToggle, styles.recurToggle]}
                  onPress={() => { tapLight(); setRecurEnabled(v => !v); }}
                >
                  <Icon name="refresh" size={14} color={colors.brand} />
                  <Text style={[styles.clinicalToggleText, { color: colors.brand }]}>
                    {recurEnabled ? t("agenda.recurEnabled") : t("agenda.addRecurrence")}
                  </Text>
                  <Icon name={recurEnabled ? "chevronUp" : "chevronDown"} size={14} color={colors.brand} />
                </Pressable>

                {recurEnabled && (
                  <View style={styles.recurSection}>
                    {/* Frequency */}
                    <Text style={sharedModalStyles.formLabel}>{t("agenda.recurFrequency")}</Text>
                    <View style={styles.chipRow}>
                      {(["weekly", "biweekly", "monthly"] as RecurFreq[]).map(f => (
                        <Pressable
                          key={f}
                          style={[styles.chip, recurFreq === f && { backgroundColor: colors.brandSoft, borderColor: colors.brand }]}
                          onPress={() => { tapLight(); setRecurFreq(f); }}
                        >
                          <Text style={[styles.chipText, recurFreq === f && { color: colors.brand, fontWeight: "700" }]}>
                            {t(`agenda.recur${f.charAt(0).toUpperCase() + f.slice(1)}` as any)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    {/* Occurrences stepper */}
                    <Text style={[sharedModalStyles.formLabel, { marginTop: spacing.md }]}>{t("agenda.recurCount")}</Text>
                    <View style={styles.stepperRow}>
                      <Pressable
                        style={styles.stepperBtn}
                        onPress={() => { tapLight(); setRecurCount(c => Math.max(2, c - 1)); }}
                      >
                        <Text style={styles.stepperBtnText}>−</Text>
                      </Pressable>
                      <Text style={styles.stepperValue}>{recurCount}</Text>
                      <Pressable
                        style={styles.stepperBtn}
                        onPress={() => { tapLight(); setRecurCount(c => Math.min(52, c + 1)); }}
                      >
                        <Text style={styles.stepperBtnText}>+</Text>
                      </Pressable>
                      <Text style={styles.stepperLabel}>{t("agenda.recurPreview")}</Text>
                    </View>

                    {/* Last date preview */}
                    {isValid && (() => {
                      const dates = generateRecurDates(form.date, recurFreq, recurCount);
                      const lastDate = dates[dates.length - 1];
                      return lastDate ? (
                        <Text style={styles.recurLastDate}>
                          ↳ {t("agenda.recurCreated")} · jusqu'au {formatIsoShort(lastDate)}
                        </Text>
                      ) : null;
                    })()}
                  </View>
                )}
              </>
            )}

            <Pressable
              style={[sharedModalStyles.saveBtn, !isValid && sharedModalStyles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!isValid}
            >
              <Text style={sharedModalStyles.saveBtnText}>
                {recurEnabled && !initial ? `${t("save")} · ${recurCount}×` : t("save")}
              </Text>
            </Pressable>
            <View style={{ height: spacing.xl }} />
          </ScrollView>
        </View>
      </View>

      {/* Note template sheet */}
      <NoteTemplateSheet
        visible={showTemplates}
        currentNote={form.consultationNote ?? {}}
        userId={userId}
        onApply={(tpl: NoteTemplate) => {
          setForm((f) => ({
            ...f,
            consultationNote: {
              motif:       tpl.motif       !== undefined ? tpl.motif       : (f.consultationNote?.motif ?? ""),
              examination: tpl.examination !== undefined ? tpl.examination : (f.consultationNote?.examination ?? ""),
              diagnosis:   tpl.diagnosis   !== undefined ? tpl.diagnosis   : (f.consultationNote?.diagnosis ?? ""),
              treatment:   tpl.treatment   !== undefined ? tpl.treatment   : (f.consultationNote?.treatment ?? ""),
            },
          }));
        }}
        onClose={() => setShowTemplates(false)}
      />

      {/* Patient picker sub-modal */}
      <Modal
        visible={showPatientPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPatientPicker(false)}
      >
        <View style={sharedModalStyles.overlay}>
          <View style={[sharedModalStyles.sheet, styles.pickerSheet]}>
            <View style={sharedModalStyles.handle} />
            <View style={sharedModalStyles.header}>
              <Text style={sharedModalStyles.title}>{t("agenda.selectPatient")}</Text>
              <Pressable onPress={() => setShowPatientPicker(false)} hitSlop={10}>
                <Icon name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Search bar */}
            <View style={styles.pickerSearchBar}>
              <Icon name="search" size={15} color={colors.textTertiary} />
              <TextInput
                style={styles.pickerSearchInput}
                value={patientSearch}
                onChangeText={setPatientSearch}
                placeholder={t("agenda.searchPatient")}
                placeholderTextColor={colors.textTertiary}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
            </View>

            <View style={{ flex: 1 }}>
              <FlatList
                data={filteredPickerPatients}
                keyExtractor={(p) => p.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.patientPickerRow}
                    onPress={() => {
                      tapLight();
                      set("patientName", `${item.firstName} ${item.lastName}`);
                      set("patientId", item.id);
                      setShowPatientPicker(false);
                      setPatientSearch("");
                    }}
                  >
                    <View style={styles.patientPickerAvatar}>
                      <Text style={styles.patientPickerAvatarText}>
                        {item.firstName[0]}{item.lastName[0]}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.patientPickerName}>{item.firstName} {item.lastName}</Text>
                      {item.phone ? (
                        <Text style={styles.patientPickerSub}>{item.phone}</Text>
                      ) : null}
                    </View>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <View style={styles.pickerEmpty}>
                    <Text style={styles.pickerEmptyText}>{t("transactions.noResults")}</Text>
                  </View>
                }
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  pickerSheet: { height: "60%" },
  patientInputRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  pickPatientBtn: {
    width: 46, height: 46, borderRadius: radii.md,
    backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.brand + "44",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: 4 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg,
    flexDirection: "row", alignItems: "center", gap: 5,
  },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },

  // Fixed-height zone — always reserves space so the form never reflows
  conflictZone: {
    height: 32,
    marginTop: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radii.sm,
  },
  conflictZoneActive: {
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warning + "44",
    paddingHorizontal: spacing.sm,
  },
  conflictText: { flex: 1, fontSize: 12, color: colors.warning, fontWeight: "600", lineHeight: 16 },

  clinicalToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  clinicalToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.sm,
  },
  clinicalToggleText: { fontSize: 13, fontWeight: "600", color: colors.success },
  templatesBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.brand + "55",
    backgroundColor: colors.brandSoft,
  },
  templatesBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.brand,
  },
  clinicalSection: {
    backgroundColor: colors.successSoft + "55",
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.success + "33",
    marginBottom: spacing.sm,
  },

  // Follow-up reminder
  followUpSection: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  followUpHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  followUpTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: colors.gold,
  },
  followUpChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  followUpChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  followUpChipActive: {
    backgroundColor: colors.gold + "22",
    borderColor: colors.gold,
  },
  followUpChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  followUpChipTextActive: {
    color: colors.gold,
  },
  followUpDateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.gold + "11",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gold + "44",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  followUpDateText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gold,
  },

  // Recurrence
  recurToggle: {
    borderTopColor: colors.border,
  },
  recurSection: {
    backgroundColor: colors.brandSoft + "66",
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.brand + "33",
    marginBottom: spacing.sm,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: 4,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnText: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.brand,
    lineHeight: 24,
  },
  stepperValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
    minWidth: 28,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  stepperLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    flex: 1,
  },
  recurLastDate: {
    fontSize: 11,
    color: colors.brand,
    fontWeight: "600",
    marginTop: spacing.sm,
    letterSpacing: 0.1,
  },

  // Patient picker
  pickerSearchBar: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.bg,
    marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  pickerSearchInput: { flex: 1, fontSize: 14, color: colors.textPrimary },
  pickerEmpty: { alignItems: "center", paddingVertical: spacing.xl },
  pickerEmptyText: { ...typography.body, color: colors.textTertiary },

  patientPickerRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  patientPickerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center",
  },
  patientPickerAvatarText: { fontSize: 13, fontWeight: "700", color: colors.brand, textTransform: "uppercase" },
  patientPickerName: { ...typography.body, color: colors.textPrimary, fontWeight: "600" },
  patientPickerSub: { fontSize: 12, color: colors.textTertiary, marginTop: 1 },

  // ── Free-slot suggestions ──────────────────────────────────────────────────
  slotRow: {
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  slotLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  slotLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.brand,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  slotChips: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: 2,
  },
  slotChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.brand + "44",
    backgroundColor: colors.brandSoft,
  },
  slotChipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  slotChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.brand,
    letterSpacing: 0.2,
  },
  slotChipTextActive: {
    color: colors.textOnDark,
  },
});
