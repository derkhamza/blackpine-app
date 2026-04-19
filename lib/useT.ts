import { useState, useEffect, useCallback } from "react";
import fr from "./i18n/fr";
import ar from "./i18n/ar";
import en from "./i18n/en";
import { AppLanguage, getLanguage, setLanguage as saveLang } from "./i18n";
import { applyRTL } from "./rtl";

const translations: Record<AppLanguage, any> = { fr, ar, en };

let listeners: Array<(lang: AppLanguage) => void> = [];

function notifyAll(lang: AppLanguage) {
  listeners.forEach((fn) => fn(lang));
}

export function useT() {
  const [lang, setLang] = useState<AppLanguage>(getLanguage());

  useEffect(() => {
    const handler = (newLang: AppLanguage) => setLang(newLang);
    listeners.push(handler);
    return () => {
      listeners = listeners.filter((fn) => fn !== handler);
    };
  }, []);

  const t = useCallback(
    (key: string): string => {
      const keys = key.split(".");
      let result: any = translations[lang] || translations.fr;
      for (const k of keys) {
        result = result?.[k];
      }
      return (result as string) ?? key;
    },
    [lang]
  );

  const changeLanguage = useCallback(async (newLang: AppLanguage) => {
    await saveLang(newLang);
    applyRTL();
    notifyAll(newLang);
  }, []);

  return {
    t,
    currentLang: lang,
    isRTL: lang === "ar",
    changeLanguage,
  };
}