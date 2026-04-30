import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import pl from "./locales/pl.json";

function getSavedLanguage(): string {
  try {
    return window.localStorage.getItem("language") || "en";
  } catch {
    return "en";
  }
}

function persistLanguage(lng: string): void {
  try {
    window.localStorage.setItem("language", lng);
  } catch {
    // Ignore storage errors (e.g. blocked cookies/private mode restrictions).
  }
}

const savedLanguage = getSavedLanguage();

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: en
    },
    pl: {
      translation: pl
    }
  },
  lng: savedLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false
  }
});

i18n.on("languageChanged", (lng) => {
  persistLanguage(lng);
});

export default i18n;
