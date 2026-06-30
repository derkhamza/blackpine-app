import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScalePressable } from "../components/ScalePressable";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { tapLight } from "../lib/haptics";
import { useCabinet } from "../lib/CabinetContext";
import { useApp } from "../lib/AppContext";
import { radii, shadows, spacing, typography, ColorPalette } from "../lib/theme";
import { useColors } from "../lib/ThemeContext";
import { useT } from "../lib/useT";
import { SafeScreen } from "../components/SafeScreen";
import { Icon } from "../lib/icons";
import { formatMAD } from "../lib/format";
import { todayIso, nowHHMM } from "../lib/utils";
import { AppointmentModal, TYPE_COLORS } from "../components/AppointmentModal";
import { RevenueSparkline } from "../components/RevenueSparkline";
import {
  setPendingFinancesSegment,
  setPendingFilter,
  setPendingOpenAdd,
} from "../lib/navigationState";
import { Appointment } from "../lib/cabinetTypes";
import { updateWidgetAppts } from "../lib/widgetBridge";

// ── Date helpers ────────────────────────────────────────────────────────────

function thisMonthPrefix(): string {
  return new Date().toISOString().slice(0, 7);
}

function thisWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun … 6=Sat
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    start: mon.toISOString().slice(0, 10),
    end: sun.toISOString().slice(0, 10),
  };
}

function formatWeekRange(start: string, end: string): string {
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  const sd = s.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const ed = e.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  return `${sd} – ${ed}`;
}

function formatTodayFull(): string {
  return new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function formatDateShort(iso: string): string {
  // HomeScreen only needs DD/MM (no year) for the "next upcoming" appointment
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function daysInCurrentMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

function currentDayOfMonth(): number {
  return new Date().getDate();
}

/** Returns days until the next occurrence of MM-DD */
function daysUntilAnnual(month: number, day: number): number {
  const now = new Date();
  const thisYear = new Date(now.getFullYear(), month - 1, day);
  const nextYear = new Date(now.getFullYear() + 1, month - 1, day);
  const target = thisYear > now ? thisYear : nextYear;
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function minutesBetween(a: string, b: string): number {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return (bh * 60 + bm) - (ah * 60 + am);
}

/** Mon–(today − 7 days) of last week — for a fair same-weekday comparison */
function lastWeekSamePeriodRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const lastMon = new Date(now);
  lastMon.setDate(now.getDate() + diffToMon - 7);
  const lastSameDay = new Date(now);
  lastSameDay.setDate(now.getDate() - 7);
  return {
    start: lastMon.toISOString().slice(0, 10),
    end:   lastSameDay.toISOString().slice(0, 10),
  };
}

// ── Appointment row ─────────────────────────────────────────────────────────

function ApptRow({
  appt,
  typeLabel,
  isBirthday,
  onPress,
}: {
  appt: Appointment;
  typeLabel: string;
  isBirthday?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const typeColor = TYPE_COLORS[appt.type];
  const isPast =
    appt.date < todayIso() ||
    (appt.date === todayIso() && appt.endTime < new Date().toTimeString().slice(0, 5));

  return (
    <ScalePressable
      scaleTo={0.97}
      style={styles.apptRow}
      onPress={() => { tapLight(); onPress(); }}
    >
      <Text style={[styles.apptTime, isPast && { color: colors.textTertiary }]}>
        {appt.startTime}
      </Text>
      <View style={[styles.apptDot, { backgroundColor: typeColor }]} />
      <View style={styles.apptInfo}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Text style={[styles.apptName, isPast && { color: colors.textTertiary }]} numberOfLines={1}>
            {appt.patientName}
          </Text>
          {isBirthday && <Text style={{ fontSize: 13 }}>🎂</Text>}
        </View>
        <Text style={styles.apptType}>{typeLabel}</Text>
      </View>
      <Text style={styles.apptChevron}>›</Text>
    </ScalePressable>
  );
}

// ── Quick action button ─────────────────────────────────────────────────────

function QuickBtn({
  icon,
  label,
  color,
  onPress,
}: {
  icon: any;
  label: string;
  color: string;
  onPress: () => void;
}) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <ScalePressable
      scaleTo={0.92}
      style={styles.quickBtn}
      onPress={() => { tapLight(); onPress(); }}
    >
      <View style={[styles.quickBtnIcon, { backgroundColor: color + "18" }]}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.quickBtnLabel, { color: colors.textSecondary }]}>{label}</Text>
    </ScalePressable>
  );
}

// ── Stat card ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
  format,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  format?: (n: number) => string;
}) {
  const styles = makeStyles(useColors());
  const valStyle = [styles.statValue, accent ? { color: accent } : null];
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      {typeof value === "number"
        ? <AnimatedNumber value={value} format={format} style={valStyle} />
        : <Text style={valStyle}>{value}</Text>}
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────

export function HomeScreen({ navigation }: any) {
  const colors = useColors();
const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();
  const { transactions, result, trialDaysLeft, syncStatus, isAuthenticated, retrySync, isDemoMode, clearDemoData } = useApp();
  const { appointments, patients, doctorProfile, addAppointment, reload } = useCabinet();

  const [apptModalOpen, setApptModalOpen] = useState(false);
  const [modalPrefilledPatientId, setModalPrefilledPatientId] = useState<string | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const today = todayIso();
  const monthPrefix = thisMonthPrefix();

  // Today's scheduled/completed appointments, sorted by start time
  const todayAppts = useMemo(() =>
    appointments
      .filter(a => a.date === today && a.status !== "cancelled" && a.status !== "no_show")
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [appointments, today]
  );

  // Next upcoming appointment (future, scheduled) — shown when today is free
  const nextAppt = useMemo(() =>
    appointments
      .filter(a => a.date > today && a.status === "scheduled")
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))[0],
    [appointments, today]
  );

  // Follow-up reminders due today or overdue — excludes patients who already have
  // a new appointment booked on or after their follow-up date (i.e. already handled)
  const followUpsDue = useMemo(() => {
    return appointments
      .filter(a => {
        if (!a.followUpDate || a.followUpDate > today) return false;
        // "resolved" = same patient has any non-cancelled appointment on/after the follow-up date
        const key = a.patientId ?? a.patientName;
        const resolved = appointments.some(b => {
          if (b.id === a.id) return false;
          if (b.status === "cancelled" || b.status === "no_show") return false;
          if (b.date < a.followUpDate!) return false;
          return (b.patientId ?? b.patientName) === key;
        });
        return !resolved;
      })
      .sort((a, b) => (a.followUpDate ?? "").localeCompare(b.followUpDate ?? "")); // oldest first = most urgent
  }, [appointments, today]);

  // Unbilled appointments — completed in the last 60 days without a recorded payment
  const unbilledAppts = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    const cutoffIso = cutoff.toISOString().slice(0, 10);
    return appointments
      .filter(a => a.status === "completed" && !a.billedAt && a.date >= cutoffIso)
      .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
  }, [appointments]);
  const unbilledCount = unbilledAppts.length;

  /** Average fee inferred from recent consultation-category RECETTE transactions */
  const avgConsultationFee = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffIso = cutoff.toISOString().slice(0, 10);
    const recent = transactions.filter(
      tx => tx.type === "RECETTE" && tx.category === "consultation" &&
            tx.date >= cutoffIso && tx.amount > 0,
    );
    if (recent.length === 0) return null;
    return Math.round(recent.reduce((sum, tx) => sum + tx.amount, 0) / recent.length);
  }, [transactions]);

  // Ce mois stats
  const monthlyRevenue = useMemo(() =>
    transactions
      .filter(tx => tx.date.startsWith(monthPrefix) && tx.type === "RECETTE")
      .reduce((sum, tx) => sum + tx.amount, 0),
    [transactions, monthPrefix]
  );

  // Daily revenue array for current month: index 0 = day 1, last index = today
  const dailyRevenue = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const monthNum = now.getMonth() + 1;
    const todayDay = now.getDate();
    const mm = String(monthNum).padStart(2, "0");
    const result: number[] = [];
    for (let d = 1; d <= todayDay; d++) {
      const iso = `${year}-${mm}-${String(d).padStart(2, "0")}`;
      const total = transactions
        .filter(tx => tx.date === iso && tx.type === "RECETTE")
        .reduce((sum, tx) => sum + tx.amount, 0);
      result.push(total);
    }
    return result;
  }, [transactions]);

  const monthlyPatientsSeen = useMemo(() =>
    appointments.filter(a => a.date.startsWith(monthPrefix) && a.status === "completed").length,
    [appointments, monthPrefix]
  );

  const monthlyAppts = useMemo(() =>
    appointments.filter(a => a.date.startsWith(monthPrefix) && a.status !== "cancelled").length,
    [appointments, monthPrefix]
  );

  // Completion rate this month
  const completionRate = useMemo(() => {
    const total = monthlyAppts;
    const done  = monthlyPatientsSeen;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [monthlyAppts, monthlyPatientsSeen]);

  // Week recap
  const weekRange = useMemo(() => thisWeekRange(), []);
  const weekAppts = useMemo(() =>
    appointments.filter(a =>
      a.date >= weekRange.start && a.date <= weekRange.end && a.status !== "cancelled" && a.status !== "no_show",
    ), [appointments, weekRange]);
  const weekCompleted = weekAppts.filter(a => a.status === "completed");
  const weekRevenue = useMemo(() =>
    transactions
      .filter(tx => tx.date >= weekRange.start && tx.date <= weekRange.end && tx.type === "RECETTE")
      .reduce((sum, tx) => sum + tx.amount, 0),
    [transactions, weekRange]);
  const weekLabel = formatWeekRange(weekRange.start, weekRange.end);

  // Revenue pulse — today / this week / vs same period last week
  const todayRevenue = useMemo(() =>
    transactions
      .filter(tx => tx.date === today && tx.type === "RECETTE")
      .reduce((sum, tx) => sum + tx.amount, 0),
    [transactions, today],
  );

  // ── Caisse du jour (end-of-day till) — mirrors the web Dashboard caisse ──────
  const caisse = useMemo(() => {
    const billedToday = appointments.filter(a => a.billedAt && a.billedAt.slice(0, 10) === today);
    const collected   = billedToday.reduce((s, a) => s + (a.billedAmount ?? 0), 0);
    const seen        = appointments.filter(a => a.date === today && a.status === "completed");
    const unpaidCount = seen.filter(a => !a.billedAt).length;
    // Mobile has no per-type pricing UI; estimate from the inferred average fee.
    const unpaidEstimate = avgConsultationFee != null ? avgConsultationFee * unpaidCount : 0;
    return {
      collected,
      billedCount:    billedToday.length,
      seenCount:      seen.length,
      unpaidCount,
      unpaidEstimate,
      avgTicket:      billedToday.length ? Math.round(collected / billedToday.length) : 0,
    };
  }, [appointments, avgConsultationFee, today]);

  const lastWeekPeriod = useMemo(() => lastWeekSamePeriodRange(), []);
  const lastWeekRevenue = useMemo(() =>
    transactions
      .filter(tx => tx.date >= lastWeekPeriod.start && tx.date <= lastWeekPeriod.end && tx.type === "RECETTE")
      .reduce((sum, tx) => sum + tx.amount, 0),
    [transactions, lastWeekPeriod],
  );

  /** Percentage change: positive = up, negative = down, null = no last-week data */
  const weekVsLastWeek = useMemo(() => {
    if (lastWeekRevenue === 0) return null;
    return Math.round(((weekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100);
  }, [weekRevenue, lastWeekRevenue]);

  // Projected revenue: pace × remaining days
  const projectedRevenue = useMemo(() => {
    const day = currentDayOfMonth();
    if (day === 0) return monthlyRevenue;
    const daysTotal = daysInCurrentMonth();
    return Math.round((monthlyRevenue / day) * daysTotal);
  }, [monthlyRevenue]);

  // Live clock for next-appointment countdown
  const [currentTime, setCurrentTime] = useState(nowHHMM);
  useEffect(() => {
    const iv = setInterval(() => setCurrentTime(nowHHMM()), 30_000);
    return () => clearInterval(iv);
  }, []);

  // Next appointment today that hasn't started yet
  const nextTodayAppt = useMemo(() =>
    todayAppts
      .filter(a => a.status === "scheduled" && a.startTime > currentTime)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))[0],
    [todayAppts, currentTime]
  );

  const minsUntilNext = nextTodayAppt
    ? minutesBetween(currentTime, nextTodayAppt.startTime)
    : null;

  // ── Android home-screen widget sync ──────────────────────────────────────
  // Push today's appointment data to the widget whenever it changes.
  // Financial data (monthRecettes, monthNet) is pushed separately from AppContext.
  useEffect(() => {
    updateWidgetAppts({
      todayCount:   todayAppts.length,
      nextApptTime: nextTodayAppt?.startTime ?? null,
    });
  }, [todayAppts.length, nextTodayAppt?.id]);

  // Tax deadlines (next 2 most urgent)
  const taxDeadlines = useMemo(() => [
    { label: t("home.taxIRDeclaration"), days: daysUntilAnnual(3, 31) },
    { label: t("home.taxIRPayment"),     days: daysUntilAnnual(4, 30) },
  ].sort((a, b) => a.days - b.days).slice(0, 2), [t]);

  // ── Birthday detection ──────────────────────────────────────────────────────
  const birthdayPatientsToday = useMemo(() => {
    const now = new Date();
    const todayMD = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return patients.filter(p => p.dateOfBirth?.slice(5) === todayMD);
  }, [patients]);

  const birthdayPatientIds = useMemo(
    () => new Set(birthdayPatientsToday.map(p => p.id)),
    [birthdayPatientsToday],
  );

  // ── End-of-day summary ──────────────────────────────────────────────────────
  // Show when there were appointments today and none are still "scheduled"
  const allDoneToday = useMemo(
    () => todayAppts.length > 0 && todayAppts.every(a => a.status !== "scheduled"),
    [todayAppts],
  );
  const todayCompleted = useMemo(
    () => todayAppts.filter(a => a.status === "completed").length,
    [todayAppts],
  );

  // Total patients registered
  const totalPatients = patients.length;

  // Greeting: extract first name from "Prénom NOM" format
  const firstName = doctorProfile.fullName?.split(" ")[0] || "";

  // Appointment type labels
  const typeLabels: Record<string, string> = {
    consultation: t("agenda.types.consultation"),
    controle: t("agenda.types.controle"),
    suivi: t("agenda.types.suivi"),
    procedure: t("agenda.types.procedure"),
    urgence: t("agenda.types.urgence"),
    autre: t("agenda.types.autre"),
  };

  const irNet = Math.max(0, result.tax.ir.grossIR - result.tax.familyDeduction);

  const handleAddRecette = () => {
    setPendingFinancesSegment(1);
    setPendingFilter("RECETTE");
    setPendingOpenAdd("RECETTE");
    navigation.navigate("Finances");
  };

  const handleOpenAgenda = () => navigation.navigate("Agenda");
  const handleOpenPatients = () => navigation.navigate("Patients");

  // ── Entrance animations ────────────────────────────────────────────────────
  const cardAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.stagger(
      70,
      cardAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 340,
          useNativeDriver: true,
        })
      )
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cardStyle = (i: number) => ({
    opacity: cardAnims[i],
    transform: [
      {
        translateY: cardAnims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
    ],
  });

  return (
    <SafeScreen>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
      >
        {/* ── Demo mode banner ── */}
        {isDemoMode && (
          <View style={styles.demoBanner}>
            <Icon name="warning" size={14} color="#92400e" />
            <Text style={styles.demoBannerText}>
              Mode démo — ces chiffres sont fictifs
            </Text>
            <Pressable
              style={styles.demoBannerBtn}
              onPress={() =>
                Alert.alert(
                  "Effacer les données démo ?",
                  "Les 7 transactions fictives seront supprimées. Vos vraies données resteront intactes.",
                  [
                    { text: "Annuler", style: "cancel" },
                    { text: "Effacer", style: "destructive", onPress: () => clearDemoData() },
                  ],
                )
              }
            >
              <Text style={styles.demoBannerBtnText}>Effacer</Text>
            </Pressable>
          </View>
        )}

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {t("home.greetingPrefix")}{firstName ? ` ${t("home.doctor")} ${firstName}` : ""}
            </Text>
            <Text style={styles.dateStr}>{formatTodayFull()}</Text>
          </View>
          <ScalePressable
            scaleTo={0.90}
            style={styles.profileBtn}
            onPress={() => { tapLight(); navigation.navigate("Profil"); }}
          >
            <Text style={styles.profileBtnText}>
              {(doctorProfile.fullName || "D").charAt(0).toUpperCase()}
            </Text>
          </ScalePressable>
        </View>

        {/* ── Caisse du jour — end-of-day till (the daily hook) ── */}
        <View style={styles.caisse}>
          <View style={styles.caisseMain}>
            <View style={styles.caisseLabelRow}>
              <Icon name="receipt" size={12} color={colors.textOnDarkMuted} />
              <Text style={styles.caisseLabel}>{t("home.caisseTitle")}</Text>
            </View>
            <AnimatedNumber value={caisse.collected} format={formatMAD} style={styles.caisseAmount} />
            <Text style={styles.caisseSub}>
              {caisse.seenCount > 0 || caisse.collected > 0
                ? `${caisse.seenCount} ${t("home.caissePatientsSeen")}` +
                  (caisse.billedCount > 0 ? ` · ${t("home.caisseAvg")} ${formatMAD(caisse.avgTicket)}` : "")
                : t("home.caisseNothing")}
            </Text>
          </View>
          {caisse.unpaidCount > 0 && (
            <ScalePressable
              scaleTo={0.95}
              style={styles.caisseUnpaid}
              onPress={() => { tapLight(); handleOpenAgenda(); }}
            >
              <Text style={styles.caisseUnpaidCount}>{caisse.unpaidCount}</Text>
              <View>
                <Text style={styles.caisseUnpaidLbl}>{t("home.caisseToCollect")}</Text>
                {caisse.unpaidEstimate > 0 && (
                  <Text style={styles.caisseUnpaidEst}>≈ {formatMAD(caisse.unpaidEstimate)}</Text>
                )}
              </View>
              <Text style={styles.caisseUnpaidChevron}>›</Text>
            </ScalePressable>
          )}
        </View>

        {/* ── Revenue Pulse ── */}
        <View style={styles.revenuePulse}>
          <View style={styles.revenuePulseHeader}>
            <Icon name="recette" size={12} color={colors.recette} />
            <Text style={styles.revenuePulseTitle}>Recettes · Pulse</Text>
          </View>
          <View style={styles.revenuePulseRow}>
            {/* Today */}
            <View style={styles.revenuePulseKpi}>
              <Text style={[styles.revenuePulseValue, todayRevenue > 0 && { color: colors.recette }]}>
                {todayRevenue > 0 ? formatMAD(todayRevenue) : "—"}
              </Text>
              <Text style={styles.revenuePulseLabel}>Aujourd'hui</Text>
            </View>

            <View style={styles.revenuePulseDivider} />

            {/* This week */}
            <View style={styles.revenuePulseKpi}>
              <Text style={[styles.revenuePulseValue, weekRevenue > 0 && { color: colors.recette }]}>
                {weekRevenue > 0 ? formatMAD(weekRevenue) : "—"}
              </Text>
              <Text style={styles.revenuePulseLabel}>Cette semaine</Text>
            </View>

            <View style={styles.revenuePulseDivider} />

            {/* vs last week */}
            <View style={styles.revenuePulseKpi}>
              {weekVsLastWeek !== null ? (
                <Text style={[
                  styles.revenuePulseDelta,
                  { color: weekVsLastWeek >= 0 ? colors.success : colors.danger },
                ]}>
                  {weekVsLastWeek >= 0 ? `↑ +${weekVsLastWeek}%` : `↓ ${weekVsLastWeek}%`}
                </Text>
              ) : (
                <Text style={styles.revenuePulseValue}>—</Text>
              )}
              <Text style={styles.revenuePulseLabel}>vs sem. passée</Text>
            </View>
          </View>
        </View>

        {/* ── Next appointment countdown ── */}
        {minsUntilNext !== null && minsUntilNext <= 30 && (
          <Pressable
            style={[
              styles.bannerWarning,
              minsUntilNext <= 5 && { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
            ]}
            onPress={handleOpenAgenda}
          >
            <Icon name="clock" size={13} color={minsUntilNext <= 5 ? colors.danger : colors.warning} />
            <Text style={[
              styles.bannerWarningText,
              minsUntilNext <= 5 && { color: colors.danger },
            ]}>
              {minsUntilNext <= 5
                ? t("home.nextApptSoon")
                : `${t("home.nextApptIn")} ${minsUntilNext} ${t("home.nextApptMin")}`
              }
              {" — "}{nextTodayAppt?.patientName}
            </Text>
            <Text style={[styles.bannerRetry, minsUntilNext <= 5 && { color: colors.danger }]}>›</Text>
          </Pressable>
        )}

        {/* ── Banners ── */}
        {syncStatus === "error" && (
          <Pressable style={styles.bannerDanger} onPress={retrySync}>
            <Icon name="alertCircle" size={13} color={colors.danger} />
            <Text style={styles.bannerDangerText}>{t("dashboard.syncError")}</Text>
            <Text style={styles.bannerRetry}>{t("sync.retry")}</Text>
          </Pressable>
        )}

        {/* ── Today's schedule ── */}
        <Animated.View style={[styles.card, cardStyle(0)]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Icon name="calendar" size={14} color={colors.brand} />
              <Text style={styles.cardTitle}>{t("home.todayTitle")}</Text>
            </View>
            {todayAppts.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {todayAppts.length} {t("home.appointments")}
                </Text>
              </View>
            )}
          </View>

          {/* Birthday banner */}
          {birthdayPatientsToday.length > 0 && todayAppts.some(a => a.patientId && birthdayPatientIds.has(a.patientId)) && (
            <View style={styles.birthdayBanner}>
              <Text style={styles.birthdayBannerText}>
                🎂 {birthdayPatientsToday.map(p => p.firstName).join(", ")} — anniversaire aujourd'hui !
              </Text>
            </View>
          )}

          {todayAppts.length === 0 ? (
            <View style={styles.freeDayBox}>
              <Text style={styles.freeDayEmoji}>🌿</Text>
              <Text style={styles.freeDayText}>{t("home.freeDay")}</Text>
              {nextAppt && (
                <Text style={styles.freeDaySub}>
                  {t("home.nextUpcoming")} · {formatDateShort(nextAppt.date)} {nextAppt.startTime} — {nextAppt.patientName}
                </Text>
              )}
            </View>
          ) : allDoneToday ? (
            /* End-of-day summary */
            <View style={styles.dayDoneCard}>
              <Text style={styles.dayDoneEmoji}>✅</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.dayDoneTitle}>Journée terminée</Text>
                <Text style={styles.dayDoneSub}>
                  {todayCompleted} patient{todayCompleted > 1 ? "s" : ""} vu{todayCompleted > 1 ? "s" : ""}
                  {todayRevenue > 0 ? `  ·  ${formatMAD(todayRevenue)} encaissés` : ""}
                </Text>
              </View>
            </View>
          ) : (
            <>
              {todayAppts.map(appt => (
                <ApptRow
                  key={appt.id}
                  appt={appt}
                  typeLabel={typeLabels[appt.type] ?? appt.type}
                  isBirthday={!!(appt.patientId && birthdayPatientIds.has(appt.patientId))}
                  onPress={handleOpenAgenda}
                />
              ))}
            </>
          )}

          <ScalePressable
            scaleTo={0.96}
            style={styles.seeAllBtn}
            onPress={() => { tapLight(); handleOpenAgenda(); }}
          >
            <Text style={styles.seeAllText}>{t("home.seeAgenda")} ›</Text>
          </ScalePressable>
        </Animated.View>

        {/* ── Week recap ── */}
        <Animated.View style={[styles.card, cardStyle(1)]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Icon name="barChart" size={14} color={colors.brand} />
              <Text style={styles.cardTitle}>{t("home.weekRecap")}</Text>
            </View>
            <Text style={styles.weekRangeText}>{weekLabel}</Text>
          </View>
          <View style={styles.weekStatsRow}>
            <View style={styles.weekStatBox}>
              <Text style={styles.weekStatValue}>{weekAppts.length}</Text>
              <Text style={styles.weekStatLabel}>{t("home.weekAppts")}</Text>
            </View>
            <View style={[styles.weekStatBox, styles.weekStatBoxBorder]}>
              <Text style={[styles.weekStatValue, { color: colors.success }]}>{weekCompleted.length}</Text>
              <Text style={styles.weekStatLabel}>{t("home.weekCompleted")}</Text>
            </View>
            <View style={[styles.weekStatBox, styles.weekStatBoxBorder]}>
              <Text style={[styles.weekStatValue, { color: colors.recette }]}>
                {weekRevenue > 0 ? Math.round(weekRevenue).toLocaleString("fr-FR") : "—"}
              </Text>
              <Text style={styles.weekStatLabel}>{t("home.weekRevenue")}</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Revenue sparkline ── */}
        {dailyRevenue.length >= 3 && dailyRevenue.some(v => v > 0) && (
          <Animated.View style={[styles.card, cardStyle(2)]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Icon name="recette" size={14} color={colors.recette} />
                <Text style={[styles.cardTitle, { color: colors.recette }]}>
                  {t("home.income")} · {t("home.thisMonth")}
                </Text>
              </View>
              <Text style={styles.sparkTotal}>{formatMAD(monthlyRevenue)}</Text>
            </View>
            <RevenueSparkline data={dailyRevenue} />
            <View style={styles.sparkFooter}>
              <Text style={styles.sparkFooterLabel}>1</Text>
              <Text style={styles.sparkFooterLabel}>{new Date().getDate()}</Text>
            </View>
          </Animated.View>
        )}

        {/* ── Follow-up queue ── */}
        {followUpsDue.length > 0 && (
          <View style={styles.followUpQueueCard}>
            {/* Header */}
            <View style={styles.followUpQueueHeader}>
              <View style={styles.followUpQueueTitleRow}>
                <View style={styles.followUpQueueIconWrap}>
                  <Icon name="clock" size={14} color={colors.warning} />
                </View>
                <View>
                  <Text style={styles.followUpQueueTitle}>À rappeler</Text>
                  <Text style={styles.followUpQueueSub}>
                    {followUpsDue.length} patient{followUpsDue.length > 1 ? "s" : ""} en attente de suivi
                  </Text>
                </View>
              </View>
              <View style={styles.followUpQueueBadge}>
                <Text style={styles.followUpQueueBadgeText}>{followUpsDue.length > 9 ? "9+" : followUpsDue.length}</Text>
              </View>
            </View>

            {/* Patient rows */}
            {followUpsDue.map((appt, idx) => {
              const daysAgo = Math.floor(
                (new Date(today + "T00:00:00").getTime() - new Date(appt.followUpDate! + "T00:00:00").getTime()) / 86400000
              );
              const urgency = daysAgo >= 14 ? colors.danger : daysAgo >= 7 ? "#E07A06" : colors.warning;
              const overdueLabel = daysAgo === 0
                ? "aujourd'hui"
                : daysAgo === 1 ? "hier"
                : `il y a ${daysAgo}j`;

              // Resolve patient phone via patients list
              const patient = patients.find(p => appt.patientId ? p.id === appt.patientId : `${p.firstName} ${p.lastName}` === appt.patientName);
              const phone = patient?.phone?.replace(/\s+/g, "");

              return (
                <View key={appt.id} style={[styles.followUpQueueRow, idx < followUpsDue.length - 1 && styles.followUpQueueRowBorder]}>
                  {/* Left: urgency dot + info */}
                  <Pressable
                    style={styles.followUpQueueInfo}
                    onPress={() => {
                      tapLight();
                      navigation.navigate("Agenda", { screen: "AppointmentDetail", params: { appointmentId: appt.id } });
                    }}
                  >
                    <View style={[styles.followUpQueueDot, { backgroundColor: urgency }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.followUpQueueName}>{appt.patientName}</Text>
                      <Text style={[styles.followUpQueueOverdue, { color: urgency }]}>
                        {overdueLabel} · prévu {appt.followUpDate?.split("-").reverse().join("/")}
                      </Text>
                    </View>
                  </Pressable>

                  {/* Right: action chips */}
                  <View style={styles.followUpQueueActions}>
                    {!!phone && (
                      <ScalePressable
                        scaleTo={0.92}
                        style={styles.followUpWaBtn}
                        onPress={() => {
                          tapLight();
                          Linking.openURL(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(`Bonjour ${appt.patientName.split(" ")[0]}, votre suivi médical était prévu le ${appt.followUpDate?.split("-").reverse().join("/")}. Souhaitez-vous prendre un rendez-vous ?`)}`);
                        }}
                      >
                        <Text style={styles.followUpWaBtnText}>💬</Text>
                      </ScalePressable>
                    )}
                    <ScalePressable
                      scaleTo={0.92}
                      style={styles.followUpRdvBtn}
                      onPress={() => {
                        tapLight();
                        setModalPrefilledPatientId(appt.patientId ?? (patient?.id));
                        setApptModalOpen(true);
                      }}
                    >
                      <Icon name="calendarPlus" size={12} color={colors.brand} />
                      <Text style={styles.followUpRdvBtnText}>RDV</Text>
                    </ScalePressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Unbilled consultation tracker ── */}
        {unbilledCount > 0 && (() => {
          const SHOW = 5;
          const visible = unbilledAppts.slice(0, SHOW);
          const hidden  = unbilledCount - visible.length;
          const estimatedTotal = avgConsultationFee != null
            ? avgConsultationFee * unbilledCount
            : null;

          return (
            <View style={styles.unbilledCard}>
              {/* Header */}
              <View style={styles.unbilledHeader}>
                <View style={styles.unbilledHeaderLeft}>
                  <View style={styles.unbilledIconWrap}>
                    <Icon name="receipt" size={14} color={colors.warning} />
                  </View>
                  <View>
                    <Text style={styles.unbilledTitle}>{t("home.unbilled")}</Text>
                    {estimatedTotal != null && (
                      <Text style={styles.unbilledEstimate}>
                        ~{formatMAD(estimatedTotal)} en attente de facturation
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.unbilledBadge}>
                  <Text style={styles.unbilledBadgeText}>{unbilledCount > 9 ? "9+" : unbilledCount}</Text>
                </View>
              </View>

              {/* Appointment rows */}
              {visible.map((appt, idx) => (
                <ScalePressable
                  key={appt.id}
                  scaleTo={0.97}
                  style={[styles.unbilledRow, idx < visible.length - 1 && styles.unbilledRowBorder]}
                  onPress={() => {
                    tapLight();
                    navigation.navigate("Agenda", {
                      screen: "AppointmentDetail",
                      params: { appointmentId: appt.id },
                    });
                  }}
                >
                  <View style={styles.unbilledRowInfo}>
                    <Text style={styles.unbilledPatientName} numberOfLines={1}>
                      {appt.patientName}
                    </Text>
                    <Text style={styles.unbilledRowMeta}>
                      {appt.date.split("-").reverse().slice(0, 2).join("/")}
                      {" · "}{typeLabels[appt.type] ?? appt.type}
                    </Text>
                  </View>
                  <View style={styles.unbilledOpenBtn}>
                    <Text style={styles.unbilledOpenBtnText}>Facturer ›</Text>
                  </View>
                </ScalePressable>
              ))}

              {/* "See more" footer */}
              {hidden > 0 && (
                <ScalePressable
                  scaleTo={0.97}
                  style={styles.unbilledSeeMore}
                  onPress={() => { tapLight(); handleOpenAgenda(); }}
                >
                  <Text style={styles.unbilledSeeMoreText}>
                    … et {hidden} autre{hidden > 1 ? "s" : ""} — voir dans l'agenda ›
                  </Text>
                </ScalePressable>
              )}
            </View>
          );
        })()}

        {/* ── Quick actions ── */}
        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>{t("home.quickAdd")}</Text>
        </View>
        <View style={styles.quickRow}>
          <QuickBtn
            icon="recette"
            label={t("home.addIncome")}
            color={colors.recette}
            onPress={handleAddRecette}
          />
          <QuickBtn
            icon="calendarPlus"
            label={t("home.newRdv")}
            color={colors.brand}
            onPress={() => setApptModalOpen(true)}
          />
          <QuickBtn
            icon="users"
            label={t("home.newPatient")}
            color={colors.gold}
            onPress={handleOpenPatients}
          />
        </View>

        {/* ── Ce mois ── */}
        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>{t("home.thisMonth")}</Text>
        </View>
        <View style={styles.statsRow}>
          <StatCard
            label={t("home.income")}
            value={monthlyRevenue}
            format={formatMAD}
            sub={monthlyRevenue > 0 ? `${t("home.projected")} ${formatMAD(projectedRevenue)}` : undefined}
            accent={colors.recette}
          />
          <StatCard
            label={t("home.patientsSeen")}
            value={monthlyPatientsSeen}
            sub={completionRate > 0 ? `${completionRate}% ${t("home.completionRate")}` : `${monthlyAppts} ${t("home.appointments")}`}
          />
        </View>

        {/* ── Cabinet stats ── */}
        <View style={styles.statsRow}>
          <StatCard
            label={t("home.totalPatients")}
            value={totalPatients}
            accent={colors.brand}
          />
          <StatCard
            label={t("home.cabinetStats")}
            value={monthlyAppts}
            sub={t("home.appointments")}
          />
        </View>

        {/* ── Cabinet en chiffres link ── */}
        <ScalePressable
          scaleTo={0.97}
          style={styles.statsLinkCard}
          onPress={() => { tapLight(); navigation.navigate("Profil", { screen: "Stats" }); }}
        >
          <View style={styles.statsLinkIconWrap}>
            <Icon name="barChart" size={18} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statsLinkTitle}>Votre cabinet en chiffres</Text>
            <Text style={styles.statsLinkSub}>
              Records, fidélisation, répartition hebdomadaire
            </Text>
          </View>
          <View style={{ transform: [{ scaleX: -1 }] }}>
            <Icon name="back" size={14} color={colors.textTertiary} />
          </View>
        </ScalePressable>

        {/* ── Tax deadlines ── */}
        <View style={styles.taxCard}>
          <View style={styles.taxCardHeader}>
            <Icon name="calendar" size={13} color={colors.warning} />
            <Text style={styles.taxCardTitle}>{t("home.taxDeadlines")}</Text>
          </View>
          <View style={styles.taxDeadlineRow}>
            {taxDeadlines.map((d, i) => (
              <Pressable
                key={i}
                style={[styles.taxDeadlineItem, d.days <= 30 && styles.taxDeadlineUrgent]}
                onPress={() => navigation.navigate("Finances")}
              >
                <Text style={[styles.taxDeadlineDays, d.days <= 30 && { color: colors.danger }]}>
                  {d.days}{t("home.daysLeft")}
                </Text>
                <Text style={styles.taxDeadlineLabel}>{d.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Fiscal snapshot ── */}
        <Pressable
          style={({ pressed }) => [styles.fiscalCard, pressed && { opacity: 0.85 }]}
          onPress={() => navigation.navigate("Finances")}
        >
          <View style={styles.fiscalLeft}>
            <Text style={styles.fiscalTitle}>{t("home.fiscalSnapshot")}</Text>
            <Text style={styles.fiscalRegime}>{result.tax.regime}</Text>
          </View>
          <View style={styles.fiscalRight}>
            <Text style={styles.fiscalTaxLabel}>{t("home.taxEstimate")}</Text>
            <Text style={styles.fiscalTaxValue}>{formatMAD(irNet)}</Text>
          </View>
          <View style={{ transform: [{ scaleX: -1 }] }}>
            <Icon name="back" size={14} color={colors.textOnDarkMuted} />
          </View>
        </Pressable>

      </ScrollView>

      {/* New appointment modal */}
      <AppointmentModal
        visible={apptModalOpen}
        initial={null}
        selectedDate={today}
        patients={patients}
        prefilledPatientId={modalPrefilledPatientId}
        t={t}
        onSave={(appt) => {
          addAppointment(appt);
          setApptModalOpen(false);
          setModalPrefilledPatientId(undefined);
        }}
        onClose={() => {
          setApptModalOpen(false);
          setModalPrefilledPatientId(undefined);
        }}
      />
    </SafeScreen>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 40 },

  // Demo mode banner
  demoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#fef3c7",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "#fde68a",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  demoBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#92400e",
  },
  demoBannerBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: "#92400e",
  },
  demoBannerBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  dateStr: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 3,
    textTransform: "capitalize",
    fontWeight: "500",
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceDark,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.brand + "55",
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  profileBtnText: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.textOnDark,
  },

  // Revenue Pulse strip
  caisse: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: spacing.sm,
    backgroundColor: "#0A4E7E",
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2,
    marginBottom: spacing.md,
    ...shadows.hero,
  },
  caisseMain: { flexShrink: 1 },
  caisseLabelRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 2 },
  caisseLabel: {
    fontSize: 10, fontWeight: "700", color: colors.textOnDarkMuted,
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  caisseAmount: { fontSize: 28, fontWeight: "900", color: colors.textOnDark, letterSpacing: -0.5 },
  caisseSub: { fontSize: 12, color: colors.textOnDarkMuted, marginTop: 3 },
  caisseUnpaid: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,255,255,0.13)",
    borderRadius: radii.md, paddingVertical: 7, paddingHorizontal: 11,
  },
  caisseUnpaidCount: { fontSize: 20, fontWeight: "900", color: colors.textOnDark },
  caisseUnpaidLbl: { fontSize: 11, fontWeight: "600", color: colors.textOnDark },
  caisseUnpaidEst: { fontSize: 11, fontWeight: "800", color: colors.gold },
  caisseUnpaidChevron: { fontSize: 18, color: colors.textOnDarkMuted, fontWeight: "700" },
  revenuePulse: {
    backgroundColor: colors.recette + "0D",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.recette + "2A",
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  revenuePulseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.xs,
  },
  revenuePulseTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.recette,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  revenuePulseRow: {
    flexDirection: "row",
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  revenuePulseKpi: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  revenuePulseValue: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  revenuePulseDelta: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  revenuePulseLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  revenuePulseDivider: {
    width: 1,
    backgroundColor: colors.recette + "22",
    marginVertical: spacing.xs,
  },

  // Banners
  bannerWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.warningSoft,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  bannerWarningText: { fontSize: 12, fontWeight: "600", color: colors.warning, flex: 1 },
  bannerDanger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  bannerDangerText: { fontSize: 12, fontWeight: "600", color: colors.danger, flex: 1 },
  bannerRetry: { fontSize: 12, fontWeight: "700", color: colors.danger, textDecorationLine: "underline" },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardTitle: {
    ...typography.micro,
    color: colors.brand,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  countBadge: {
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  countBadgeText: { fontSize: 11, fontWeight: "700", color: colors.brand },

  // Follow-up queue card (Feature #2)
  followUpQueueCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.warning + "55",
    marginBottom: spacing.md,
    overflow: "hidden",
    ...shadows.card,
  },
  followUpQueueHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    backgroundColor: colors.warningSoft,
    borderBottomWidth: 1, borderBottomColor: colors.warning + "33",
  },
  followUpQueueTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  followUpQueueIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: colors.warning + "22",
    alignItems: "center", justifyContent: "center",
  },
  followUpQueueTitle: { fontSize: 13, fontWeight: "700", color: colors.warning },
  followUpQueueSub: { fontSize: 10, color: colors.warning + "CC", marginTop: 1 },
  followUpQueueBadge: {
    backgroundColor: colors.warning,
    borderRadius: radii.pill,
    minWidth: 22, height: 22,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 6,
  },
  followUpQueueBadgeText: { fontSize: 11, fontWeight: "800", color: "#fff" },
  followUpQueueRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.md, paddingVertical: 12,
    gap: spacing.sm,
  },
  followUpQueueRowBorder: {
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  followUpQueueInfo: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm,
  },
  followUpQueueDot: {
    width: 8, height: 8, borderRadius: 4, flexShrink: 0,
  },
  followUpQueueName: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  followUpQueueOverdue: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  followUpQueueActions: { flexDirection: "row", gap: 6, alignItems: "center" },
  followUpWaBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "#25D366" + "18",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#25D366" + "44",
  },
  followUpWaBtnText: { fontSize: 15, lineHeight: 18 },
  followUpRdvBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: radii.md,
    backgroundColor: colors.brandSoft,
    borderWidth: 1, borderColor: colors.brand + "33",
  },
  followUpRdvBtnText: { fontSize: 11, fontWeight: "700", color: colors.brand },

  // Appointment row
  apptRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  apptTime: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.brand,
    width: 44,
    textAlign: "right",
  },
  apptDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  apptInfo: { flex: 1 },
  apptName: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  apptType: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  apptChevron: { fontSize: 18, color: colors.textTertiary, lineHeight: 20 },

  // Free day state
  freeDayBox: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  freeDayEmoji: { fontSize: 32, marginBottom: spacing.sm },
  freeDayText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  freeDaySub: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    textAlign: "center",
  },

  // See all link
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  seeAllText: { fontSize: 13, fontWeight: "600", color: colors.brand },

  // Section label
  sectionLabel: { marginTop: spacing.sm, marginBottom: spacing.sm },
  sectionLabelText: {
    ...typography.micro,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },

  // Quick actions
  quickRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md + 2,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 7,
    ...shadows.card,
  },
  quickBtnIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  quickBtnLabel: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.1,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  statSub: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },

  // Sparkline
  sparkTotal: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.recette,
    letterSpacing: -0.3,
  },
  sparkFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sparkFooterLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textTertiary,
  },

  // Stats link card
  statsLinkCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.brand + "33",
    ...shadows.card,
  },
  statsLinkIconWrap: {
    width: 40, height: 40, borderRadius: radii.md,
    backgroundColor: colors.brandSoft,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  statsLinkTitle: {
    fontSize: 13, fontWeight: "700",
    color: colors.textPrimary, marginBottom: 2,
  },
  statsLinkSub: {
    fontSize: 11, color: colors.textTertiary,
  },

  // Tax deadlines card
  taxCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning + "55",
    ...shadows.card,
  },
  taxCardHeader: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  taxCardTitle: {
    fontSize: 10, fontWeight: "700", color: colors.warning,
    textTransform: "uppercase", letterSpacing: 0.6,
  },
  taxDeadlineRow: { flexDirection: "row", gap: spacing.sm },
  taxDeadlineItem: {
    flex: 1, alignItems: "center",
    backgroundColor: colors.bg, borderRadius: radii.md,
    padding: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  taxDeadlineUrgent: {
    borderColor: colors.danger + "55",
    backgroundColor: colors.dangerSoft,
  },
  taxDeadlineDays: {
    fontSize: 20, fontWeight: "800", color: colors.brand, letterSpacing: -0.5,
  },
  taxDeadlineLabel: {
    fontSize: 10, fontWeight: "600", color: colors.textSecondary,
    textAlign: "center", marginTop: 2,
  },

  // Week recap
  weekRangeText: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: "500",
  },
  weekStatsRow: {
    flexDirection: "row",
  },
  weekStatBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  weekStatBoxBorder: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  weekStatValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  weekStatLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 2,
  },

  // Unbilled consultation tracker
  unbilledCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.warning + "55",
    marginBottom: spacing.md,
    overflow: "hidden",
    ...shadows.card,
  },
  unbilledHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.warningSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.warning + "33",
  },
  unbilledHeaderLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    flex: 1,
  },
  unbilledIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.warning + "22",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  unbilledTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.warning,
  },
  unbilledEstimate: {
    fontSize: 10,
    color: colors.warning + "BB",
    fontWeight: "600",
    marginTop: 1,
  },
  unbilledBadge: {
    backgroundColor: colors.warning,
    borderRadius: radii.pill,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    flexShrink: 0,
  },
  unbilledBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
  },
  unbilledRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    gap: spacing.sm,
  },
  unbilledRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  unbilledRowInfo: { flex: 1 },
  unbilledPatientName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  unbilledRowMeta: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  unbilledOpenBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.md,
    backgroundColor: colors.warning + "18",
    borderWidth: 1,
    borderColor: colors.warning + "44",
    flexShrink: 0,
  },
  unbilledOpenBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.warning,
  },
  unbilledSeeMore: {
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  unbilledSeeMoreText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.warning,
  },

  // Fiscal snapshot
  fiscalCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceDark,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.hero,
  },
  fiscalLeft: { flex: 1 },
  fiscalTitle: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textOnDarkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  fiscalRegime: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textOnDark,
  },
  fiscalRight: { alignItems: "flex-end", marginRight: spacing.sm },
  fiscalTaxLabel: {
    fontSize: 10,
    color: colors.textOnDarkMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  fiscalTaxValue: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textOnDark,
    letterSpacing: -0.3,
  },

  // ── Birthday banner ──────────────────────────────────────────────────────────
  birthdayBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gold + "18",
    borderWidth: 1,
    borderColor: colors.gold + "44",
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  birthdayBannerText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gold,
    flex: 1,
  },

  // ── End-of-day summary ────────────────────────────────────────────────────────
  dayDoneCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.success + "12",
    borderWidth: 1,
    borderColor: colors.success + "44",
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.xs,
  },
  dayDoneEmoji: { fontSize: 24 },
  dayDoneTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.success,
  },
  dayDoneSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
