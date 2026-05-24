function getAS() { return require("@react-native-async-storage/async-storage").default; }
import { DoctorProfile, Transaction, FixedAsset } from "blackpine-engine";
import { SubscriptionState } from "./subscription";
import { RecurringRule } from "./recurringTransactions";
const KEYS = {
  PROFILE: "blackpine.profile.v1",
  TRANSACTIONS: "blackpine.transactions.v1",
  SUBSCRIPTION: "blackpine.subscription.v1",
  LAST_SAVED: "blackpine.lastSaved.v1",
  ONBOARDED: "blackpine.onboarded.v1",
  RECURRING: "blackpine.recurring.v1",
  ASSETS: "blackpine.assets.v1",
  BIOMETRIC: "blackpine.biometric.v1",
  EOD_NOTIF: "blackpine.eodNotif.v1",
  INVOICE_COUNTER: "blackpine.invoiceCounter.v1",
  THEME_MODE: "blackpine.themeMode.v1",
  DEMO_MODE: "blackpine.demoMode.v1",
} as const;

export async function saveDemoMode(on: boolean): Promise<void> {
  await getAS().setItem(KEYS.DEMO_MODE, JSON.stringify(on));
}

export async function loadDemoMode(): Promise<boolean> {
  try {
    const raw = await getAS().getItem(KEYS.DEMO_MODE);
    return raw ? JSON.parse(raw) : false;
  } catch {
    return false;
  }
}

/** Atomically increments the invoice counter and returns the next formatted number. */
export async function getNextInvoiceNumber(): Promise<string> {
  const raw = await getAS().getItem(KEYS.INVOICE_COUNTER);
  const next = (raw ? parseInt(raw, 10) : 0) + 1;
  await getAS().setItem(KEYS.INVOICE_COUNTER, String(next));
  return `NOH-${new Date().getFullYear()}-${String(next).padStart(4, "0")}`;
}

export type ThemeMode = "system" | "light" | "dark";

export async function saveThemeMode(mode: ThemeMode): Promise<void> {
  await getAS().setItem(KEYS.THEME_MODE, mode);
}

export async function loadThemeMode(): Promise<ThemeMode> {
  try {
    const raw = await getAS().getItem(KEYS.THEME_MODE);
    if (raw === "dark" || raw === "light" || raw === "system") return raw;
    return "system";
  } catch {
    return "system";
  }
}

export async function saveBiometricEnabled(enabled: boolean): Promise<void> {
  await getAS().setItem(KEYS.BIOMETRIC, JSON.stringify(enabled));
}

export async function loadBiometricEnabled(): Promise<boolean> {
  try {
    const raw = await getAS().getItem(KEYS.BIOMETRIC);
    return raw ? JSON.parse(raw) : false;
  } catch {
    return false;
  }
}

export async function saveEodNotifEnabled(enabled: boolean): Promise<void> {
  await getAS().setItem(KEYS.EOD_NOTIF, JSON.stringify(enabled));
}

export async function loadEodNotifEnabled(): Promise<boolean> {
  try {
    const raw = await getAS().getItem(KEYS.EOD_NOTIF);
    return raw ? JSON.parse(raw) : true; // on by default
  } catch {
    return true;
  }
}

export interface PersistedState {
  profile: DoctorProfile | null;
  transactions: Transaction[];
  lastSavedAt: string | null;
  onboarded: boolean;
    assets: FixedAsset[];
}
export async function saveSubscription(sub: SubscriptionState): Promise<void> {
  await getAS().setItem(KEYS.SUBSCRIPTION, JSON.stringify(sub));
}
export async function saveRecurringRules(rules: RecurringRule[]): Promise<void> {
  await getAS().setItem(KEYS.RECURRING, JSON.stringify(rules));
}

export async function loadRecurringRules(): Promise<RecurringRule[]> {
  const raw = await getAS().getItem(KEYS.RECURRING);
  return raw ? JSON.parse(raw) : [];
}
export async function loadSubscription(): Promise<SubscriptionState | null> {
  const raw = await getAS().getItem(KEYS.SUBSCRIPTION);
  return raw ? JSON.parse(raw) : null;
}
export async function loadState(): Promise<PersistedState> {
  try {
    const assetsRaw = await getAS().getItem(KEYS.ASSETS);
    const [profileRaw, txsRaw, lastSavedRaw, onboardedRaw] = await Promise.all([
      
      getAS().getItem(KEYS.PROFILE),
      getAS().getItem(KEYS.TRANSACTIONS),
      getAS().getItem(KEYS.LAST_SAVED),
      getAS().getItem(KEYS.ONBOARDED),
    ]);
    return {
      profile: profileRaw ? safeParse<DoctorProfile>(profileRaw) : null,
      transactions: txsRaw ? safeParse<Transaction[]>(txsRaw) ?? [] : [],
      lastSavedAt: lastSavedRaw,
      assets: assetsRaw ? safeParse<FixedAsset[]>(assetsRaw) ?? [] : [],
      onboarded: onboardedRaw === "true",
    };
  } catch (err) {
    if (__DEV__) console.warn("[storage] Failed to load state:", err);
    return { profile: null, transactions: [], lastSavedAt: null, assets: [], onboarded: false };
  }
}

export async function saveState(profile: DoctorProfile, transactions: Transaction[], assets?: FixedAsset[]): Promise<string> {
  const now = new Date().toISOString();
  const pairs: [string, string][] = [
    [KEYS.PROFILE, JSON.stringify(profile)],
    [KEYS.TRANSACTIONS, JSON.stringify(transactions)],
    [KEYS.LAST_SAVED, now],
  ];
  if (assets) pairs.push([KEYS.ASSETS, JSON.stringify(assets)]);
  await getAS().multiSet(pairs);
  return now;
}

export async function setOnboarded(value: boolean): Promise<void> {
  await getAS().setItem(KEYS.ONBOARDED, value ? "true" : "false");
}

export async function clearState(): Promise<void> {
  // Clear all account-scoped data on logout.
  // INVOICE_COUNTER and THEME_MODE are intentionally kept — they are
  // device-level preferences that survive account switches.
  await getAS().multiRemove([
    KEYS.PROFILE,
    KEYS.TRANSACTIONS,
    KEYS.LAST_SAVED,
    KEYS.ONBOARDED,
    KEYS.SUBSCRIPTION,
    KEYS.RECURRING,
    KEYS.ASSETS,
    KEYS.BIOMETRIC,
  ]);
}

function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}