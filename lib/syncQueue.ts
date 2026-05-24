/**
 * Offline sync queue — a single persistent dirty flag.
 *
 * When a cloud push fails due to network unavailability the flag is set.
 * It survives app kills. On the next foreground / retry attempt the caller
 * checks hasPendingSync() and drains the queue.
 *
 * We don't queue individual writes — the push is always a full-state snapshot,
 * so "queue draining" just means "try the push again with the current state."
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_KEY = "bpc_sync_pending_v1";

/** Mark that local data has unsynchronised changes. Call after a network failure. */
export async function markPendingSync(): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_KEY, new Date().toISOString());
  } catch { /* best-effort */ }
}

/** Clear the pending flag after a successful push. */
export async function clearPendingSync(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_KEY);
  } catch { /* best-effort */ }
}

/** Returns true if there are unsynchronised local changes. */
export async function hasPendingSync(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PENDING_KEY)) !== null;
  } catch {
    return false;
  }
}
