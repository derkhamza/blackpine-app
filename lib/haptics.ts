import { Platform } from "react-native";

// Best-effort tactile feedback: no-op on web, never throws, never blocks.
function safe(run: (H: typeof import("expo-haptics")) => Promise<void>) {
  if (Platform.OS === "web") return;
  try { run(require("expo-haptics")).catch(() => {}); } catch { /* unsupported */ }
}

export function tapLight() {
  safe((H) => H.impactAsync(H.ImpactFeedbackStyle.Light));
}
export function tapMedium() {
  safe((H) => H.impactAsync(H.ImpactFeedbackStyle.Medium));
}
export function tapSuccess() {
  safe((H) => H.notificationAsync(H.NotificationFeedbackType.Success));
}
export function tapError() {
  safe((H) => H.notificationAsync(H.NotificationFeedbackType.Error));
}
export function tapWarning() {
  safe((H) => H.notificationAsync(H.NotificationFeedbackType.Warning));
}
