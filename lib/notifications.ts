/**
 * Push notifications — tax deadlines + patient follow-up reminders.
 *
 * Tax: schedules local reminders for each acompte provisionnel.
 * Follow-up: schedules a single reminder at 08:00 on the follow-up date.
 *
 * Notification IDs are persisted in AsyncStorage so stale reminders are
 * cancelled cleanly before rescheduling.
 */
import { NativeModules, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const NOTIF_IDS_KEY = "bpc_tax_notif_ids_v1";
const NOTIF_HASH_KEY = "bpc_tax_notif_hash_v1";
// Follow-up: Record<appointmentId, notificationId>
const FOLLOWUP_MAP_KEY = "bpc_followup_notifs_v1";
// End-of-day summary
const EOD_NOTIF_ID_KEY   = "bpc_eod_notif_id_v1";
const EOD_NOTIF_HASH_KEY = "bpc_eod_notif_hash_v1";

// ─── Lazy native module access ────────────────────────────────────────────────
// expo-notifications requires compiled native modules that are absent in Expo Go
// and in any build made before the package was installed.
//
// We check NativeModules FIRST — before calling require() — because
// expo-modules-core logs a native error and throws synchronously inside the
// require() call itself when the module isn't registered. That log appears in
// the console even when the throw is caught in JS. By checking NativeModules
// up-front we skip the require entirely and produce no error at all.

function getN(): any {
  if (Platform.OS === "web") return null;
  // ExpoNotifications is the primary native module shipped by expo-notifications.
  // If it isn't registered the whole package is unavailable; bail silently.
  if (!NativeModules.ExpoNotifications) return null;
  try { return require("expo-notifications"); } catch { return null; }
}

// ─── Foreground display behaviour ────────────────────────────────────────────
// Called once the first time we actually try to schedule — not at module load.
let handlerSet = false;
function ensureHandler(N: any) {
  if (handlerSet || !N) return;
  try {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerSet = true;
  } catch { /* native module absent — silently skip */ }
}

// ─── Permissions ──────────────────────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const N = getN();
  if (!N) return false;
  try {
    const { status: existing } = await N.getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await N.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fireDate(dueIso: string, daysOffset: number): Date {
  const d = new Date(`${dueIso}T09:00:00`);
  d.setDate(d.getDate() - daysOffset);
  return d;
}

function fmtShortDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });
}

function fmtAmount(amount: number): string {
  return `${Math.round(amount).toLocaleString("fr-FR")} MAD`;
}

// ─── Core scheduling ──────────────────────────────────────────────────────────

interface Acompte {
  label: string;
  dueIso: string;
  amount: number;
}

const REMINDER_OFFSETS: Array<{
  days: number;
  buildTitle: (label: string) => string;
  buildBody: (amount: string, dateStr: string) => string;
}> = [
  {
    days: 30,
    buildTitle: (label) => `⚠️ ${label} — dans 30 jours`,
    buildBody: (amount, dateStr) =>
      `${amount} à préparer · échéance le ${dateStr}`,
  },
  {
    days: 7,
    buildTitle: (label) => `⏰ ${label} — dans 7 jours`,
    buildBody: (amount, dateStr) => `${amount} dû le ${dateStr}`,
  },
  {
    days: 1,
    buildTitle: (label) => `🚨 ${label} — demain !`,
    buildBody: (amount) => `${amount} à payer demain · ne pas manquer l'échéance`,
  },
  {
    days: 0,
    buildTitle: (label) => `💰 ${label} — aujourd'hui`,
    buildBody: (amount, dateStr) => `${amount} dû ce jour · ${dateStr}`,
  },
];

/**
 * Schedule (or reschedule) all acompte notifications for a fiscal year.
 * No-ops if the same (fiscalYear, taxDue) pair was already scheduled.
 * Silently skips dates that are already in the past.
 */
export async function scheduleAcompteNotifications(
  fiscalYear: number,
  taxDue: number
): Promise<void> {
  if (Platform.OS === "web") return;
  const N = getN();
  if (!N) return;
  ensureHandler(N);

  const hash = `${fiscalYear}:${Math.round(taxDue)}`;
  try {
    const storedHash = await AsyncStorage.getItem(NOTIF_HASH_KEY);
    if (storedHash === hash) return; // Nothing changed — bail early
  } catch {
    // Storage read failed; proceed with scheduling
  }

  // Cancel the previously scheduled batch
  await cancelAllTaxNotifications();

  const perInstallment = Math.round((taxDue / 4) * 100) / 100;
  const Y = fiscalYear;

  const acomptes: Acompte[] = [
    { label: "1er acompte",  dueIso: `${Y}-04-30`,     amount: perInstallment },
    { label: "2e acompte",   dueIso: `${Y}-07-31`,     amount: perInstallment },
    { label: "3e acompte",   dueIso: `${Y}-10-31`,     amount: perInstallment },
    { label: "Solde annuel", dueIso: `${Y + 1}-03-31`, amount: perInstallment },
  ];

  const now = new Date();
  const scheduledIds: string[] = [];

  for (const acompte of acomptes) {
    const amtStr = fmtAmount(acompte.amount);
    const dateStr = fmtShortDate(acompte.dueIso);

    for (const reminder of REMINDER_OFFSETS) {
      const trigger = fireDate(acompte.dueIso, reminder.days);
      if (trigger <= now) continue; // already past

      try {
        const id = await N.scheduleNotificationAsync({
          content: {
            title: reminder.buildTitle(acompte.label),
            body: reminder.buildBody(amtStr, dateStr),
            sound: true,
            data: {
              type: "acompte_provisionnel",
              fiscalYear,
              daysOffset: reminder.days,
            },
          },
          trigger: {
            type: N.SchedulableTriggerInputTypes.DATE,
            date: trigger,
          },
        });
        scheduledIds.push(id);
      } catch {
        // Swallow: don't let one failed slot abort the whole batch
      }
    }
  }

  try {
    await AsyncStorage.setItem(NOTIF_IDS_KEY, JSON.stringify(scheduledIds));
    await AsyncStorage.setItem(NOTIF_HASH_KEY, hash);
  } catch {
    // Best-effort persistence
  }
}

/**
 * Cancel all previously scheduled tax notifications and clear stored IDs.
 */
export async function cancelAllTaxNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  const N = getN();
  try {
    const raw = await AsyncStorage.getItem(NOTIF_IDS_KEY);
    if (raw && N) {
      const ids: string[] = JSON.parse(raw);
      await Promise.all(
        ids.map((id) =>
          N.cancelScheduledNotificationAsync(id).catch(() => {})
        )
      );
    }
  } catch {
    // Best-effort
  } finally {
    try {
      await AsyncStorage.removeItem(NOTIF_IDS_KEY);
      await AsyncStorage.removeItem(NOTIF_HASH_KEY);
    } catch {
      // Ignore
    }
  }
}

// ─── Patient follow-up reminders ─────────────────────────────────────────────

async function loadFollowUpMap(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(FOLLOWUP_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveFollowUpMap(map: Record<string, string>): Promise<void> {
  try {
    await AsyncStorage.setItem(FOLLOWUP_MAP_KEY, JSON.stringify(map));
  } catch { /* best-effort */ }
}

/**
 * Schedule (or reschedule) a follow-up reminder for an appointment.
 * Fires at 08:00 on `followUpDate`. Silently no-ops if the date is in the past
 * or if expo-notifications is unavailable.
 *
 * @param appointmentId  Used to track and cancel the notification later.
 * @param patientName    Shown in the notification.
 * @param followUpDate   ISO date string "YYYY-MM-DD".
 * @param apptType       Optional context (e.g. "consultation", "suivi").
 */
export async function scheduleFollowUpNotification(
  appointmentId: string,
  patientName: string,
  followUpDate: string,
  apptType?: string,
): Promise<void> {
  if (Platform.OS === "web") return;
  const N = getN();
  if (!N) return;
  ensureHandler(N);

  // First cancel any existing reminder for this appointment
  await cancelFollowUpNotification(appointmentId);

  const trigger = new Date(`${followUpDate}T08:00:00`);
  if (trigger <= new Date()) return; // already past

  const typeLabel = apptType ? ` · ${apptType}` : "";

  try {
    const id = await N.scheduleNotificationAsync({
      content: {
        title: `🔔 Suivi — ${patientName}`,
        body: `Rappel de suivi prévu aujourd'hui${typeLabel}`,
        sound: true,
        data: { type: "follow_up", appointmentId },
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DATE,
        date: trigger,
      },
    });

    const map = await loadFollowUpMap();
    map[appointmentId] = id;
    await saveFollowUpMap(map);
  } catch {
    // Swallow — native module absent or permission denied
  }
}

/**
 * Cancel the follow-up reminder for a specific appointment, if one exists.
 */
export async function cancelFollowUpNotification(
  appointmentId: string,
): Promise<void> {
  if (Platform.OS === "web") return;
  const N = getN();
  const map = await loadFollowUpMap();
  const notifId = map[appointmentId];
  if (!notifId) return;

  if (N) {
    try {
      await N.cancelScheduledNotificationAsync(notifId);
    } catch { /* best-effort */ }
  }

  delete map[appointmentId];
  await saveFollowUpMap(map);
}

// ─── End-of-day summary ───────────────────────────────────────────────────────

export interface DailySummaryParams {
  /** ISO date the summary is for (YYYY-MM-DD). */
  dateIso: string;
  patientCount: number;
  revenueMAD: number;
  pendingReimbCount: number;
}

/**
 * Schedule (or reschedule) the end-of-day summary notification for today at 19:00.
 *
 * Uses hash-based deduplication — no-ops if nothing changed since last call.
 * Silently no-ops if 19:00 today is already past, or if expo-notifications is unavailable.
 */
export async function scheduleDailySummaryNotification(
  params: DailySummaryParams,
): Promise<void> {
  if (Platform.OS === "web") return;
  const N = getN();
  if (!N) return;
  ensureHandler(N);

  const { dateIso, patientCount, revenueMAD, pendingReimbCount } = params;
  const hash = `${dateIso}:${patientCount}:${Math.round(revenueMAD)}:${pendingReimbCount}`;

  try {
    const storedHash = await AsyncStorage.getItem(EOD_NOTIF_HASH_KEY);
    if (storedHash === hash) return; // Nothing changed
  } catch { /* proceed */ }

  // Cancel previous EOD notification before rescheduling
  await cancelDailySummaryNotification();

  const trigger = new Date(`${dateIso}T19:00:00`);
  if (trigger <= new Date()) {
    // 19:00 has already passed today — nothing to schedule
    await AsyncStorage.setItem(EOD_NOTIF_HASH_KEY, hash).catch(() => {});
    return;
  }

  // Build human-readable body
  const revStr = `${Math.round(revenueMAD).toLocaleString("fr-FR")} MAD`;
  const patientStr = `${patientCount} patient${patientCount !== 1 ? "s" : ""}`;
  let body = `${patientStr} · ${revStr}`;
  if (pendingReimbCount > 0) {
    body += ` · ${pendingReimbCount} remboursement${pendingReimbCount > 1 ? "s" : ""} en attente`;
  }

  try {
    const id = await N.scheduleNotificationAsync({
      content: {
        title: "📋 Bilan de la journée",
        body,
        sound: true,
        data: { type: "daily_summary", dateIso },
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DATE,
        date: trigger,
      },
    });
    await AsyncStorage.setItem(EOD_NOTIF_ID_KEY, id).catch(() => {});
    await AsyncStorage.setItem(EOD_NOTIF_HASH_KEY, hash).catch(() => {});
  } catch {
    // Swallow — permission denied or native module absent
  }
}

/**
 * Cancel the end-of-day summary notification if one is scheduled.
 */
export async function cancelDailySummaryNotification(): Promise<void> {
  if (Platform.OS === "web") return;
  const N = getN();
  try {
    const id = await AsyncStorage.getItem(EOD_NOTIF_ID_KEY);
    if (id && N) {
      await N.cancelScheduledNotificationAsync(id).catch(() => {});
    }
  } catch { /* best-effort */ } finally {
    AsyncStorage.removeItem(EOD_NOTIF_ID_KEY).catch(() => {});
    AsyncStorage.removeItem(EOD_NOTIF_HASH_KEY).catch(() => {});
  }
}
