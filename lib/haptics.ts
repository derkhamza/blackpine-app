export function tapLight() {
  const Haptics = require("expo-haptics");
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
export function tapMedium() {
  const Haptics = require("expo-haptics");
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}
export function tapSuccess() {
  const Haptics = require("expo-haptics");
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
export function tapError() {
  const Haptics = require("expo-haptics");
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
export function tapWarning() {
  const Haptics = require("expo-haptics");
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
