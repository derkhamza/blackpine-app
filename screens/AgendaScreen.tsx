import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScalePressable } from "../components/ScalePressable";
import { SafeScreen } from "../components/SafeScreen";
import { AppointmentModal, TYPE_COLORS, STATUS_COLORS } from "../components/AppointmentModal";
import { GlobalSearchModal, HistoryTab } from "../components/GlobalSearchModal";
import { PatientHistoryModal } from "../components/PatientHistoryModal";
import { useCabinet } from "../lib/CabinetContext";
import { useBilling } from "../lib/useBilling";
import { Appointment, Patient } from "../lib/cabinetTypes";
import { Icon } from "../lib/icons";
import { radii, shadows, spacing, typography, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { useT } from "../lib/useT";
import { tapLight, tapSuccess } from "../lib/haptics";
import { todayIso, nowHHMM, addDays } from "../lib/utils";
import { formatDateShort } from "../lib/format";
import { scheduleFollowUpNotification, cancelFollowUpNotification } from "../lib/notifications";

// ─── helpers ────────────────────────────────────────────────────────────────

const today = todayIso;

function weekStart(iso: string): string {
  const d = new Date(iso);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Returns 0=Mon … 6=Sun for the first day of the given month. */
function firstWeekdayMon(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

/** Normalize a Moroccan phone number to E.164 (e.g. 0612345678 → 212612345678). */
function toE164Morocco(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("212")) return digits;
  if (digits.startsWith("0")) return "212" + digits.slice(1);
  return "212" + digits;
}

function buildWhatsAppUrl(phone: string, message: string): string {
  const e164 = toE164Morocco(phone);
  return `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
}

function isoFromParts(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const DAY_ABBR_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const CAL_DAY_HEADERS = ["L", "M", "M", "J", "V", "S", "D"];

// ─── Month calendar ──────────────────────────────────────────────────────────

function MonthCalendar({
  year,
  month,
  selectedDate,
  todayStr,
  appointments,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: {
  year: number;
  month: number;
  selectedDate: string;
  todayStr: string;
  appointments: Appointment[];
  onSelectDate: (iso: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const colors = useColors();
  const calStyles = makeCalStyles(colors);
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;

  const apptsByDay = useMemo(() => {
    const map = new Map<number, Appointment[]>();
    appointments
      .filter((a) => a.date.startsWith(monthPrefix))
      .forEach((a) => {
        const day = parseInt(a.date.split("-")[2], 10);
        const list = map.get(day) ?? [];
        list.push(a);
        map.set(day, list);
      });
    return map;
  }, [appointments, monthPrefix]);

  const monthLabel = new Date(year, month, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  const nDays = daysInMonth(year, month);
  const leading = firstWeekdayMon(year, month);
  const cells: (number | null)[] = [
    ...Array(leading).fill(null),
    ...Array.from({ length: nDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={calStyles.container}>
      {/* Month nav */}
      <View style={calStyles.monthNav}>
        <ScalePressable
          scaleTo={0.88}
          style={calStyles.arrowBtn}
          onPress={() => { tapLight(); onPrevMonth(); }}
        >
          <Icon name="back" size={20} color={colors.brand} />
        </ScalePressable>
        <Text style={calStyles.monthLabel}>{monthLabel}</Text>
        <ScalePressable
          scaleTo={0.88}
          style={calStyles.arrowBtn}
          onPress={() => { tapLight(); onNextMonth(); }}
        >
          <View style={{ transform: [{ scaleX: -1 }] }}>
            <Icon name="back" size={20} color={colors.brand} />
          </View>
        </ScalePressable>
      </View>

      {/* Day name headers */}
      <View style={calStyles.dayHeaders}>
        {CAL_DAY_HEADERS.map((d, i) => (
          <View key={i} style={calStyles.dayHeaderCell}>
            <Text style={calStyles.dayHeaderText}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      <View style={calStyles.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={i} style={calStyles.cell} />;

          const iso = isoFromParts(year, month, day);
          const isToday = iso === todayStr;
          const isSelected = iso === selectedDate;
          const dayAppts = apptsByDay.get(day) ?? [];
          const hasAppts = dayAppts.length > 0;

          return (
            <Pressable
              key={i}
              style={({ pressed }) => [calStyles.cell, pressed && { opacity: 0.7 }]}
              onPress={() => { tapLight(); onSelectDate(iso); }}
            >
              <View
                style={[
                  calStyles.numWrap,
                  isToday && !isSelected && calStyles.numToday,
                  isSelected && calStyles.numSelected,
                ]}
              >
                <Text
                  style={[
                    calStyles.numText,
                    isToday && !isSelected && calStyles.numTodayText,
                    isSelected && calStyles.numSelectedText,
                  ]}
                >
                  {day}
                </Text>
              </View>
              <View style={calStyles.dots}>
                {dayAppts.slice(0, 3).map((a, j) => (
                  <View
                    key={j}
                    style={[calStyles.dot, { backgroundColor: TYPE_COLORS[a.type] }]}
                  />
                ))}
                {dayAppts.length > 3 && (
                  <Text style={calStyles.dotMore}>+{dayAppts.length - 3}</Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Day pill (week view) ────────────────────────────────────────────────────

function DayPill({
  iso, selected, hasAppts, onPress, t,
}: {
  iso: string; selected: boolean; hasAppts: boolean;
  onPress: () => void; t: (k: string) => string;
}) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const d = new Date(iso);
  const dayName = t(`agenda.dayAbbr.${DAY_ABBR_KEYS[d.getDay()]}`);
  return (
    <ScalePressable
      scaleTo={0.88}
      style={[styles.dayPill, selected && styles.dayPillSelected]}
      onPress={() => { tapLight(); onPress(); }}
    >
      <Text style={[styles.dayPillName, selected && styles.dayPillTextSelected]}>{dayName}</Text>
      <Text style={[styles.dayPillNum, selected && styles.dayPillTextSelected]}>{d.getDate()}</Text>
      {hasAppts && <View style={[styles.dayDot, selected && styles.dayDotSelected]} />}
    </ScalePressable>
  );
}

// ─── Stats pill ──────────────────────────────────────────────────────────────

function StatPill({ value, label, color }: { value: number; label: string; color: string }) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.statPill, { borderColor: color + "44", backgroundColor: color + "11" }]}>
      <Text style={[styles.statVal, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Bill single consultation modal ─────────────────────────────────────────

function BillConsultationModal({
  appt, visible, defaultAmount, onConfirm, onClose, t,
}: {
  appt: Appointment | null;
  visible: boolean;
  defaultAmount?: string;
  onConfirm: (amount: number) => void;
  onClose: () => void;
  t: (k: string) => string;
}) {
  const [amount, setAmount] = useState(defaultAmount ?? "200");
  const colors = useColors();
  const billStyles = makeBillStyles(colors);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setAmount(defaultAmount ?? "200");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible, defaultAmount]);

  if (!appt) return null;

  const confirm = () => {
    const n = parseFloat(amount.replace(",", "."));
    if (!isNaN(n) && n > 0) { tapSuccess(); onConfirm(n); }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={billStyles.overlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
          <Pressable style={billStyles.sheet} onPress={() => {}}>
            <Text style={billStyles.sheetTitle}>{t("agenda.paymentSheet")}</Text>
            <Text style={billStyles.sheetPatient}>{appt.patientName}</Text>
            <View style={[billStyles.typeBadge, { backgroundColor: TYPE_COLORS[appt.type] + "22" }]}>
              <Text style={[billStyles.typeText, { color: TYPE_COLORS[appt.type] }]}>
                {t(`agenda.types.${appt.type}`)}
              </Text>
            </View>
            <Text style={billStyles.sheetSub}>{t("agenda.paymentSheetSub")}</Text>
            <TextInput
              ref={inputRef}
              style={billStyles.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="200"
              placeholderTextColor={colors.textTertiary}
              selectTextOnFocus
            />
            <View style={billStyles.actions}>
              <Pressable style={billStyles.cancelBtn} onPress={onClose}>
                <Text style={billStyles.cancelText}>{t("cancel")}</Text>
              </Pressable>
              <Pressable
                style={[billStyles.confirmBtn, (!amount || parseFloat(amount) <= 0) && billStyles.confirmBtnDisabled]}
                onPress={confirm}
                disabled={!amount || parseFloat(amount) <= 0}
              >
                <Icon name="dollarSign" size={14} color={colors.textOnDark} />
                <Text style={billStyles.confirmText}>{t("agenda.recordPayment")}</Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ─── Bill whole day modal ────────────────────────────────────────────────────

function BillDayModal({
  appts, visible, onConfirm, onClose, t,
}: {
  appts: Appointment[];
  visible: boolean;
  onConfirm: (amountPerConsult: number) => void;
  onClose: () => void;
  t: (k: string) => string;
}) {
  const [amount, setAmount] = useState("200");
  const colors = useColors();
  const billStyles = makeBillStyles(colors);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setAmount("200");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible]);

  const total = (parseFloat(amount.replace(",", ".")) || 0) * appts.length;

  const confirm = () => {
    const n = parseFloat(amount.replace(",", "."));
    if (!isNaN(n) && n > 0) { tapSuccess(); onConfirm(n); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={billStyles.overlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
          <Pressable style={[billStyles.sheet, billStyles.sheetDay]} onPress={() => {}}>
            <Text style={billStyles.sheetTitle}>{t("agenda.billDay")}</Text>
            <Text style={billStyles.sheetSub}>{appts.length} {t("agenda.statsDone")}</Text>

            {/* Patient list preview */}
            <View style={billStyles.patientList}>
              {appts.map((a) => (
                <View key={a.id} style={billStyles.patientRow}>
                  <View style={[billStyles.patientDot, { backgroundColor: TYPE_COLORS[a.type] }]} />
                  <Text style={billStyles.patientName} numberOfLines={1}>{a.patientName}</Text>
                  <Text style={billStyles.patientType}>{t(`agenda.types.${a.type}`)}</Text>
                </View>
              ))}
            </View>

            <Text style={billStyles.sheetSub}>{t("agenda.paymentSheetSub")}</Text>
            <TextInput
              ref={inputRef}
              style={billStyles.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="200"
              placeholderTextColor={colors.textTertiary}
              selectTextOnFocus
            />

            {/* Total line */}
            <View style={billStyles.totalRow}>
              <Text style={billStyles.totalLabel}>Total</Text>
              <Text style={billStyles.totalAmount}>{total.toLocaleString("fr-MA")} MAD</Text>
            </View>

            <View style={billStyles.actions}>
              <Pressable style={billStyles.cancelBtn} onPress={onClose}>
                <Text style={billStyles.cancelText}>{t("cancel")}</Text>
              </Pressable>
              <Pressable
                style={[billStyles.confirmBtn, (!amount || parseFloat(amount) <= 0) && billStyles.confirmBtnDisabled]}
                onPress={confirm}
                disabled={!amount || parseFloat(amount) <= 0}
              >
                <Icon name="dollarSign" size={14} color={colors.textOnDark} />
                <Text style={billStyles.confirmText}>{t("agenda.recordPayment")} ({appts.length})</Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ─── Appointment card ────────────────────────────────────────────────────────

function ApptCard({
  appt, isActive, onPress, onToggleDone, onBill, onRemind, visitNum, isBirthday, t,
}: {
  appt: Appointment; isActive?: boolean;
  onPress: () => void; onToggleDone: () => void;
  onBill?: () => void;
  onRemind?: () => void;
  visitNum?: number;
  isBirthday?: boolean;
  t: (k: string) => string;
}) {
  const typeColor = TYPE_COLORS[appt.type];
  const statusColor = STATUS_COLORS[appt.status];
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const isDone = appt.status === "completed";

  // Pulsing dot for in-progress appointment
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isActive) { pulseAnim.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isActive]);

  const hasClinical =
    appt.consultationNote &&
    Object.values(appt.consultationNote).some((v) => v && v.trim().length > 0);

  return (
    <ScalePressable
      scaleTo={0.97}
      style={[
        styles.apptCard,
        isActive && styles.apptCardActive,
        isDone && styles.apptCardDone,
      ]}
      onPress={onPress}
    >
      <View style={[styles.apptAccent, { backgroundColor: isDone ? colors.border : typeColor }]} />
      <View style={styles.apptBody}>
        {isActive && (
          <View style={styles.inProgressBadge}>
            <Animated.View style={[styles.inProgressDot, { opacity: pulseAnim }]} />
            <Text style={styles.inProgressText}>{t("agenda.inProgress")}</Text>
          </View>
        )}
        <View style={styles.apptRow}>
          <View style={styles.apptTimeBox}>
            <Text style={[styles.apptTime, isDone && styles.textMuted]}>{appt.startTime}</Text>
            <Text style={[styles.apptTimeSep, isDone && styles.textMuted]}>–</Text>
            <Text style={[styles.apptTime, isDone && styles.textMuted]}>{appt.endTime}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.apptPatient, isDone && styles.textMuted]} numberOfLines={1}>
              {appt.patientName}
            </Text>
            <View style={styles.apptMeta}>
              <View style={[styles.apptTypeBadge, { backgroundColor: typeColor + "22" }]}>
                <Text style={[styles.apptTypeBadgeText, { color: isDone ? colors.textTertiary : typeColor }]}>
                  {t(`agenda.types.${appt.type}`)}
                </Text>
              </View>
              <View style={[styles.apptStatusBadge, { backgroundColor: statusColor + "22" }]}>
                <Text style={[styles.apptStatusBadgeText, { color: isDone ? colors.textTertiary : statusColor }]}>
                  {t(`agenda.statuses.${appt.status}`)}
                </Text>
              </View>
              {hasClinical && (
                <View style={styles.clinicalDot}>
                  <Icon name="clipboard" size={11} color={colors.success} />
                </View>
              )}
              {!!appt.recurringRuleId && (
                <View style={styles.clinicalDot}>
                  <Icon name="refresh" size={11} color={colors.brand} />
                </View>
              )}
              {isBirthday && (
                <View style={[styles.visitBadge, { backgroundColor: colors.gold + "22", borderColor: colors.gold + "55" }]}>
                  <Text style={[styles.visitBadgeText, { color: colors.gold }]}>🎂</Text>
                </View>
              )}
              {visitNum !== undefined && visitNum > 1 && (
                <View style={[styles.visitBadge, { backgroundColor: colors.brand + "18", borderColor: colors.brand + "44" }]}>
                  <Text style={[styles.visitBadgeText, { color: colors.brand }]}>#{visitNum}</Text>
                </View>
              )}
            </View>
          </View>
          {/* WhatsApp reminder — shown only for scheduled appointments with a phone */}
          {onRemind && !isDone && (
            <Pressable
              style={({ pressed }) => [styles.whatsappBtn, pressed && { opacity: 0.7 }]}
              onPress={(e) => { e.stopPropagation?.(); onRemind(); }}
              hitSlop={8}
            >
              <Icon name="messageCircle" size={14} color="#25D366" />
            </Pressable>
          )}
          <ScalePressable
            scaleTo={0.84}
            style={[styles.doneBtn, isDone && styles.doneBtnActive]}
            onPress={onToggleDone}
            hitSlop={10}
          >
            <Icon name="check" size={14} color={isDone ? colors.textOnDark : colors.textTertiary} />
          </ScalePressable>
          {/* Billing indicator — shown only on completed appointments */}
          {isDone && (
            appt.billedAt ? (
              <View style={styles.billedBadge}>
                <Icon name="dollarSign" size={11} color={colors.success} />
              </View>
            ) : (
              <Pressable style={styles.billBtn} onPress={onBill} hitSlop={8}>
                <Icon name="dollarSign" size={11} color={colors.textTertiary} />
              </Pressable>
            )
          )}
        </View>
        {appt.notes ? (
          <Text style={[styles.apptNotes, isDone && styles.textMuted]} numberOfLines={1}>
            {appt.notes}
          </Text>
        ) : null}
      </View>
    </ScalePressable>
  );
}

// ─── Time slot grid (week/day view) ─────────────────────────────────────────

const HOUR_HEIGHT = 64;
const GRID_START = 7;   // 07:00
const GRID_END   = 21;  // 21:00
const LABEL_W    = 48;
const HOURS      = Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i);

function timeToY(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h - GRID_START + m / 60) * HOUR_HEIGHT;
}

function TimeSlotGrid({
  appts, nowTime, isToday, onPress, t,
}: {
  appts: Appointment[];
  nowTime: string;
  isToday: boolean;
  onPress: (id: string) => void;
  t: (k: string) => string;
}) {
  const gridH = (GRID_END - GRID_START) * HOUR_HEIGHT;
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const nowY   = isToday ? timeToY(nowTime) : -1;
  const scrollRef = useRef<ScrollView>(null);

  // Scroll so the current time (or 08:00 for future days) is visible on open
  useEffect(() => {
    const targetY = nowY >= 0 ? Math.max(0, nowY - 100) : timeToY("08:00") * HOUR_HEIGHT / HOUR_HEIGHT;
    setTimeout(() => scrollRef.current?.scrollTo({ y: targetY, animated: false }), 80);
  }, []);

  return (
    <ScrollView
      ref={scrollRef}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ height: gridH + 32 }}
      style={styles.gridScroll}
    >
      <View style={{ height: gridH, flexDirection: "row" }}>
        {/* Hour labels + horizontal lines */}
        <View style={{ width: LABEL_W }}>
          {HOURS.map((h) => (
            <View key={h} style={{ height: HOUR_HEIGHT, justifyContent: "flex-start", paddingTop: 4 }}>
              <Text style={styles.hourLabel}>
                {String(h).padStart(2, "0")}:00
              </Text>
            </View>
          ))}
        </View>

        {/* Grid area */}
        <View style={{ flex: 1 }}>
          {/* Hour grid lines */}
          {HOURS.map((h) => (
            <View
              key={h}
              style={[styles.hourLine, { top: (h - GRID_START) * HOUR_HEIGHT }]}
            />
          ))}
          {/* Half-hour dotted lines */}
          {HOURS.map((h) => (
            <View
              key={`h${h}`}
              style={[styles.halfHourLine, { top: (h - GRID_START) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }]}
            />
          ))}

          {/* Appointment blocks */}
          {appts.map((appt) => {
            const top    = Math.max(0, timeToY(appt.startTime));
            const bottom = Math.min(gridH, timeToY(appt.endTime));
            const height = Math.max(bottom - top, 28);
            const color  = TYPE_COLORS[appt.type];
            const isDone = appt.status === "completed";
            return (
              <Pressable
                key={appt.id}
                style={({ pressed }) => [
                  styles.gridAppt,
                  {
                    top,
                    height,
                    backgroundColor: isDone ? colors.border : color + "dd",
                    borderLeftColor: isDone ? colors.textTertiary : color,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                onPress={() => onPress(appt.id)}
              >
                <Text style={styles.gridApptName} numberOfLines={1}>{appt.patientName}</Text>
                {height > 38 && (
                  <Text style={styles.gridApptTime}>
                    {appt.startTime}–{appt.endTime}
                  </Text>
                )}
              </Pressable>
            );
          })}

          {/* Now indicator */}
          {isToday && nowY >= 0 && nowY <= gridH && (
            <View style={[styles.nowLine, { top: nowY }]}>
              <View style={styles.nowDot} />
              <View style={styles.nowLineBar} />
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Selected-day subheader (used in month view) ─────────────────────────────

function DaySubheader({ iso, count, t }: { iso: string; count: number; t: (k: string) => string }) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const label = new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  });
  return (
    <View style={styles.daySubheader}>
      <Text style={styles.daySubheaderDate}>{label}</Text>
      {count > 0 && (
        <View style={styles.daySubheaderBadge}>
          <Text style={styles.daySubheaderBadgeText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

type AgendaView = "today" | "week" | "month";

export function AgendaScreen({ navigation }: any) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();
  const { appointments, patients, ordonnances, certificats, addAppointment, updateAppointment, doctorProfile } = useCabinet();
  const { billAppointment, bulkBillAppointments, lastBilledAmount } = useBilling();
  const locations = doctorProfile.locations ?? [];

  const [view, setView] = useState<AgendaView>("today");
  const [selectedDate, setSelectedDate] = useState(today());
  const [weekBase, setWeekBase] = useState(weekStart(today()));
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [billingAppt, setBillingAppt] = useState<Appointment | null>(null);
  const [bulkBillVisible, setBulkBillVisible] = useState(false);

  // ── Global search ─────────────────────────────────────────────────────────
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [historyPatient, setHistoryPatient] = useState<Patient | null>(null);
  const [historyTab, setHistoryTab] = useState<HistoryTab>("all");
  const [historyVisible, setHistoryVisible] = useState(false);

  const handleOpenPatient = useCallback(
    (patient: Patient, tab: HistoryTab = "all") => {
      setHistoryPatient(patient);
      setHistoryTab(tab);
      setGlobalSearchOpen(false);
      setHistoryVisible(true);
    },
    [],
  );

  const [nowTime, setNowTime] = useState(nowHHMM);
  useEffect(() => {
    const iv = setInterval(() => setNowTime(nowHHMM()), 60_000);
    return () => clearInterval(iv);
  }, []);

  const todayStr = today();

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekBase, i)),
    [weekBase]
  );

  const filterByLocation = useCallback(
    (appts: Appointment[]) =>
      locationFilter ? appts.filter((a) => a.locationId === locationFilter) : appts,
    [locationFilter],
  );

  const todayAppts = useMemo(
    () =>
      filterByLocation(
        appointments
          .filter((a) => a.date === todayStr)
          .sort((a, b) => a.startTime.localeCompare(b.startTime)),
      ),
    [appointments, todayStr, filterByLocation]
  );

  const dayAppts = useMemo(
    () =>
      filterByLocation(
        appointments
          .filter((a) => a.date === selectedDate)
          .sort((a, b) => a.startTime.localeCompare(b.startTime)),
      ),
    [appointments, selectedDate, filterByLocation]
  );

  const displayAppts = view === "today" ? todayAppts : dayAppts;

  // ── Visit counter: map each appointment.id → sequential visit number for that patient ──
  const visitNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    const countByPatient = new Map<string, number>();
    [...appointments]
      .filter(a => a.status !== "cancelled" && a.status !== "no_show")
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
      .forEach(appt => {
        const key = appt.patientId ?? appt.patientName;
        const n = (countByPatient.get(key) ?? 0) + 1;
        countByPatient.set(key, n);
        map.set(appt.id, n);
      });
    return map;
  }, [appointments]);

  // ── Birthday patients for today ──
  const birthdayPatientIds = useMemo(() => {
    const now = new Date();
    const todayMD = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return new Set(
      patients
        .filter(p => p.dateOfBirth?.slice(5) === todayMD)
        .map(p => p.id)
    );
  }, [patients]);

  const isBirthday = useCallback(
    (appt: Appointment) =>
      !!(appt.patientId && birthdayPatientIds.has(appt.patientId)),
    [birthdayPatientIds],
  );

  // Upcoming follow-ups in the next 14 days (sorted soonest first)
  const upcomingFollowUps = useMemo(() => {
    const now = todayIso();
    const cutoff = addDays(now, 14);
    return appointments
      .filter((a) => a.followUpDate && a.followUpDate >= now && a.followUpDate <= cutoff)
      .sort((a, b) => a.followUpDate!.localeCompare(b.followUpDate!));
  }, [appointments]);

  const todayStats = useMemo(
    () => ({
      total: todayAppts.length,
      done: todayAppts.filter((a) => a.status === "completed").length,
      waiting: todayAppts.filter((a) => a.status === "scheduled").length,
    }),
    [todayAppts]
  );

  // Completed today appointments that haven't been billed yet
  const unbilledCompleted = useMemo(
    () => todayAppts.filter((a) => a.status === "completed" && !a.billedAt),
    [todayAppts],
  );

  // Bill a single appointment
  const handleBill = useCallback(
    (amount: number) => {
      if (!billingAppt) return;
      billAppointment(billingAppt, amount);
      setBillingAppt(null);
    },
    [billingAppt, billAppointment],
  );

  // Bill all unbilled completed appointments of the day at a uniform rate
  const handleBulkBill = useCallback(
    (amountPerConsult: number) => {
      bulkBillAppointments(unbilledCompleted, amountPerConsult);
      setBulkBillVisible(false);
    },
    [unbilledCompleted, bulkBillAppointments],
  );

  // Phone lookup map: patientId → phone
  const patientPhoneMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of patients) {
      if (p.phone) map[p.id] = p.phone;
    }
    return map;
  }, [patients]);

  const handleRemind = useCallback(
    (appt: Appointment) => {
      tapLight();
      const phone = appt.patientId ? patientPhoneMap[appt.patientId] : undefined;
      if (!phone) return;
      // Format date in French: "lundi 23 mai à 14h30"
      const [year, month, day] = appt.date.split("-").map(Number);
      const dateObj = new Date(year, month - 1, day);
      const dateFr = dateObj.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
      const time = appt.startTime.replace(":", "h");
      const doctorName = doctorProfile.fullName ?? "votre médecin";
      const message =
        `Bonjour ${appt.patientName}, nous vous rappelons votre rendez-vous le ${dateFr} à ${time} – Cabinet Dr. ${doctorName}. À bientôt ! 👋`;
      Linking.openURL(buildWhatsAppUrl(phone, message));
    },
    [patientPhoneMap, doctorProfile],
  );

  const isInProgress = useCallback(
    (appt: Appointment) =>
      appt.date === todayStr &&
      appt.startTime <= nowTime &&
      nowTime <= appt.endTime,
    [todayStr, nowTime]
  );

  const hasAppts = useCallback(
    (iso: string) => appointments.some((a) => a.date === iso),
    [appointments]
  );

  const openAdd = () => { setEditingAppt(null); setModalVisible(true); };

  const handleSave = (appt: Appointment) => {
    editingAppt ? updateAppointment(appt) : addAppointment(appt);
    // Sync follow-up notification
    if (appt.followUpDate) {
      scheduleFollowUpNotification(
        appt.id,
        appt.patientName,
        appt.followUpDate,
        appt.type,
      );
    } else {
      cancelFollowUpNotification(appt.id);
    }
  };

  // Switch to month view — sync calYear/calMonth from selectedDate
  const switchView = (v: AgendaView) => {
    if (v === "month") {
      const [y, m] = selectedDate.split("-").map(Number);
      setCalYear(y);
      setCalMonth(m - 1);
    }
    setView(v);
  };

  const goToPrevMonth = () => {
    let m = calMonth - 1, y = calYear;
    if (m < 0) { m = 11; y--; }
    setCalYear(y); setCalMonth(m);
    const newPrefix = `${y}-${String(m + 1).padStart(2, "0")}`;
    if (!selectedDate.startsWith(newPrefix)) {
      // Land on today if it falls in the new month, else the 1st
      setSelectedDate(todayStr.startsWith(newPrefix) ? todayStr : `${newPrefix}-01`);
    }
  };

  const goToNextMonth = () => {
    let m = calMonth + 1, y = calYear;
    if (m > 11) { m = 0; y++; }
    setCalYear(y); setCalMonth(m);
    const newPrefix = `${y}-${String(m + 1).padStart(2, "0")}`;
    if (!selectedDate.startsWith(newPrefix)) {
      setSelectedDate(todayStr.startsWith(newPrefix) ? todayStr : `${newPrefix}-01`);
    }
  };

  const isToday = selectedDate === todayStr;

  // Header subtitle
  const headerSub =
    view === "today" || isToday
      ? t("agenda.today")
      : view === "month"
      ? new Date(calYear, calMonth, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
      : formatDateShort(selectedDate);

  // Which date to pre-fill in modal
  const modalDate =
    view === "today" ? todayStr :
    view === "week" ? selectedDate :
    selectedDate;

  return (
    <SafeScreen>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t("agenda.title")}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{headerSub}</Text>
        </View>
        <View style={styles.headerActions}>
          <ScalePressable
            scaleTo={0.90}
            style={styles.searchBtn}
            onPress={() => { tapLight(); setGlobalSearchOpen(true); }}
          >
            <Icon name="search" size={18} color={colors.brand} />
          </ScalePressable>
          <ScalePressable
            scaleTo={0.90}
            style={styles.addBtn}
            onPress={() => { tapLight(); openAdd(); }}
          >
            <Icon name="add" size={20} color={colors.textOnDark} />
          </ScalePressable>
        </View>
      </View>

      {/* ── View toggle ── */}
      <View style={styles.viewToggle}>
        <View style={styles.toggleTrack}>
        {([
          { key: "today" as AgendaView, label: t("agenda.todayView"), icon: "calendar" as const },
          { key: "week"  as AgendaView, label: t("agenda.weekView"),  icon: "calendarPlus" as const },
          { key: "month" as AgendaView, label: t("agenda.monthView"), icon: "barChart" as const },
        ] as const).map(({ key, label, icon }) => (
          <Pressable
            key={key}
            style={({ pressed }) => [
              styles.toggleBtn,
              view === key && styles.toggleBtnActive,
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => { tapLight(); switchView(key); }}
          >
            <Icon name={icon} size={13} color={view === key ? colors.brand : colors.textTertiary} />
            <Text style={[styles.toggleBtnText, view === key && styles.toggleBtnTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
        </View>
      </View>

      {/* ── Location filter strip (only when multiple locations configured) ── */}
      {locations.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.locFilterRow}
        >
          <Pressable
            style={[styles.locChip, !locationFilter && styles.locChipActive]}
            onPress={() => setLocationFilter(null)}
          >
            <Text style={[styles.locChipText, !locationFilter && styles.locChipTextActive]}>
              {t("locations.allLocations")}
            </Text>
          </Pressable>
          {locations.map((loc) => {
            const active = locationFilter === loc.id;
            const dotColor = loc.color || colors.brand;
            return (
              <Pressable
                key={loc.id}
                style={[styles.locChip, active && { backgroundColor: dotColor + "22", borderColor: dotColor }]}
                onPress={() => setLocationFilter(active ? null : loc.id)}
              >
                <View style={[styles.locDot, { backgroundColor: dotColor }]} />
                <Text style={[styles.locChipText, active && { color: dotColor, fontWeight: "700" }]}>
                  {loc.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* ── Today stats bar ── */}
      {view === "today" && todayAppts.length > 0 && (
        <View style={styles.statsBar}>
          <StatPill value={todayStats.total}   label={t("agenda.statsTotal")}   color={colors.brand} />
          <StatPill value={todayStats.done}    label={t("agenda.statsDone")}    color={colors.success} />
          <StatPill value={todayStats.waiting} label={t("agenda.statsWaiting")} color={colors.warning} />
        </View>
      )}

      {/* ── Bulk billing button — visible when completed unbilled appointments exist ── */}
      {view === "today" && unbilledCompleted.length > 0 && (
        <ScalePressable
          scaleTo={0.96}
          style={styles.billDayBtn}
          onPress={() => { tapLight(); setBulkBillVisible(true); }}
        >
          <Icon name="dollarSign" size={14} color={colors.textOnDark} />
          <Text style={styles.billDayBtnText}>
            {t("agenda.billDay")} · {unbilledCompleted.length}
          </Text>
        </ScalePressable>
      )}

      {/* ── Upcoming follow-ups banner (next 14 days) ── */}
      {upcomingFollowUps.length > 0 && (
        <View style={styles.followUpBanner}>
          <View style={styles.followUpBannerHeader}>
            <Icon name="heartPulse" size={13} color={colors.gold} />
            <Text style={styles.followUpBannerTitle}>
              Suivis à venir · {upcomingFollowUps.length}
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.followUpBannerScroll}>
            {upcomingFollowUps.map((appt) => {
              const today = todayIso();
              const daysLeft = Math.round(
                (new Date(appt.followUpDate! + "T12:00:00").getTime() - new Date(today + "T12:00:00").getTime())
                / (1000 * 60 * 60 * 24)
              );
              const isToday = daysLeft === 0;
              return (
                <Pressable
                  key={appt.id}
                  style={[styles.followUpCard, isToday && styles.followUpCardToday]}
                  onPress={() => { tapLight(); setEditingAppt(appt); setModalVisible(true); }}
                >
                  <Text style={[styles.followUpCardName]} numberOfLines={1}>{appt.patientName}</Text>
                  <Text style={[styles.followUpCardDate, isToday && { color: colors.gold }]}>
                    {isToday ? "Aujourd'hui" : daysLeft === 1 ? "Demain" : `Dans ${daysLeft}j`}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Week navigator ── */}
      {view === "week" && (
        <View style={styles.weekNav}>
          <ScalePressable
            scaleTo={0.84}
            style={styles.weekArrow}
            onPress={() => { tapLight(); setWeekBase(addDays(weekBase, -7)); }}
          >
            <Icon name="back" size={20} color={colors.brand} />
          </ScalePressable>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekPills}>
            {weekDays.map((iso) => (
              <DayPill
                key={iso}
                iso={iso}
                selected={iso === selectedDate}
                hasAppts={hasAppts(iso)}
                onPress={() => setSelectedDate(iso)}
                t={t}
              />
            ))}
          </ScrollView>
          <ScalePressable
            scaleTo={0.84}
            style={styles.weekArrow}
            onPress={() => { tapLight(); setWeekBase(addDays(weekBase, 7)); }}
          >
            <View style={{ transform: [{ scaleX: -1 }] }}>
              <Icon name="back" size={20} color={colors.brand} />
            </View>
          </ScalePressable>
        </View>
      )}

      {/* ── Month calendar + selected-day list ── */}
      {view === "month" ? (
        <View style={{ flex: 1 }}>
          <MonthCalendar
            year={calYear}
            month={calMonth}
            selectedDate={selectedDate}
            todayStr={todayStr}
            appointments={appointments}
            onSelectDate={setSelectedDate}
            onPrevMonth={goToPrevMonth}
            onNextMonth={goToNextMonth}
          />
          <DaySubheader iso={selectedDate} count={dayAppts.length} t={t} />
          {dayAppts.length === 0 ? (
            <View style={styles.monthEmpty}>
              <Text style={styles.monthEmptyText}>{t("agenda.noAppointments")}</Text>
              <ScalePressable scaleTo={0.95} style={styles.monthEmptyBtn} onPress={() => { tapLight(); openAdd(); }}>
                <Icon name="add" size={14} color={colors.textOnDark} />
                <Text style={styles.monthEmptyBtnText}>{t("agenda.addAppointment")}</Text>
              </ScalePressable>
            </View>
          ) : (
            <FlatList
              data={dayAppts}
              keyExtractor={(a) => a.id}
              contentContainerStyle={styles.list}
              keyboardDismissMode="on-drag"
              renderItem={({ item }) => (
                <ApptCard
                  appt={item}
                  isActive={isInProgress(item)}
                  visitNum={visitNumberMap.get(item.id)}
                  isBirthday={isBirthday(item)}
                  onPress={() => navigation.navigate("AppointmentDetail", { appointmentId: item.id })}
                  onToggleDone={() => {
                    tapLight();
                    updateAppointment({
                      ...item,
                      status: item.status === "completed" ? "scheduled" : "completed",
                    });
                  }}
                  onBill={() => setBillingAppt(item)}
                  onRemind={
                    item.status === "scheduled" && item.patientId && patientPhoneMap[item.patientId]
                      ? () => handleRemind(item)
                      : undefined
                  }
                  t={t}
                />
              )}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      ) : view === "week" ? (
        /* ── Week: time-slot grid ── */
        <TimeSlotGrid
          appts={dayAppts}
          nowTime={nowTime}
          isToday={selectedDate === todayStr}
          onPress={(id) => navigation.navigate("AppointmentDetail", { appointmentId: id })}
          t={t}
        />
      ) : (
        /* ── Today list ── */
        displayAppts.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Icon name="calendarPlus" size={32} color={colors.brand} />
            </View>
            <Text style={styles.emptyTitle}>{t("agenda.noAppointmentsToday")}</Text>
            <Text style={styles.emptyHint}>{t("agenda.addFirst")}</Text>
            <ScalePressable
              scaleTo={0.95}
              style={styles.emptyAddBtn}
              onPress={() => { tapLight(); openAdd(); }}
            >
              <Icon name="add" size={16} color={colors.textOnDark} />
              <Text style={styles.emptyAddBtnText}>{t("agenda.addAppointment")}</Text>
            </ScalePressable>
          </View>
        ) : (
          <FlatList
            data={displayAppts}
            keyExtractor={(a) => a.id}
            contentContainerStyle={styles.list}
            keyboardDismissMode="on-drag"
            renderItem={({ item }) => (
              <ApptCard
                appt={item}
                isActive={isInProgress(item)}
                visitNum={visitNumberMap.get(item.id)}
                isBirthday={isBirthday(item)}
                onPress={() => navigation.navigate("AppointmentDetail", { appointmentId: item.id })}
                onToggleDone={() => {
                  tapLight();
                  updateAppointment({
                    ...item,
                    status: item.status === "completed" ? "scheduled" : "completed",
                  });
                }}
                onBill={() => setBillingAppt(item)}
                onRemind={
                  item.status === "scheduled" && item.patientId && patientPhoneMap[item.patientId]
                    ? () => handleRemind(item)
                    : undefined
                }
                t={t}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        )
      )}

      {/* Per-appointment billing modal */}
      <BillConsultationModal
        appt={billingAppt}
        visible={!!billingAppt}
        defaultAmount={billingAppt ? lastBilledAmount(billingAppt.patientId, billingAppt.patientName) : "200"}
        onConfirm={handleBill}
        onClose={() => setBillingAppt(null)}
        t={t}
      />

      {/* Bulk billing modal */}
      <BillDayModal
        appts={unbilledCompleted}
        visible={bulkBillVisible}
        onConfirm={handleBulkBill}
        onClose={() => setBulkBillVisible(false)}
        t={t}
      />

      <AppointmentModal
        visible={modalVisible}
        initial={editingAppt}
        selectedDate={modalDate}
        patients={patients}
        locations={locations}
        onSave={handleSave}
        onClose={() => setModalVisible(false)}
        t={t}
      />

      {/* ── Global search ── */}
      <GlobalSearchModal
        visible={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
        patients={patients}
        appointments={appointments}
        ordonnances={ordonnances}
        certificats={certificats}
        t={t}
        onOpenPatient={handleOpenPatient}
        onOpenAppointment={(id) => {
          setGlobalSearchOpen(false);
          navigation.navigate("AppointmentDetail", { appointmentId: id });
        }}
      />

      {/* Patient history (opened when patient/ordo/cert hit is tapped from search) */}
      {historyPatient && (
        <PatientHistoryModal
          visible={historyVisible}
          patient={historyPatient}
          appointments={appointments}
          ordonnances={ordonnances}
          certificats={certificats}
          onClose={() => setHistoryVisible(false)}
          initialTab={historyTab}
          t={t}
        />
      )}
    </SafeScreen>
  );
}

// ─── Calendar styles ──────────────────────────────────────────────────────────

const makeCalStyles = (colors: ColorPalette) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  arrowBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.brandSoft,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    textTransform: "capitalize",
  },
  dayHeaders: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    marginBottom: 2,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  dayHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.md,
  },
  cell: {
    width: "14.285714%",
    alignItems: "center",
    paddingVertical: 5,
  },
  numWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  numToday: {
    backgroundColor: colors.brandSoft,
    borderWidth: 1.5,
    borderColor: colors.brand,
  },
  numSelected: {
    backgroundColor: colors.brand,
  },
  numText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  numTodayText: {
    color: colors.brand,
    fontWeight: "700",
  },
  numSelectedText: {
    color: colors.textOnDark,
    fontWeight: "700",
  },
  dots: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
    height: 6,
    alignItems: "center",
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  dotMore: {
    fontSize: 7,
    fontWeight: "800",
    color: colors.textTertiary,
    lineHeight: 6,
  },
});

// ─── Screen styles ────────────────────────────────────────────────────────────

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.5 },
  headerSub: { ...typography.caption, color: colors.brand, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  searchBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.brandSoft,
    borderWidth: 1, borderColor: colors.brand + "33",
    alignItems: "center", justifyContent: "center",
  },
  addBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.brand, alignItems: "center", justifyContent: "center",
    ...shadows.card,
  },

  viewToggle: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toggleTrack: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: 3,
  },
  toggleBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 4, paddingVertical: 9,
    borderRadius: radii.sm,
  },
  toggleBtnActive: {
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleBtnText: { fontSize: 11, fontWeight: "600", color: colors.textTertiary },
  toggleBtnTextActive: { color: colors.brand, fontWeight: "700" },

  statsBar: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    gap: spacing.sm, backgroundColor: colors.bg,
  },
  statPill: {
    flex: 1, alignItems: "center",
    paddingVertical: spacing.md, borderRadius: radii.lg, borderWidth: 1,
  },
  statVal: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontWeight: "700", marginTop: 2, textTransform: "uppercase", letterSpacing: 0.3 },

  weekNav: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  weekArrow: { width: 36, alignItems: "center", justifyContent: "center" },
  weekPills: { flexDirection: "row", gap: spacing.xs, paddingHorizontal: 2 },
  dayPill: { width: 40, alignItems: "center", paddingVertical: spacing.xs, borderRadius: radii.sm },
  dayPillSelected: { backgroundColor: colors.brand },
  dayPillName: { fontSize: 10, fontWeight: "600", color: colors.textTertiary, textTransform: "uppercase" },
  dayPillNum: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, marginTop: 1 },
  dayPillTextSelected: { color: colors.textOnDark },
  dayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.brand, marginTop: 2 },
  dayDotSelected: { backgroundColor: "rgba(255,255,255,0.8)" },

  // Day subheader (month view)
  daySubheader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
    gap: spacing.sm,
  },
  daySubheaderDate: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "capitalize",
    flex: 1,
  },
  daySubheaderBadge: {
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  daySubheaderBadgeText: { fontSize: 11, fontWeight: "700", color: colors.brand },

  // Month empty state (compact, inline)
  monthEmpty: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  monthEmptyText: { fontSize: 13, color: colors.textTertiary },
  monthEmptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  monthEmptyBtnText: { fontSize: 13, fontWeight: "700", color: colors.textOnDark },

  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  // Card
  apptCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border,
    overflow: "hidden",
    ...shadows.card,
  },
  apptCardActive: { borderColor: colors.brand, borderWidth: 2 },
  apptCardDone: { opacity: 0.55 },
  apptCardPressed: { opacity: 0.82 },
  apptAccent: { width: 4 },
  apptBody: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  inProgressBadge: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: spacing.xs },
  inProgressDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  inProgressText: { fontSize: 10, fontWeight: "700", color: colors.success, letterSpacing: 0.5 },
  apptRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  apptTimeBox: { alignItems: "center", minWidth: 46 },
  apptTime: { fontSize: 12, fontWeight: "700", color: colors.textPrimary },
  apptTimeSep: { fontSize: 10, color: colors.textTertiary },
  apptPatient: { ...typography.body, color: colors.textPrimary, fontWeight: "700" },
  apptMeta: { flexDirection: "row", gap: spacing.xs, marginTop: 3, flexWrap: "wrap", alignItems: "center" },
  apptTypeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radii.pill },
  apptTypeBadgeText: { fontSize: 10, fontWeight: "700" },
  apptStatusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radii.pill },
  apptStatusBadgeText: { fontSize: 10, fontWeight: "700" },
  clinicalDot: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.successSoft,
    alignItems: "center", justifyContent: "center",
  },
  apptNotes: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 16 },
  textMuted: { color: colors.textTertiary },
  visitBadge: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: radii.pill, borderWidth: 1,
  },
  visitBadgeText: { fontSize: 10, fontWeight: "700" },

  whatsappBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1.5, borderColor: "#25D36633",
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#25D36611",
    marginLeft: spacing.xs,
  },
  doneBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.bg,
    marginLeft: spacing.xs,
  },
  doneBtnActive: { backgroundColor: colors.success, borderColor: colors.success },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xxl, gap: spacing.md },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.brandSoft,
    alignItems: "center", justifyContent: "center",
    marginBottom: spacing.sm,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.textPrimary, textAlign: "center" },
  emptyHint: { fontSize: 13, color: colors.textTertiary, textAlign: "center", lineHeight: 20 },
  emptyAddBtn: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.xl, paddingVertical: 14,
    borderRadius: radii.lg, marginTop: spacing.sm,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  emptyAddBtnText: { color: colors.textOnDark, fontWeight: "700", fontSize: 15, letterSpacing: 0.2 },

  // ── Time slot grid ────────────────────────────────────────────────────────
  gridScroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  hourLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textTertiary,
    textAlign: "right",
    paddingRight: 8,
  },
  hourLine: {
    position: "absolute",
    left: 0, right: 0, height: 1,
    backgroundColor: colors.border,
  },
  halfHourLine: {
    position: "absolute",
    left: 0, right: 0, height: 1,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderStyle: "dashed",
    opacity: 0.5,
  },
  gridAppt: {
    position: "absolute",
    left: 6, right: 8,
    borderRadius: radii.sm,
    borderLeftWidth: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    overflow: "hidden",
  },
  gridApptName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  gridApptTime: {
    fontSize: 9,
    color: "rgba(255,255,255,0.85)",
    marginTop: 1,
  },
  nowLine: {
    position: "absolute",
    left: 0, right: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  nowDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.danger, marginLeft: -4,
  },
  nowLineBar: {
    flex: 1, height: 1.5, backgroundColor: colors.danger,
  },

  // ── Location filter strip ─────────────────────────────────────────────────
  locFilterRow: {
    flexDirection: "row", paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm, gap: spacing.xs,
  },
  locChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radii.pill, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  locChipActive: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
  locChipText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  locChipTextActive: { color: colors.brand },
  locDot: { width: 7, height: 7, borderRadius: 3.5 },

  // ── Billing ──
  billDayBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    paddingVertical: 13, borderRadius: radii.lg,
    backgroundColor: colors.success,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 10,
    elevation: 4,
  },
  billDayBtnText: { color: colors.textOnDark, fontWeight: "700", fontSize: 14, letterSpacing: 0.2 },

  // Follow-up banner
  followUpBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.gold + "11",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gold + "33",
    paddingTop: spacing.sm,
    overflow: "hidden",
  },
  followUpBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  followUpBannerTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  followUpBannerScroll: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  followUpCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gold + "44",
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 100,
    gap: 2,
  },
  followUpCardToday: {
    backgroundColor: colors.gold + "22",
    borderColor: colors.gold,
  },
  followUpCardName: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textPrimary,
    maxWidth: 120,
  },
  followUpCardDate: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },

  // Bill / billed button on card
  billBtn: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
    marginLeft: 4,
  },
  billedBadge: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1, borderColor: colors.success + "55",
    backgroundColor: colors.success + "11",
    alignItems: "center", justifyContent: "center",
    marginLeft: 4,
  },
});

// ── Bill modal styles ─────────────────────────────────────────────────────────

const makeBillStyles = (colors: ColorPalette) => StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end", alignItems: "center",
  },
  sheet: {
    width: "100%", backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg,
    padding: spacing.xl, paddingBottom: spacing.xxl,
    ...shadows.card,
  },
  sheetDay: { maxHeight: "80%" },
  sheetTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.xs },
  sheetPatient: { fontSize: 18, fontWeight: "700", color: colors.textPrimary, marginBottom: spacing.sm },
  sheetSub: { ...typography.caption, color: colors.textSecondary, marginBottom: 6, marginTop: spacing.md, fontWeight: "600" },
  typeBadge: { alignSelf: "flex-start", borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 3, marginBottom: spacing.sm },
  typeText: { fontSize: 11, fontWeight: "600" },
  amountInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 24, fontWeight: "700", color: colors.textPrimary,
    backgroundColor: colors.bg, textAlign: "center",
    letterSpacing: 1,
  },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  cancelText: { color: colors.textSecondary, fontWeight: "600" },
  confirmBtn: {
    flex: 2, flexDirection: "row", gap: 6,
    paddingVertical: 13, borderRadius: radii.md,
    backgroundColor: colors.success,
    alignItems: "center", justifyContent: "center",
  },
  confirmBtnDisabled: { backgroundColor: colors.borderStrong },
  confirmText: { color: colors.textOnDark, fontWeight: "700", fontSize: 14 },

  // Day modal extras
  patientList: { marginTop: spacing.sm, gap: 6 },
  patientRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  patientDot: { width: 7, height: 7, borderRadius: 3.5 },
  patientName: { flex: 1, fontSize: 14, color: colors.textPrimary, fontWeight: "600" },
  patientType: { fontSize: 11, color: colors.textSecondary },
  totalRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: spacing.md, paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  totalLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: "600" },
  totalAmount: { fontSize: 18, fontWeight: "800", color: colors.brand },
});
