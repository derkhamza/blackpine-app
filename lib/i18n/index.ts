import AsyncStorage from "@react-native-async-storage/async-storage";

export type AppLanguage = "fr" | "ar" | "en";

const LANG_KEY = "blackpine.language.v1";

let currentLanguage: AppLanguage = "fr";

export function getLanguage(): AppLanguage {
  return currentLanguage;
}

export async function loadSavedLanguage(): Promise<AppLanguage> {
  try {
    const saved = await AsyncStorage.getItem(LANG_KEY);
    if (saved === "fr" || saved === "ar" || saved === "en") {
      currentLanguage = saved;
    }
  } catch {}
  return currentLanguage;
}

export async function setLanguage(lang: AppLanguage): Promise<void> {
  currentLanguage = lang;
  await AsyncStorage.setItem(LANG_KEY, lang);
}

export function isRTL(): boolean {
  return currentLanguage === "ar";
}