import React from 'react';
import { useTranslation } from 'react-i18next';
import useTheme from '../../hooks/useTheme.ts';

function ThemeToggle() {
  const { t } = useTranslation();
  const { isDark, toggle } = useTheme();

  const label = isDark ? t('theme.switch_to_light') : t('theme.switch_to_dark');

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      title={label}
      aria-label={label}
      aria-pressed={isDark}
    >
      <i className={isDark ? 'fa-solid fa-moon' : 'fa-solid fa-sun'} aria-hidden="true" />
    </button>
  );
}

export default ThemeToggle;
