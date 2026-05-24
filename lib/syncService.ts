import { DoctorProfile, Transaction, FixedAsset } from "blackpine-engine";
import { isLoggedIn, pushData, pullData } from "./api";
import { RecurringRule } from "./recurringTransactions";

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

export interface SyncResult {
  success: boolean;
  error?: string;
  timestamp?: string;
  /** Set when the backend says the trial/subscription has expired */
  subscriptionExpired?: boolean;
  /** The authoritative trial start date from the server (when expired) */
  serverTrialStart?: string | null;
  /**
   * True when the failure was caused by the device being offline (no network),
   * as opposed to a server-side or auth error.
   * Callers use this to queue a retry rather than surface a hard error.
   */
  offline?: boolean;
}

/** Heuristic: is this error a network-connectivity failure vs a server error? */
function isNetworkError(err: any): boolean {
  const msg = String(err?.message ?? "").toLowerCase();
  return (
    msg.includes("network request failed") ||
    msg.includes("failed to fetch") ||
    msg.includes("network error") ||
    msg.includes("fetch error") ||
    msg.includes("could not connect") ||
    msg.includes("timeout") ||
    err?.name === "AbortError" ||
    err?.type === "system"
  );
}

export interface SyncPullData {
  profile: DoctorProfile | null;
  transactions: Transaction[];
  assets: FixedAsset[];
  recurringRules: RecurringRule[];
  /** Authoritative subscription info from the server */
  serverSubscription?: { trialStart: string | null; plan: string; expiresAt: string | null } | null;
  /** Set when the backend blocked the pull due to expired subscription */
  subscriptionExpired?: boolean;
  serverTrialStart?: string | null;
}

export async function syncPush(
  profile: DoctorProfile,
  transactions: Transaction[],
  assets?: FixedAsset[],
  recurringRules?: RecurringRule[]
): Promise<SyncResult> {
  try {
    const loggedIn = await isLoggedIn();
    if (!loggedIn) return { success: true };
    await pushData(profile, transactions, assets, recurringRules);
    const now = new Date().toISOString();
    if (__DEV__) console.log("[SYNC] Push succeeded at", now);
    return { success: true, timestamp: now };
  } catch (err: any) {
    if (__DEV__) console.warn("[SYNC] Push failed:", err.message);
    if (err.code === "subscription_expired") {
      return { success: false, error: err.message, subscriptionExpired: true, serverTrialStart: err.trialStart };
    }
    return { success: false, error: err.message, offline: isNetworkError(err) };
  }
}

export async function syncPull(): Promise<SyncPullData | null> {
  try {
    const loggedIn = await isLoggedIn();
    if (!loggedIn) return null;
    const data = await pullData();
    if (__DEV__) console.log("[SYNC] Pull succeeded");
    return data;
  } catch (err: any) {
    if (__DEV__) console.warn("[SYNC] Pull failed:", err.message);
    if (err.code === "subscription_expired") {
      return {
        profile: null, transactions: [], assets: [], recurringRules: [],
        subscriptionExpired: true, serverTrialStart: err.trialStart,
      };
    }
    return null;
  }
}
