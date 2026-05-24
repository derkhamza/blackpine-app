/**
 * Shared utility helpers used across the app.
 * Keep this file small — only pure functions with no React/RN dependencies.
 */

/** Generate a collision-resistant local ID. */
export function uuid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Current date as ISO "YYYY-MM-DD". */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Add `n` days to an ISO date string.
 * Pass `inclusive = true` (default false) to treat the end date as inclusive
 * (i.e., a 3-day rest-from = day N to day N+2, not N+3).
 */
export function addDays(iso: string, n: number, inclusive = false): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n - (inclusive ? 1 : 0));
  return d.toISOString().slice(0, 10);
}

/** Current time as "HH:MM". */
export function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
