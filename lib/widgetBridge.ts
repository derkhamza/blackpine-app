/**
 * widgetBridge.ts
 *
 * Thin wrapper around the native BlackpineWidget module.
 * Updates both Android (SharedPreferences) and iOS (UserDefaults App Group)
 * with the JSON payload the home-screen widget reads.
 *
 * Safe to call in non-native environments (Expo Go, web) — operations are
 * no-ops when the native module is unavailable.
 *
 * Uses a module-level cache so appointment updates (from CabinetContext) and
 * financial updates (from AppContext) can be written independently without
 * each context needing access to the other's data.
 */

import { NativeModules } from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WidgetData {
  /** Number of non-cancelled appointments today */
  todayCount: number;
  /** Next appointment start time "HH:MM", or null if none remaining today */
  nextApptTime: string | null;
  /** Total RECETTE transactions for the current calendar month (MAD) */
  monthRecettes: number;
  /** Net result for the current calendar month: recettes − charges (MAD) */
  monthNet: number;
  /** Days until the next tax deadline, or null if unavailable */
  taxDaysLeft: number | null;
  /** Short label for the deadline, e.g. "IR 31/03" */
  taxLabel: string | null;
  /** ISO timestamp of the last update */
  updatedAt: string;
}

// ─── Native module ────────────────────────────────────────────────────────────

// The native module is registered as "BlackpineWidget" on both platforms.
const NativeWidget = NativeModules.BlackpineWidget as
  | { updateData: (json: string) => void }
  | undefined;

// ─── Module-level merge cache ─────────────────────────────────────────────────

let _cache: WidgetData = {
  todayCount: 0,
  nextApptTime: null,
  monthRecettes: 0,
  monthNet: 0,
  taxDaysLeft: null,
  taxLabel: null,
  updatedAt: new Date().toISOString(),
};

function pushToNative(): void {
  if (!NativeWidget) return;
  try {
    NativeWidget.updateData(JSON.stringify(_cache));
  } catch {
    // Never crash the app over a widget update
  }
}

function patchCache(update: Partial<Omit<WidgetData, "updatedAt">>): void {
  _cache = { ..._cache, ...update, updatedAt: new Date().toISOString() };
  pushToNative();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Update appointment-related widget fields (called by CabinetContext).
 * Financial fields are preserved from the last financial update.
 */
export function updateWidgetAppts(data: {
  todayCount: number;
  nextApptTime: string | null;
}): void {
  patchCache(data);
}

/**
 * Update financial widget fields (called by AppContext).
 * Appointment fields are preserved from the last appointment update.
 */
export function updateWidgetFinances(data: {
  monthRecettes: number;
  monthNet: number;
  taxDaysLeft: number | null;
  taxLabel: string | null;
}): void {
  patchCache(data);
}

/**
 * Legacy compat shim — accepts the old WidgetData shape and delegates to
 * updateWidgetAppts. Kept so CabinetContext callers don't need changing.
 */
export function updateWidget(data: {
  todayCount: number;
  nextApptTime: string | null;
  updatedAt: string;
}): void {
  updateWidgetAppts({ todayCount: data.todayCount, nextApptTime: data.nextApptTime });
}

/**
 * Clear widget to zero (e.g. on logout).
 */
export function clearWidget(): void {
  _cache = {
    todayCount: 0,
    nextApptTime: null,
    monthRecettes: 0,
    monthNet: 0,
    taxDaysLeft: null,
    taxLabel: null,
    updatedAt: new Date().toISOString(),
  };
  pushToNative();
}
