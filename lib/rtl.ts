import { I18nManager } from "react-native";
import * as Updates from "expo-updates";
import { isRTL } from "./i18n";

/**
 * Applies RTL layout direction. Requires app restart on change.
 */
export function applyRTL(): void {
  const rtl = isRTL();
  if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(rtl);
  }
}