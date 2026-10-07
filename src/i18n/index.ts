import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import esTranslation from './es.json';
import enTranslation from './en.json';
import zhTranslation from './zh.json';

// Detect or restore saved language from localStorage (defaults to 'es')
const savedLanguage = typeof window !== 'undefined' ? localStorage.getItem('fixit_language') : null;
const initialLanguage = savedLanguage === 'en' || savedLanguage === 'zh' ? savedLanguage : 'es';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: esTranslation },
      en: { translation: enTranslation },
      zh: { translation: zhTranslation },
    },
    lng: initialLanguage,
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false, // React handles XSS escaping
    },
  });

export const SUPPORTED_LANGUAGES = [
  { code: 'es', label: 'Español', short: 'ES', flag: '🇪🇸' },
  { code: 'en', label: 'English', short: 'EN', flag: '🇺🇸' },
  { code: 'zh', label: '中文', short: 'ZH', flag: '🇨🇳' },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export const changeAppLanguage = (lang: SupportedLanguage) => {
  i18n.changeLanguage(lang);
  if (typeof window !== 'undefined') {
    localStorage.setItem('fixit_language', lang);
    document.documentElement.lang = lang;
  }
};

export default i18n;
