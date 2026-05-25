import type { Language, LanguageCode } from '../types';

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Espanol', flag: '🇪🇸' },
];

export const DEFAULT_LANGUAGE: LanguageCode = 'es';