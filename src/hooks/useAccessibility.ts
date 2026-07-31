import { useCallback, useEffect, useState } from 'react';
import {
  applyAccessibility,
  readStoredAccessibility,
  resolveAccessibility,
  writeStoredAccessibility,
} from '../utils/accessibility.ts';

/*
  Store minimo a nivel de modulo en vez de un Context.

  El modo accesible lo tienen que leer componentes que estan muy repartidos:
  el listener de ripple vive en App, el scroll suave en PublicLayout y NavBar,
  el autoplay en Carousel y el loop de Three.js en FlyingHeartsBackground.
  Envolver todo en un provider obligaria a tocar tambien src/admin.tsx, que
  monta varios de estos componentes y no deberia saber nada del modo accesible.

  Con un store de modulo cualquier componente se suscribe solo, y en el admin
  simplemente lee false y no cambia nada.
*/
let currentValue = false;
const listeners = new Set<(_value: boolean) => void>();

function notify(value: boolean): void {
  currentValue = value;
  listeners.forEach((listener) => listener(value));
}

/** Estado inicial, leido una sola vez al cargar el modulo. */
function readInitial(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return resolveAccessibility(readStoredAccessibility());
}

currentValue = readInitial();

/** Solo lectura. Para los componentes que reaccionan al modo. */
export function useAccessibilityMode(): boolean {
  const [enabled, setEnabled] = useState<boolean>(currentValue);

  useEffect(() => {
    listeners.add(setEnabled);
    setEnabled(currentValue);
    return () => {
      listeners.delete(setEnabled);
    };
  }, []);

  return enabled;
}

export interface UseAccessibilityResult {
  enabled: boolean
  toggle: () => void
}

/** Lectura y escritura. Lo usa el boton del navbar. */
export function useAccessibility(): UseAccessibilityResult {
  const enabled = useAccessibilityMode();

  useEffect(() => {
    applyAccessibility(enabled);
  }, [enabled]);

  const toggle = useCallback(() => {
    const next = !currentValue;
    writeStoredAccessibility(next);
    notify(next);
  }, []);

  return { enabled, toggle };
}

export default useAccessibility;
