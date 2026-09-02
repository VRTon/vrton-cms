export const THEME_STORAGE_KEY = 'vrton-theme';

export const LIGHT = 'light';
export const DARK = 'dark';
export const SYSTEM = 'system';

export type Theme = typeof LIGHT | typeof DARK;
export type ThemeChoice = Theme | typeof SYSTEM;

export const THEME_CHOICES: readonly ThemeChoice[] = [SYSTEM, LIGHT, DARK];

export const THEME_COLORS: Record<Theme, string> = {
  [LIGHT]: '#ffffff',
  [DARK]: '#12100f',
};

export function isValidTheme(value: unknown): value is Theme {
  return value === LIGHT || value === DARK;
}

export function resolveTheme(storedTheme: unknown, systemPrefersDark: boolean): Theme {
  if (isValidTheme(storedTheme)) {
    return storedTheme;
  }
  return systemPrefersDark ? DARK : LIGHT;
}

export function toggleTheme(theme: unknown): Theme {
  return theme === DARK ? LIGHT : DARK;
}

export function readStoredTheme(): Theme | null {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isValidTheme(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeStoredTheme(theme: Theme): void {
  if (!isValidTheme(theme)) {
    return;
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    return;
  }
}

export function isValidThemeChoice(value: unknown): value is ThemeChoice {
  return value === SYSTEM || isValidTheme(value);
}

export function readStoredThemeChoice(): ThemeChoice {
  return readStoredTheme() || SYSTEM;
}

export function writeStoredThemeChoice(choice: ThemeChoice): void {
  if (!isValidThemeChoice(choice)) {
    return;
  }

  if (choice === SYSTEM) {
    try {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } catch {
      return;
    }
    return;
  }

  writeStoredTheme(choice);
}

export function resolveThemeChoice(choice: unknown, systemPrefersDark: boolean): Theme {
  if (isValidTheme(choice)) {
    return choice;
  }
  return systemPrefersDark ? DARK : LIGHT;
}

export function applyTheme(theme: unknown, doc?: Document): void {
  const target = doc || (typeof document === 'undefined' ? null : document);
  if (!target || !isValidTheme(theme)) {
    return;
  }

  target.documentElement.setAttribute('data-theme', theme);

  const meta = target.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', THEME_COLORS[theme]);
  }
}
