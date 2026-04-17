import AsyncStorage from "@react-native-async-storage/async-storage";
import { DoctorProfile, Transaction } from "blackpine-engine";

const KEYS = {
  PROFILE: "blackpine.profile.v1",
  TRANSACTIONS: "blackpine.transactions.v1",
  LAST_SAVED: "blackpine.lastSaved.v1",
  ONBOARDED: "blackpine.onboarded.v1",
} as const;

export interface PersistedState {
  profile: DoctorProfile | null;
  transactions: Transaction[];
  lastSavedAt: string | null;
  onboarded: boolean;
}

export async function loadState(): Promise<PersistedState> {
  try {
    const [profileRaw, txsRaw, lastSavedRaw, onboardedRaw] = await Promise.all([
      AsyncStorage.getItem(KEYS.PROFILE),
      AsyncStorage.getItem(KEYS.TRANSACTIONS),
      AsyncStorage.getItem(KEYS.LAST_SAVED),
      AsyncStorage.getItem(KEYS.ONBOARDED),
    ]);
    return {
      profile: profileRaw ? safeParse<DoctorProfile>(profileRaw) : null,
      transactions: txsRaw ? safeParse<Transaction[]>(txsRaw) ?? [] : [],
      lastSavedAt: lastSavedRaw,
      onboarded: onboardedRaw === "true",
    };
  } catch (err) {
    console.warn("Failed to load state:", err);
    return { profile: null, transactions: [], lastSavedAt: null, onboarded: false };
  }
}

export async function saveState(profile: DoctorProfile, transactions: Transaction[]): Promise<string> {
  const now = new Date().toISOString();
  await AsyncStorage.multiSet([
    [KEYS.PROFILE, JSON.stringify(profile)],
    [KEYS.TRANSACTIONS, JSON.stringify(transactions)],
    [KEYS.LAST_SAVED, now],
  ]);
  return now;
}

export async function setOnboarded(value: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.ONBOARDED, value ? "true" : "false");
}

export async function clearState(): Promise<void> {
  await AsyncStorage.multiRemove([
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