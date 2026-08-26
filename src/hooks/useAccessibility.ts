import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_PREFERENCES,
  applyPreferences,
  clearStoredPreferences,
  readStoredPreferences,
  resolvePreferences,
  withPreference,
  writeStoredPreferences,
} from '../utils/accessibility.ts';
import type { AccessibilityPreferences, TextSize } from '../utils/accessibility.ts';

let currentPreferences: AccessibilityPreferences = { ...DEFAULT_PREFERENCES };
const listeners = new Set<(_value: AccessibilityPreferences) => void>();

function notify(next: AccessibilityPreferences): void {
  currentPreferences = next;
  applyPreferences(next);
  listeners.forEach((listener) => listener(next));
}

function readInitial(): AccessibilityPreferences {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_PREFERENCES };
  }
  return resolvePreferences(readStoredPreferences());
}

currentPreferences = readInitial();

export function useAccessibilityPreferences(): AccessibilityPreferences {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(currentPreferences);

  useEffect(() => {
    listeners.add(setPreferences);
    setPreferences(currentPreferences);
    return () => {
      listeners.delete(setPreferences);
    };
  }, []);

  return preferences;
}

export function useReduceMotion(): boolean {
  return useAccessibilityPreferences().reduceMotion;
}

export interface UseAccessibilityControlsResult {
  preferences: AccessibilityPreferences
  setTextSize: (_size: TextSize) => void
  setHighContrast: (_enabled: boolean) => void
  setReduceMotion: (_enabled: boolean) => void
  setUnderlineLinks: (_enabled: boolean) => void
  reset: () => void
}

export function useAccessibilityControls(): UseAccessibilityControlsResult {
  const preferences = useAccessibilityPreferences();

  useEffect(() => {
    applyPreferences(preferences);
  }, [preferences]);

  const update = useCallback(<K extends keyof AccessibilityPreferences>(
    key: K,
    value: AccessibilityPreferences[K],
  ) => {
    const next = withPreference(currentPreferences, key, value);
    writeStoredPreferences(next);
    notify(next);
  }, []);

  const setTextSize = useCallback((size: TextSize) => update('textSize', size), [update]);
  const setHighContrast = useCallback((enabled: boolean) => update('highContrast', enabled), [update]);
  const setReduceMotion = useCallback((enabled: boolean) => update('reduceMotion', enabled), [update]);
  const setUnderlineLinks = useCallback((enabled: boolean) => update('underlineLinks', enabled), [update]);

  const reset = useCallback(() => {
    clearStoredPreferences();
    notify({ ...DEFAULT_PREFERENCES });
  }, []);

  return {
    preferences,
    setTextSize,
    setHighContrast,
    setReduceMotion,
    setUnderlineLinks,
    reset,
  };
}

export default useAccessibilityPreferences;
