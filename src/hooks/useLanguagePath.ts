import { useTranslation } from 'react-i18next';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '../i18n/languages';

const supportedCodes = new Set(SUPPORTED_LANGUAGES.map((lang) => lang.code));

export function useLanguagePath() {
  const { i18n } = useTranslation();

  const localizePath = (path: string): string => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    const lang = supportedCodes.has(i18n.language) ? i18n.language : DEFAULT_LANGUAGE;
    if (lang !== DEFAULT_LANGUAGE) {
      return `/${lang}${normalized}`.replace('//', '/');
    }
    return normalized;
  };

  return { localizePath };
}