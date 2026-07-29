import { useCallback, useEffect, useState } from 'react';
import {
  DARK,
  LIGHT,
  applyTheme,
  readStoredTheme,
  resolveTheme,
  toggleTheme as flipTheme,
  writeStoredTheme,
} from '../utils/theme.ts';
import type { Theme } from '../utils/theme.ts';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(DARK_QUERY).matches;
}

export interface UseThemeResult {
  theme: Theme
  isDark: boolean
  toggle: () => void
}

export function useTheme(): UseThemeResult {
  // El script inline de public/index.html ya dejo el data-theme correcto antes
  // del primer pintado. Aca se recalcula lo mismo para que React arranque con
  // el estado que ya esta en pantalla y no provoque un salto.
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(readStoredTheme(), getSystemPrefersDark()));
  const [hasExplicitChoice, setHasExplicitChoice] = useState<boolean>(() => readStoredTheme() !== null);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Mientras el usuario no haya elegido, el sitio sigue al sistema en vivo:
  // si cambia el tema del SO con la pestana abierta, la pagina acompana.
  useEffect(() => {
    if (hasExplicitChoice || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const query = window.matchMedia(DARK_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setTheme(event.matches ? DARK : LIGHT);
    };

    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, [hasExplicitChoice]);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next = flipTheme(current);
      writeStoredTheme(next);
      return next;
    });
    setHasExplicitChoice(true);
  }, []);

  return { theme, isDark: theme === DARK, toggle };
}

export default useTheme;
