import { useCallback, useEffect, useState } from 'react';
import {
  DARK,
  LIGHT,
  SYSTEM,
  applyTheme,
  readStoredThemeChoice,
  resolveThemeChoice,
  writeStoredThemeChoice,
} from '../utils/theme.ts';
import type { Theme, ThemeChoice } from '../utils/theme.ts';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(DARK_QUERY).matches;
}

interface ThemeState {
  choice: ThemeChoice
  theme: Theme
}

function readInitial(): ThemeState {
  if (typeof window === 'undefined') {
    return { choice: SYSTEM, theme: LIGHT };
  }
  const choice = readStoredThemeChoice();
  return { choice, theme: resolveThemeChoice(choice, getSystemPrefersDark()) };
}

let currentState: ThemeState = readInitial();
const listeners = new Set<(_value: ThemeState) => void>();

function notify(next: ThemeState): void {
  currentState = next;
  applyTheme(next.theme);
  listeners.forEach((listener) => listener(next));
}

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  window.matchMedia(DARK_QUERY).addEventListener('change', (event) => {
    if (currentState.choice !== SYSTEM) {
      return;
    }
    notify({ choice: SYSTEM, theme: event.matches ? DARK : LIGHT });
  });
}

export interface UseThemeResult {
  choice: ThemeChoice
  theme: Theme
  isDark: boolean
  setChoice: (_choice: ThemeChoice) => void
  toggle: () => void
}

export function useTheme(): UseThemeResult {
  const [state, setState] = useState<ThemeState>(currentState);

  useEffect(() => {
    listeners.add(setState);
    setState(currentState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  const setChoice = useCallback((choice: ThemeChoice) => {
    writeStoredThemeChoice(choice);
    notify({ choice, theme: resolveThemeChoice(choice, getSystemPrefersDark()) });
  }, []);

  const toggle = useCallback(() => {
    setChoice(currentState.theme === DARK ? LIGHT : DARK);
  }, [setChoice]);

  return {
    choice: state.choice,
    theme: state.theme,
    isDark: state.theme === DARK,
    setChoice,
    toggle,
  };
}

export default useTheme;
