export const ACCESSIBILITY_STORAGE_KEY = 'vrton-accessibility';

export const TEXT_SIZE_NORMAL = 'normal';
export const TEXT_SIZE_LARGE = 'large';
export const TEXT_SIZE_XLARGE = 'xlarge';

export type TextSize =
  | typeof TEXT_SIZE_NORMAL
  | typeof TEXT_SIZE_LARGE
  | typeof TEXT_SIZE_XLARGE;

export const TEXT_SIZES: readonly TextSize[] = [
  TEXT_SIZE_NORMAL,
  TEXT_SIZE_LARGE,
  TEXT_SIZE_XLARGE,
];

export interface AccessibilityPreferences {
  textSize: TextSize
  highContrast: boolean
  reduceMotion: boolean
  underlineLinks: boolean
}

export const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  textSize: TEXT_SIZE_NORMAL,
  highContrast: false,
  reduceMotion: false,
  underlineLinks: false,
};

export const LEGACY_ON = 'on';
export const LEGACY_OFF = 'off';

export const ALL_ON_PREFERENCES: AccessibilityPreferences = {
  textSize: TEXT_SIZE_LARGE,
  highContrast: true,
  reduceMotion: true,
  underlineLinks: true,
};

export const LEGACY_ON_PREFERENCES: AccessibilityPreferences = ALL_ON_PREFERENCES;

export const TEXT_SIZE_ATTRIBUTE = 'data-a11y-text-size';
export const TEXT_SCALED_CLASS = 'a11y-text-scaled';
export const HIGH_CONTRAST_CLASS = 'a11y-high-contrast';
export const REDUCE_MOTION_CLASS = 'a11y-reduce-motion';
export const UNDERLINE_LINKS_CLASS = 'a11y-underline-links';

export function isValidTextSize(value: unknown): value is TextSize {
  return value === TEXT_SIZE_NORMAL || value === TEXT_SIZE_LARGE || value === TEXT_SIZE_XLARGE;
}

export function normalizePreferences(value: unknown): AccessibilityPreferences {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_PREFERENCES };
  }

  const source = value as Record<string, unknown>;

  return {
    textSize: isValidTextSize(source.textSize) ? source.textSize : DEFAULT_PREFERENCES.textSize,
    highContrast: source.highContrast === true,
    reduceMotion: source.reduceMotion === true,
    underlineLinks: source.underlineLinks === true,
  };
}

export function parseStoredPreferences(raw: string | null): AccessibilityPreferences | null {
  if (raw === null) {
    return null;
  }

  if (raw === LEGACY_ON) {
    return { ...LEGACY_ON_PREFERENCES };
  }

  if (raw === LEGACY_OFF) {
    return { ...DEFAULT_PREFERENCES };
  }

  try {
    return normalizePreferences(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function readStoredPreferences(): AccessibilityPreferences | null {
  try {
    return parseStoredPreferences(window.localStorage.getItem(ACCESSIBILITY_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeStoredPreferences(preferences: AccessibilityPreferences): void {
  try {
    window.localStorage.setItem(
      ACCESSIBILITY_STORAGE_KEY,
      JSON.stringify(normalizePreferences(preferences)),
    );
  } catch {
    return;
  }
}

export function clearStoredPreferences(): void {
  try {
    window.localStorage.removeItem(ACCESSIBILITY_STORAGE_KEY);
  } catch {
    return;
  }
}

export function resolvePreferences(stored: AccessibilityPreferences | null): AccessibilityPreferences {
  return stored ? normalizePreferences(stored) : { ...DEFAULT_PREFERENCES };
}

export function withPreference<K extends keyof AccessibilityPreferences>(
  preferences: AccessibilityPreferences,
  key: K,
  value: AccessibilityPreferences[K],
): AccessibilityPreferences {
  return normalizePreferences({ ...preferences, [key]: value });
}

export function areAllPreferencesOn(preferences: AccessibilityPreferences): boolean {
  const resolved = normalizePreferences(preferences);
  return resolved.textSize !== TEXT_SIZE_NORMAL
    && resolved.highContrast
    && resolved.reduceMotion
    && resolved.underlineLinks;
}

export function isAnyPreferenceOn(preferences: AccessibilityPreferences): boolean {
  return !isDefaultPreferences(preferences);
}

export function isDefaultPreferences(preferences: AccessibilityPreferences): boolean {
  const resolved = normalizePreferences(preferences);
  return resolved.textSize === DEFAULT_PREFERENCES.textSize
    && !resolved.highContrast
    && !resolved.reduceMotion
    && !resolved.underlineLinks;
}

export function applyPreferences(preferences: AccessibilityPreferences, doc?: Document): void {
  const target = doc || (typeof document === 'undefined' ? null : document);
  if (!target) {
    return;
  }

  const resolved = normalizePreferences(preferences);

  target.documentElement.setAttribute(TEXT_SIZE_ATTRIBUTE, resolved.textSize);

  if (!target.body) {
    return;
  }

  target.body.classList.toggle(TEXT_SCALED_CLASS, resolved.textSize !== TEXT_SIZE_NORMAL);
  target.body.classList.toggle(HIGH_CONTRAST_CLASS, resolved.highContrast);
  target.body.classList.toggle(REDUCE_MOTION_CLASS, resolved.reduceMotion);
  target.body.classList.toggle(UNDERLINE_LINKS_CLASS, resolved.underlineLinks);
}
