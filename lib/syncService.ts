import { DoctorProfile, Transaction, FixedAsset } from "blackpine-engine";
import { isLoggedIn, pushData, pullData } from "./api";

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

export interface SyncResult {
  success: boolean;
  error?: string;
  timestamp?: string;
}

export async function syncPush(
  profile: DoctorProfile,
  transactions: Transaction[],
  assets?: FixedAsset[],
  recurringRules?: any[]
): Promise<SyncResult> {
  try {
    const loggedIn = await isLoggedIn();
    if (!loggedIn) return { success: true };
    await pushData(profile, transactions, assets, recurringRules);
    const now = new Date().toISOString();
    console.log("[SYNC] Push succeeded at", now);
    return { success: true, timestamp: now };
  } catch (err: any) {
    console.warn("[SYNC] Push failed:", err.message);
    return { success: false, error: err.message };
  }
}

export async function syncPull(): Promise<{
  profile: DoctorProfile | null;
  transactions: Transaction[];
  assets: FixedAsset[];
  recurringRules: any[];
} | null> {
  try {
    const loggedIn = await isLoggedIn();
    if (!loggedIn) return null;
    const data = await pullData();
    console.log("[SYNC] Pull succeeded");
    return data;
  } catch (err: any) {
    console.warn("[SYNC] Pull failed:", err.message);
    return null;
  }
}