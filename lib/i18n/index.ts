import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import fr from "./fr";
import ar from "./ar";

const LANG_KEY = "blackpine.language.v1";

export type AppLanguage = "fr" | "ar";

// Detect phone language, default to French
const deviceLang = Localization.getLocales()[0]?.languageCode;
const defaultLang: AppLanguage = deviceLang === "ar" ? "ar" : "fr";

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    ar: { translation: ar },
  },
  lng: defaultLang,
  fallbackLng: "fr",
  interpolation: {
    escapeValue: false,
  },
});

export async function loadSavedLanguage(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(LANG_KEY);
    if (saved === "fr" || saved === "ar") {
      await i18n.changeLanguage(saved);
    }
  } catch {
    // Use default
  }
}

export async function setLanguage(lang: AppLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(LANG_KEY, lang);
}

export function isRTL(): boolean {
  return i18n.language === "ar";
}

export default i18n;