import { isRTL } from "./i18n";

export function applyRTL(): void {
  const { I18nManager } = require("react-native");
  const rtl = isRTL();
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
}