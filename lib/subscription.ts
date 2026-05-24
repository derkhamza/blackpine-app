import { TRIAL_DAYS } from "./constants";

export type PlanType = "free_trial" | "monthly" | "yearly" | "lifetime";

export interface SubscriptionState {
  trialStartDate: string;
  plan: PlanType;
  expiresAt: string | null;
}

export function getDefaultSubscription(): SubscriptionState {
  return {
    trialStartDate: new Date().toISOString().split("T")[0],
    plan: "free_trial",
    expiresAt: null,
  };
}

export function getTrialDaysLeft(sub: SubscriptionState): number {
  const start = new Date(sub.trialStartDate);
  const now = new Date();
  const elapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, TRIAL_DAYS - elapsed);
}

export function isSubscriptionActive(sub: SubscriptionState): boolean {
  if (sub.plan === "free_trial") return getTrialDaysLeft(sub) > 0;
  if (sub.plan === "lifetime") return true;
  if (!sub.expiresAt) return false;
  return new Date(sub.expiresAt) > new Date();
}

export function activateSubscription(sub: SubscriptionState, plan: PlanType, durationDays: number | null): SubscriptionState {
  let expiresAt: string | null = null;
  if (durationDays !== null) {
    const exp = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    expiresAt = exp.toISOString().split("T")[0];
  }
  return { ...sub, plan, expiresAt };
}

export async function validateActivationCodeOnline(code: string): Promise<{ valid: boolean; plan?: PlanType; durationDays?: number | null }> {
  try {
    const res = await fetch("https://blackpine-backend.vercel.app/subscription/validate-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok) return { valid: false };
    return { valid: true, plan: data.plan as PlanType, durationDays: data.durationDays };
  } catch (e) {
    if (__DEV__) console.warn("[subscription] Code validation request failed:", e);
    return { valid: false };
  }
}

export const PRICING = {
  monthly: { price: 49, label: "49 MAD/mois" },
  yearly: { price: 399, label: "399 MAD/an", savings: "32%" },
  lifetime: { price: 999, label: "999 MAD (à vie)" },
};