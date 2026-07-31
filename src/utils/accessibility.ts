export const ACCESSIBILITY_STORAGE_KEY = 'vrton-accessibility';

export const ON = 'on';
export const OFF = 'off';

/** Clase que pide la Tarea 5. Va en el body y activa todo el modo. */
export const ACCESSIBILITY_CLASS = 'accessibility-mode';

/**
 * Atributo espejo en <html>. Existe por una razon concreta: casi todos los
 * tamanos de index.css estan en rem, y rem se calcula sobre el font-size de
 * <html>, no del body. Con la clase solamente en el body no habria forma de
 * subir la tipografia base sin reescribir el archivo entero.
 */
export const ACCESSIBILITY_ATTRIBUTE = 'data-a11y';

export function isValidStoredValue(value: unknown): value is typeof ON | typeof OFF {
  return value === ON || value === OFF;
}

export function readStoredAccessibility(): boolean | null {
  try {
    const raw = window.localStorage.getItem(ACCESSIBILITY_STORAGE_KEY);
    if (!isValidStoredValue(raw)) {
      return null;
    }
    return raw === ON;
  } catch {
    return null;
  }
}

export function writeStoredAccessibility(enabled: boolean): void {
  try {
    window.localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, enabled ? ON : OFF);
  } catch {
    // Navegador en modo privado o storage lleno. El modo igual funciona en memoria.
  }
}

/**
 * El modo accesible arranca apagado y solo se enciende a mano.
 *
 * No se auto-activa desde prefers-reduced-motion ni prefers-contrast a
 * proposito: subir la tipografia un 25% y cambiar toda la paleta a AAA porque
 * el sistema pidio menos animacion seria una sorpresa desagradable, y ademas
 * chocaria con el criterio 10, que exige que no haya regresion visual en modo
 * normal. La preferencia del sistema se respeta igual, pero solo en la parte
 * que corresponde: el bloque @media (prefers-reduced-motion: reduce) de
 * index.css apaga las animaciones tenga el modo encendido o no.
 */
export function resolveAccessibility(storedEnabled: boolean | null): boolean {
  return storedEnabled === true;
}

export function applyAccessibility(enabled: boolean, doc?: Document): void {
  const target = doc || (typeof document === 'undefined' ? null : document);
  if (!target) {
    return;
  }

  if (target.body) {
    target.body.classList.toggle(ACCESSIBILITY_CLASS, enabled);
  }

  if (enabled) {
    target.documentElement.setAttribute(ACCESSIBILITY_ATTRIBUTE, ON);
  } else {
    target.documentElement.removeAttribute(ACCESSIBILITY_ATTRIBUTE);
  }
}
