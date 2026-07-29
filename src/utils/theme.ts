export const THEME_STORAGE_KEY = 'vrton-theme';

export const LIGHT = 'light';
export const DARK = 'dark';

export type Theme = typeof LIGHT | typeof DARK;

// Color de la barra del navegador en cada tema. Alimenta <meta name="theme-color">,
// que es lo que pinta la barra de direcciones en Android y en iOS instalado como PWA.
export const THEME_COLORS: Record<Theme, string> = {
  [LIGHT]: '#ffffff',
  [DARK]: '#12100f',
};

export function isValidTheme(value: unknown): value is Theme {
  return value === LIGHT || value === DARK;
}

/**
 * Decide el tema efectivo. Una eleccion guardada siempre le gana al sistema;
 * si no hay ninguna, manda prefers-color-scheme.
 */
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
    // Navegador en modo privado o storage lleno. El tema igual funciona en memoria.
  }
}

/**
 * Escribe el tema en el DOM. Recibe el document en vez de asumirlo para poder
 * probarlo sin un navegador.
 */
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
