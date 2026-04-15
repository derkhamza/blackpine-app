import AsyncStorage from "@react-native-async-storage/async-storage";
import { DoctorProfile, Transaction } from "blackpine-engine";

const KEYS = {
  PROFILE: "blackpine.profile.v1",
  TRANSACTIONS: "blackpine.transactions.v1",
  LAST_SAVED: "blackpine.lastSaved.v1",
} as const;

export interface PersistedState {
  profile: DoctorProfile | null;
  transactions: Transaction[];
  lastSavedAt: string | null;
}

/**
 * Loads everything from device storage. Returns nulls for missing keys
 * (first-time launch). Never throws — corrupted data returns nulls and
 * logs to console.
 */
export async function loadState(): Promise<PersistedState> {
  try {
    const [profileRaw, txsRaw, lastSavedRaw] = await Promise.all([
      AsyncStorage.getItem(KEYS.PROFILE),
      AsyncStorage.getItem(KEYS.TRANSACTIONS),
      AsyncStorage.getItem(KEYS.LAST_SAVED),
    ]);

    return {
      profile: profileRaw ? safeParse<DoctorProfile>(profileRaw) : null,
      transactions: txsRaw ? safeParse<Transaction[]>(txsRaw) ?? [] : [],
      lastSavedAt: lastSavedRaw,
    };
  } catch (err) {
    console.warn("Failed to load state:", err);
    return { profile: null, transactions: [], lastSavedAt: null };
  }
}

/**
 * Saves profile and transactions atomically (as much as AsyncStorage allows).
 * Stamps lastSavedAt so the UI can show "saved at 14:32".
 */
export async function saveState(
  profile: DoctorProfile,
  transactions: Transaction[]
): Promise<string> {
  const now = new Date().toISOString();
  await AsyncStorage.multiSet([
    [KEYS.PROFILE, JSON.stringify(profile)],
    [KEYS.TRANSACTIONS, JSON.stringify(transactions)],
    [KEYS.LAST_SAVED, now],
  ]);
  return now;
}

/**
 * Wipes everything. Useful for "reset to demo data" and for testing.
 */
export async function clearState(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.PROFILE, KEYS.TRANSACTIONS, KEYS.LAST_SAVED]);
}

function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}