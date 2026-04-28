function getAS() { return require("@react-native-async-storage/async-storage").default; }
import { DoctorProfile, Transaction, FixedAsset } from "blackpine-engine";
import { SubscriptionState } from "./subscription";
const KEYS = {
  PROFILE: "blackpine.profile.v1",
  TRANSACTIONS: "blackpine.transactions.v1",
  SUBSCRIPTION: "blackpine.subscription.v1",
  LAST_SAVED: "blackpine.lastSaved.v1",
  ONBOARDED: "blackpine.onboarded.v1",
  RECURRING: "blackpine.recurring.v1",
  ASSETS: "blackpine.assets.v1",
} as const;

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
export async function saveRecurringRules(rules: any[]): Promise<void> {
  await getAS().setItem(KEYS.RECURRING, JSON.stringify(rules));
}

export async function loadRecurringRules(): Promise<any[]> {
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
      assets: assetsRaw ? JSON.parse(assetsRaw) : [],
      onboarded: onboardedRaw === "true",
    };
  } catch (err) {
    console.warn("Failed to load state:", err);
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
  await getAS().multiRemove([
    KEYS.PROFILE,
    KEYS.TRANSACTIONS,
    KEYS.LAST_SAVED,
    KEYS.ONBOARDED,
  ]);
}

function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}