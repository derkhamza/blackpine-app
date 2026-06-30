import { AppState } from "react-native";
import { postEvents, isLoggedIn } from "./api";
import { postSecretaryEvents } from "./inviteApi";

// Lightweight behavioural analytics for the mobile app — mirrors the web
// pipeline (blackpine-web/src/lib/analytics.ts). Queues sanitized event NAMES
// and flushes them in batches to POST /events. Stores no PII. Drops the queue
// when the user isn't signed in, so the auth/onboarding screens aren't tracked.

let queue: string[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let lastScreen = "";

async function flush(): Promise<void> {
  if (timer) { clearTimeout(timer); timer = null; }
  if (queue.length === 0) return;
  // Only ship if signed in; otherwise discard (avoids unbounded growth + noise).
  if (!(await isLoggedIn())) { queue = []; lastScreen = ""; return; }
  const batch = queue.splice(0, 50);
  void postEvents(batch);
}

function schedule(): void {
  if (queue.length >= 10) { void flush(); return; }
  if (!timer) timer = setTimeout(() => { void flush(); }, 5000);
}

/** Queue a sanitized event name (e.g. "action:create_rdv"). */
export function track(name: string): void {
  queue.push(name);
  schedule();
}

/** Track a screen view. Pass the React Navigation route name. */
export function trackScreen(name: string): void {
  const norm = "page:/" + String(name || "")
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9:_/.-]/gi, "")
    .toLowerCase();
  if (norm === lastScreen) return;
  lastScreen = norm;
  track(norm);
}

// ── Secretary analytics ───────────────────────────────────────────────────────
// The secretary runs a separate app shell with its own token, so it can't use
// the doctor pipeline above. Events are posted via the secretary token and
// attributed server-side to the owner doctor (platform "mobile-secretary").

let secQueue: string[] = [];
let secTimer: ReturnType<typeof setTimeout> | null = null;
let secToken = "";

function flushSec(): void {
  if (secTimer) { clearTimeout(secTimer); secTimer = null; }
  if (secQueue.length === 0 || !secToken) return;
  const batch = secQueue.splice(0, 50);
  void postSecretaryEvents(secToken, batch);
}

function scheduleSec(): void {
  if (secQueue.length >= 10) { flushSec(); return; }
  if (!secTimer) secTimer = setTimeout(flushSec, 5000);
}

/** Bind the active secretary session token (call on login; "" on logout). */
export function setSecretaryToken(token: string): void {
  secToken = token || "";
  if (!secToken) { secQueue = []; if (secTimer) { clearTimeout(secTimer); secTimer = null; } }
}

/** Queue a secretary event name (already sec-prefixed by the caller). */
export function trackSecretary(name: string): void {
  if (!secToken) return;
  secQueue.push(name);
  scheduleSec();
}

// Flush whatever is queued when the app goes to the background.
AppState.addEventListener("change", (state) => {
  if (state === "background" || state === "inactive") { void flush(); flushSec(); }
});
