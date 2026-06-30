/**
 * Secretary invite API
 *
 * Backend endpoints expected (all at API_BASE = blackpine-backend.vercel.app):
 *
 *   POST /invite/create          — doctor (JWT) creates a 6-char invite code, expires 48h
 *   POST /invite/redeem          — { code } → { secretaryToken, ownerUserId, ownerName }
 *   POST /cabinet/push           — doctor (JWT) pushes appointments + patients to cabinet store
 *   GET  /cabinet/pull           — secretary (secretaryToken) → appointments + patients + doctorProfile
 *   POST /cabinet/appointments   — secretary (secretaryToken) → upsert appointments only
 *   POST /cabinet/patients       — secretary (secretaryToken) → upsert patients (name+phone only)
 *   DELETE /invite               — doctor (JWT) revokes all active invite codes
 */

import { Appointment, DoctorProfile, Patient } from "./cabinetTypes";
import {
  getDoctorToken as _getDoctorToken,
  getSecretarySession,
  setSecretarySession,
  deleteSecretarySession,
} from "./tokenStorage";

const API_BASE = "https://blackpine-backend.vercel.app";
const REQUEST_TIMEOUT_MS = 15_000;

function fetchWithTimeout(url: string, opts: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SecretarySession {
  secretaryToken: string;
  ownerUserId: string;
  ownerName: string;      // "Dr. Hamid Benali" — shown in secretary UI header
  inviteCode: string;
  linkedAt: string;       // ISO date
}

export interface CabinetSnapshot {
  appointments: Appointment[];
  patients: Patient[];
  doctorProfile: DoctorProfile;
}

// ─── Secretary session storage ────────────────────────────────────────────────

export async function loadSecretarySession(): Promise<SecretarySession | null> {
  try {
    const raw = await getSecretarySession();
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveSecretarySession(s: SecretarySession): Promise<void> {
  await setSecretarySession(JSON.stringify(s));
}

export async function clearSecretarySession(): Promise<void> {
  await deleteSecretarySession();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function doctorToken(): Promise<string | null> {
  return _getDoctorToken();
}

async function requestWithDoctor(path: string, opts: RequestInit = {}): Promise<Response> {
  const token = await doctorToken();
  return fetchWithTimeout(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers as Record<string, string> || {}),
    },
  });
}

async function requestWithSecretary(path: string, secretaryToken: string, opts: RequestInit = {}): Promise<Response> {
  return fetchWithTimeout(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secretaryToken}`,
      ...(opts.headers as Record<string, string> || {}),
    },
  });
}

// ─── Doctor-side API calls ────────────────────────────────────────────────────

/** Doctor creates a new 6-char invite code (replaces any existing one). */
export async function createInviteCode(): Promise<{ code: string; expiresAt: string }> {
  const res = await requestWithDoctor("/invite/create", { method: "POST" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Doctor revokes all active invite codes (secretary loses access on next sync). */
export async function revokeInvite(): Promise<void> {
  const res = await requestWithDoctor("/invite/revoke", { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
}

/**
 * Doctor pushes the cabinet snapshot (appointments + patients + doctorProfile)
 * to the server so the secretary can pull it.
 * Call this whenever appointments or patients change and an invite is active.
 */
export async function pushCabinetSnapshot(snapshot: CabinetSnapshot): Promise<void> {
  const res = await requestWithDoctor("/cabinet/push", {
    method: "POST",
    body: JSON.stringify(snapshot),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
}

// ─── Secretary-side API calls ─────────────────────────────────────────────────

/** Secretary redeems an invite code and gets a session token. */
export async function redeemInviteCode(code: string): Promise<SecretarySession> {
  const res = await fetchWithTimeout(`${API_BASE}/invite/redeem`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: code.trim().toUpperCase() }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Code invalide ou expiré`);
  }
  const data = await res.json();
  const session: SecretarySession = {
    secretaryToken: data.secretaryToken,
    ownerUserId: data.ownerUserId,
    ownerName: data.ownerName || "Cabinet médical",
    inviteCode: code.trim().toUpperCase(),
    linkedAt: new Date().toISOString(),
  };
  await saveSecretarySession(session);
  return session;
}

/** Secretary pulls the latest cabinet snapshot (appointments + patients). */
export async function pullCabinetSnapshot(secretaryToken: string): Promise<CabinetSnapshot> {
  const res = await requestWithSecretary("/cabinet/pull", secretaryToken);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Erreur de synchronisation secrétaire`);
  }
  return res.json();
}

/** Secretary pushes updated appointments back to the server. */
export async function pushSecretaryAppointments(
  secretaryToken: string,
  appointments: Appointment[],
): Promise<void> {
  const res = await requestWithSecretary("/cabinet/appointments", secretaryToken, {
    method: "POST",
    body: JSON.stringify({ appointments }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
}

/** Secretary pushes new/updated patients back to the server. */
export async function pushSecretaryPatients(
  secretaryToken: string,
  patients: Patient[],
): Promise<void> {
  const res = await requestWithSecretary("/cabinet/patients", secretaryToken, {
    method: "POST",
    body: JSON.stringify({ patients }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
}

/**
 * Secretary posts a batch of behavioural event names (best-effort).
 * Attributed server-side to the owner doctor as platform "mobile-secretary".
 */
export async function postSecretaryEvents(
  secretaryToken: string,
  names: string[],
): Promise<void> {
  if (!names.length) return;
  try {
    await requestWithSecretary("/events/secretary", secretaryToken, {
      method: "POST",
      body: JSON.stringify({ events: names.map((name) => ({ name })) }),
    });
  } catch { /* analytics must never surface an error */ }
}
