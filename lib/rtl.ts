import { I18nManager } from "react-native";
import { isRTL } from "./i18n";

export function applyRTL(): void {
  const rtl = isRTL();
  if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(rtl);
  }
}