/**
 * Secure credential storage using expo-secure-store.
 *
 * iOS  → Keychain (hardware-encrypted, excluded from backups by default)
 * Android API 23+ → EncryptedSharedPreferences backed by Android Keystore
 *
 * Migration: on first read after an app update, if the value is absent from
 * SecureStore we transparently pull from the legacy AsyncStorage key, write it
 * into SecureStore, and delete the plaintext copy — so existing sessions
 * survive the upgrade without requiring a re-login.
 *
 * SecureStore keys must NOT contain dots on some iOS Keychain implementations,
 * so we use underscores.
 */

import * as SecureStore from "expo-secure-store";

// ─── Key constants ────────────────────────────────────────────────────────────

const SS_DOCTOR_TOKEN      = "blackpine_auth_token_v1";
const SS_SECRETARY_SESSION = "blackpine_secretary_session_v1";

// Legacy AsyncStorage keys (plaintext, being migrated away from)
const LEGACY_DOCTOR_TOKEN      = "blackpine.auth.token.v1";
const LEGACY_SECRETARY_SESSION = "blackpine.secretary.session.v1";

// ─── AsyncStorage helper (lazy) ────────────────────────────────────────────────

async function AS() {
  return require("@react-native-async-storage/async-storage").default;
}

// ─── Doctor JWT token ─────────────────────────────────────────────────────────

export async function getDoctorToken(): Promise<string | null> {
  try {
    const value = await SecureStore.getItemAsync(SS_DOCTOR_TOKEN);
    if (value !== null) return value;

    // Migration: pull from legacy AsyncStorage
    const legacy = await (await AS()).getItem(LEGACY_DOCTOR_TOKEN);
    if (legacy) {
      await SecureStore.setItemAsync(SS_DOCTOR_TOKEN, legacy);
      await (await AS()).removeItem(LEGACY_DOCTOR_TOKEN);
    }
    return legacy;
  } catch {
    // Fallback for simulators / environments where SecureStore is unavailable
    return (await AS()).getItem(LEGACY_DOCTOR_TOKEN);
  }
}

export async function setDoctorToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(SS_DOCTOR_TOKEN, token);
    // Ensure no plaintext copy remains
    await (await AS()).removeItem(LEGACY_DOCTOR_TOKEN).catch(() => {});
  } catch {
    await (await AS()).setItem(LEGACY_DOCTOR_TOKEN, token);
  }
}

export async function deleteDoctorToken(): Promise<void> {
  try { await SecureStore.deleteItemAsync(SS_DOCTOR_TOKEN); } catch {}
  try { await (await AS()).removeItem(LEGACY_DOCTOR_TOKEN); } catch {}
}

// ─── Secretary session ────────────────────────────────────────────────────────

export async function getSecretarySession(): Promise<string | null> {
  try {
    const value = await SecureStore.getItemAsync(SS_SECRETARY_SESSION);
    if (value !== null) return value;

    const legacy = await (await AS()).getItem(LEGACY_SECRETARY_SESSION);
    if (legacy) {
      await SecureStore.setItemAsync(SS_SECRETARY_SESSION, legacy);
      await (await AS()).removeItem(LEGACY_SECRETARY_SESSION);
    }
    return legacy;
  } catch {
    return (await AS()).getItem(LEGACY_SECRETARY_SESSION);
  }
}

export async function setSecretarySession(json: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(SS_SECRETARY_SESSION, json);
    await (await AS()).removeItem(LEGACY_SECRETARY_SESSION).catch(() => {});
  } catch {
    await (await AS()).setItem(LEGACY_SECRETARY_SESSION, json);
  }
}

export async function deleteSecretarySession(): Promise<void> {
  try { await SecureStore.deleteItemAsync(SS_SECRETARY_SESSION); } catch {}
  try { await (await AS()).removeItem(LEGACY_SECRETARY_SESSION); } catch {}
}
