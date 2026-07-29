import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAccessibility } from '../../hooks/useAccessibility.ts';

function AccessibilityToggle() {
  const { t } = useTranslation();
  const { enabled, toggle } = useAccessibility();

  const label = enabled ? t('a11y.disable') : t('a11y.enable');

  return (
    <button
      type="button"
      className={`a11y-toggle${enabled ? ' a11y-toggle-active' : ''}`}
      onClick={toggle}
      title={label}
      aria-label={label}
      aria-pressed={enabled}
    >
      <i className="fa-solid fa-universal-access" aria-hidden="true" />
    </button>
  );
}

export default AccessibilityToggle;
