import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccessibilityControls } from '../../hooks/useAccessibility.ts';
import useTheme from '../../hooks/useTheme.ts';
import {
  TEXT_SIZE_LARGE,
  TEXT_SIZE_NORMAL,
  TEXT_SIZE_XLARGE,
} from '../../utils/accessibility.ts';
import type { TextSize } from '../../utils/accessibility.ts';
import { DARK, LIGHT, SYSTEM } from '../../utils/theme.ts';
import type { ThemeChoice } from '../../utils/theme.ts';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface SegmentedOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  label: string
  value: T
  options: Array<SegmentedOption<T>>
  onChange: (_value: T) => void
}

function SegmentedControl<T extends string>({ label, value, options, onChange }: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const offset = event.key === 'ArrowRight' || event.key === 'ArrowDown'
      ? 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
        ? -1
        : 0;

    if (offset === 0) {
      return;
    }

    event.preventDefault();
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + offset + options.length) % options.length];
    onChange(next.value);

    const buttons = containerRef.current?.querySelectorAll('button');
    const target = buttons?.[options.indexOf(next)];
    if (target instanceof HTMLElement) {
      target.focus();
    }
  };

  return (
    <div
      ref={containerRef}
      className="a11y-segmented"
      role="radiogroup"
      aria-label={label}
      onKeyDown={handleKeyDown}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={`a11y-segment${selected ? ' a11y-segment-active' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

interface PreferenceCheckboxProps {
  label: string
  checked: boolean
  onChange: (_checked: boolean) => void
  indeterminate?: boolean
  className?: string
}

function PreferenceCheckbox({ label, checked, onChange, indeterminate, className }: PreferenceCheckboxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = Boolean(indeterminate);
    }
  }, [indeterminate]);

  return (
    <label className={className ? `a11y-check ${className}` : 'a11y-check'}>
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function AccessibilityPanel() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const {
    preferences,
    allEnabled,
    partiallyEnabled,
    setAllEnabled,
    setTextSize,
    setHighContrast,
    setReduceMotion,
    setUnderlineLinks,
    reset,
  } = useAccessibilityControls();
  const { choice, setChoice } = useTheme();

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const dialog = dialogRef.current;
    const first = dialog?.querySelector(FOCUSABLE);
    if (first instanceof HTMLElement) {
      first.focus();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== 'Tab' || !dialog) {
        return;
      }

      const focusable = Array.from(dialog.querySelectorAll(FOCUSABLE))
        .filter((node): node is HTMLElement => node instanceof HTMLElement && node.tabIndex !== -1);

      if (focusable.length === 0) {
        return;
      }

      const edge = event.shiftKey ? focusable[0] : focusable[focusable.length - 1];
      if (document.activeElement === edge) {
        event.preventDefault();
        (event.shiftKey ? focusable[focusable.length - 1] : focusable[0]).focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, close]);

  const themeOptions: Array<SegmentedOption<ThemeChoice>> = [
    { value: SYSTEM, label: t('a11y.theme_system') },
    { value: LIGHT, label: t('a11y.theme_light') },
    { value: DARK, label: t('a11y.theme_dark') },
  ];

  const textSizeOptions: Array<SegmentedOption<TextSize>> = [
    { value: TEXT_SIZE_NORMAL, label: t('a11y.text_normal') },
    { value: TEXT_SIZE_LARGE, label: t('a11y.text_large') },
    { value: TEXT_SIZE_XLARGE, label: t('a11y.text_xlarge') },
  ];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="a11y-fab"
        onClick={() => setOpen(true)}
        title={t('a11y.open')}
        aria-label={t('a11y.open')}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span aria-hidden="true">Aa</span>
      </button>

      {open && (
        <div className="a11y-overlay" onClick={close}>
          <div
            ref={dialogRef}
            className="a11y-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="a11y-dialog-header">
              <h2 id={titleId} className="a11y-dialog-title">{t('a11y.title')}</h2>
              <button
                type="button"
                className="a11y-dialog-close"
                onClick={close}
                title={t('a11y.close')}
                aria-label={t('a11y.close')}
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div className="a11y-dialog-body">
              <PreferenceCheckbox
                className="a11y-check-master"
                label={t('a11y.master')}
                checked={allEnabled}
                indeterminate={partiallyEnabled}
                onChange={setAllEnabled}
              />

              <div className="a11y-field">
                <span className="a11y-field-label">{t('a11y.theme_label')}</span>
                <SegmentedControl
                  label={t('a11y.theme_label')}
                  value={choice}
                  options={themeOptions}
                  onChange={setChoice}
                />
              </div>

              <div className="a11y-field">
                <span className="a11y-field-label">{t('a11y.text_size_label')}</span>
                <SegmentedControl
                  label={t('a11y.text_size_label')}
                  value={preferences.textSize}
                  options={textSizeOptions}
                  onChange={setTextSize}
                />
              </div>

              <PreferenceCheckbox
                label={t('a11y.high_contrast')}
                checked={preferences.highContrast}
                onChange={setHighContrast}
              />
              <PreferenceCheckbox
                label={t('a11y.reduce_motion')}
                checked={preferences.reduceMotion}
                onChange={setReduceMotion}
              />
              <PreferenceCheckbox
                label={t('a11y.underline_links')}
                checked={preferences.underlineLinks}
                onChange={setUnderlineLinks}
              />
            </div>

            <div className="a11y-dialog-actions">
              <button
                type="button"
                className="a11y-dialog-reset"
                onClick={() => {
                  reset();
                  setChoice(SYSTEM);
                }}
              >
                {t('a11y.reset')}
              </button>
              <button type="button" className="a11y-dialog-done" onClick={close}>
                {t('a11y.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AccessibilityPanel;
