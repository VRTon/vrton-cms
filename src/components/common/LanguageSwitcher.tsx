import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../../i18n/languages';
import type { LanguageCode } from '../../types';

const languageCodes = SUPPORTED_LANGUAGES.map((lang) => lang.code);
const fallbackLanguage = languageCodes[0] || 'en';

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const normalizedLanguage = i18n.language.split('-')[0];
  const currentLanguage = languageCodes.includes(normalizedLanguage) ? normalizedLanguage : fallbackLanguage;

  const buildLocalizedPath = (targetLang: LanguageCode) => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const hasLangPrefix = pathSegments.length > 0 && languageCodes.includes(pathSegments[0]);
    const remainder = hasLangPrefix ? `/${pathSegments.slice(1).join('/')}` : location.pathname;
    const normalized = remainder === '' ? '/' : remainder;
    return normalized === '/' ? `/${targetLang}/` : `/${targetLang}${normalized}`;
  };

  const switchLanguage = (targetLang: LanguageCode) => {
    const targetPath = buildLocalizedPath(targetLang);
    void i18n.changeLanguage(targetLang);
    navigate(`${targetPath}${location.hash}`);
  };

  return (
    <select
      value={currentLanguage}
      onChange={(event) => switchLanguage(event.target.value as LanguageCode)}
      className="nav-link"
      title="Language"
      aria-label="Language"
    >
      {SUPPORTED_LANGUAGES.map((language) => (
        <option key={language.code} value={language.code}>
          {`${language.flag} ${language.label}`}
        </option>
      ))}
    </select>
  );
}

export default LanguageSwitcher;
