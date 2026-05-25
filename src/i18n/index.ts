import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enFile from '../generated/i18n/en.json';
import esFile from '../generated/i18n/es.json';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './languages';
import type { LanguageCode } from '../types';

const supportedCodes = new Set(SUPPORTED_LANGUAGES.map((lang: Language) => lang.code));

const getLanguageFromPath = (): LanguageCode => {
  const firstSegment = window.location.pathname.split('/').filter(Boolean)[0] as LanguageCode | undefined;
  if (firstSegment && supportedCodes.has(firstSegment)) {
    return firstSegment;
  }
  return DEFAULT_LANGUAGE;
};

const resources = {
  en: { translation: enFile.translation },
  es: { translation: esFile.translation },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getLanguageFromPath(),
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;