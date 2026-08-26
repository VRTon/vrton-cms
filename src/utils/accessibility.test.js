import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCESSIBILITY_STORAGE_KEY,
  ALL_ON_PREFERENCES,
  DEFAULT_PREFERENCES,
  HIGH_CONTRAST_CLASS,
  LEGACY_ON_PREFERENCES,
  REDUCE_MOTION_CLASS,
  TEXT_SCALED_CLASS,
  TEXT_SIZE_ATTRIBUTE,
  TEXT_SIZE_LARGE,
  TEXT_SIZE_NORMAL,
  TEXT_SIZE_XLARGE,
  UNDERLINE_LINKS_CLASS,
  applyPreferences,
  areAllPreferencesOn,
  clearStoredPreferences,
  isAnyPreferenceOn,
  isDefaultPreferences,
  isValidTextSize,
  normalizePreferences,
  parseStoredPreferences,
  readStoredPreferences,
  resolvePreferences,
  withPreference,
  writeStoredPreferences,
} from './accessibility.ts';

function withLocalStorage(initial, run) {
  const store = new Map(Object.entries(initial || {}));
  const original = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
  };
  try {
    return run(store);
  } finally {
    globalThis.window = original;
  }
}

function fakeDoc() {
  const classes = new Set();
  const html = {
    attrs: {},
    setAttribute(k, v) { this.attrs[k] = v; },
    removeAttribute(k) { delete this.attrs[k]; },
  };
  const body = {
    classList: {
      toggle(name, force) {
        if (force) classes.add(name);
        else classes.delete(name);
      },
      contains: (name) => classes.has(name),
    },
  };
  return { documentElement: html, body, _html: html, _classes: classes };
}

describe('isValidTextSize', () => {
  test('acepta los tres tamanos', () => {
    assert.equal(isValidTextSize(TEXT_SIZE_NORMAL), true);
    assert.equal(isValidTextSize(TEXT_SIZE_LARGE), true);
    assert.equal(isValidTextSize(TEXT_SIZE_XLARGE), true);
  });

  test('rechaza cualquier otra cosa', () => {
    assert.equal(isValidTextSize('gigante'), false);
    assert.equal(isValidTextSize(null), false);
    assert.equal(isValidTextSize(2), false);
  });
});

describe('normalizePreferences', () => {
  test('un objeto vacio cae en los valores por defecto', () => {
    assert.deepEqual(normalizePreferences({}), DEFAULT_PREFERENCES);
  });

  test('lo que no es objeto tambien cae en los valores por defecto', () => {
    assert.deepEqual(normalizePreferences(null), DEFAULT_PREFERENCES);
    assert.deepEqual(normalizePreferences('grande'), DEFAULT_PREFERENCES);
  });

  test('descarta un tamano invalido y conserva el resto', () => {
    assert.deepEqual(
      normalizePreferences({ textSize: 'gigante', highContrast: true }),
      { ...DEFAULT_PREFERENCES, highContrast: true },
    );
  });

  test('solo el booleano true enciende una opcion', () => {
    const parsed = normalizePreferences({
      highContrast: 'si',
      reduceMotion: 1,
      underlineLinks: true,
    });
    assert.equal(parsed.highContrast, false);
    assert.equal(parsed.reduceMotion, false);
    assert.equal(parsed.underlineLinks, true);
  });
});

describe('parseStoredPreferences', () => {
  test('sin nada guardado devuelve null', () => {
    assert.equal(parseStoredPreferences(null), null);
  });

  test('migra el "on" del modo viejo a todas las opciones encendidas', () => {
    assert.deepEqual(parseStoredPreferences('on'), LEGACY_ON_PREFERENCES);
  });

  test('migra el "off" del modo viejo a los valores por defecto', () => {
    assert.deepEqual(parseStoredPreferences('off'), DEFAULT_PREFERENCES);
  });

  test('lee el JSON nuevo', () => {
    const stored = JSON.stringify({
      textSize: TEXT_SIZE_XLARGE,
      highContrast: true,
      reduceMotion: false,
      underlineLinks: true,
    });
    assert.deepEqual(parseStoredPreferences(stored), {
      textSize: TEXT_SIZE_XLARGE,
      highContrast: true,
      reduceMotion: false,
      underlineLinks: true,
    });
  });

  test('un JSON roto devuelve null y no revienta', () => {
    assert.equal(parseStoredPreferences('{no es json'), null);
  });
});

describe('readStoredPreferences y writeStoredPreferences', () => {
  test('lo escrito se vuelve a leer igual', () => {
    withLocalStorage({}, () => {
      const preferences = {
        textSize: TEXT_SIZE_LARGE,
        highContrast: true,
        reduceMotion: true,
        underlineLinks: false,
      };
      writeStoredPreferences(preferences);
      assert.deepEqual(readStoredPreferences(), preferences);
    });
  });

  test('guarda bajo la clave que espera el script inline', () => {
    withLocalStorage({}, (store) => {
      writeStoredPreferences(DEFAULT_PREFERENCES);
      assert.equal(store.has(ACCESSIBILITY_STORAGE_KEY), true);
    });
  });

  test('clearStoredPreferences borra la clave', () => {
    withLocalStorage({ [ACCESSIBILITY_STORAGE_KEY]: 'on' }, (store) => {
      clearStoredPreferences();
      assert.equal(store.has(ACCESSIBILITY_STORAGE_KEY), false);
      assert.equal(readStoredPreferences(), null);
    });
  });
});

describe('resolvePreferences', () => {
  test('sin preferencia guardada arranca todo apagado', () => {
    assert.deepEqual(resolvePreferences(null), DEFAULT_PREFERENCES);
  });

  test('respeta lo guardado', () => {
    const stored = { ...DEFAULT_PREFERENCES, reduceMotion: true };
    assert.deepEqual(resolvePreferences(stored), stored);
  });
});

describe('withPreference', () => {
  test('cambia una sola opcion y deja el resto intacto', () => {
    const base = { ...DEFAULT_PREFERENCES, highContrast: true };
    const next = withPreference(base, 'underlineLinks', true);
    assert.equal(next.highContrast, true);
    assert.equal(next.underlineLinks, true);
    assert.equal(next.reduceMotion, false);
    assert.equal(next.textSize, TEXT_SIZE_NORMAL);
  });

  test('no muta el objeto original', () => {
    const base = { ...DEFAULT_PREFERENCES };
    withPreference(base, 'reduceMotion', true);
    assert.equal(base.reduceMotion, false);
  });
});

describe('isDefaultPreferences', () => {
  test('reconoce el estado por defecto', () => {
    assert.equal(isDefaultPreferences(DEFAULT_PREFERENCES), true);
  });

  test('cualquier opcion encendida ya no es el estado por defecto', () => {
    assert.equal(isDefaultPreferences({ ...DEFAULT_PREFERENCES, reduceMotion: true }), false);
    assert.equal(isDefaultPreferences({ ...DEFAULT_PREFERENCES, textSize: TEXT_SIZE_LARGE }), false);
  });
});

describe('areAllPreferencesOn', () => {
  test('reconoce el estado con todo encendido', () => {
    assert.equal(areAllPreferencesOn(ALL_ON_PREFERENCES), true);
  });

  test('falta una sola opcion y ya no esta todo encendido', () => {
    assert.equal(areAllPreferencesOn({ ...ALL_ON_PREFERENCES, underlineLinks: false }), false);
    assert.equal(areAllPreferencesOn({ ...ALL_ON_PREFERENCES, textSize: TEXT_SIZE_NORMAL }), false);
  });

  test('el tamano muy grande tambien cuenta como encendido', () => {
    assert.equal(areAllPreferencesOn({ ...ALL_ON_PREFERENCES, textSize: TEXT_SIZE_XLARGE }), true);
  });

  test('el estado por defecto no es todo encendido', () => {
    assert.equal(areAllPreferencesOn(DEFAULT_PREFERENCES), false);
  });
});

describe('isAnyPreferenceOn', () => {
  test('el estado por defecto no tiene nada encendido', () => {
    assert.equal(isAnyPreferenceOn(DEFAULT_PREFERENCES), false);
  });

  test('una sola opcion basta para que haya algo encendido', () => {
    assert.equal(isAnyPreferenceOn({ ...DEFAULT_PREFERENCES, reduceMotion: true }), true);
    assert.equal(isAnyPreferenceOn({ ...DEFAULT_PREFERENCES, textSize: TEXT_SIZE_LARGE }), true);
  });

  test('con todo encendido tambien hay algo encendido', () => {
    assert.equal(isAnyPreferenceOn(ALL_ON_PREFERENCES), true);
  });
});

describe('applyPreferences', () => {
  test('en normal no deja ninguna clase puesta', () => {
    const doc = fakeDoc();
    applyPreferences(DEFAULT_PREFERENCES, doc);
    assert.equal(doc._html.attrs[TEXT_SIZE_ATTRIBUTE], TEXT_SIZE_NORMAL);
    assert.equal(doc._classes.size, 0);
  });

  test('cada opcion enciende solo su propia clase', () => {
    const doc = fakeDoc();
    applyPreferences({ ...DEFAULT_PREFERENCES, highContrast: true }, doc);
    assert.equal(doc.body.classList.contains(HIGH_CONTRAST_CLASS), true);
    assert.equal(doc.body.classList.contains(REDUCE_MOTION_CLASS), false);
    assert.equal(doc.body.classList.contains(UNDERLINE_LINKS_CLASS), false);
  });

  test('un tamano distinto de normal agrega la clase de escala', () => {
    const doc = fakeDoc();
    applyPreferences({ ...DEFAULT_PREFERENCES, textSize: TEXT_SIZE_LARGE }, doc);
    assert.equal(doc._html.attrs[TEXT_SIZE_ATTRIBUTE], TEXT_SIZE_LARGE);
    assert.equal(doc.body.classList.contains(TEXT_SCALED_CLASS), true);
  });

  test('volver a normal saca la clase de escala', () => {
    const doc = fakeDoc();
    applyPreferences({ ...DEFAULT_PREFERENCES, textSize: TEXT_SIZE_XLARGE }, doc);
    applyPreferences(DEFAULT_PREFERENCES, doc);
    assert.equal(doc._html.attrs[TEXT_SIZE_ATTRIBUTE], TEXT_SIZE_NORMAL);
    assert.equal(doc.body.classList.contains(TEXT_SCALED_CLASS), false);
  });

  test('las opciones son independientes entre si', () => {
    const doc = fakeDoc();
    applyPreferences({
      textSize: TEXT_SIZE_NORMAL,
      highContrast: false,
      reduceMotion: true,
      underlineLinks: true,
    }, doc);
    assert.equal(doc.body.classList.contains(HIGH_CONTRAST_CLASS), false);
    assert.equal(doc.body.classList.contains(REDUCE_MOTION_CLASS), true);
    assert.equal(doc.body.classList.contains(UNDERLINE_LINKS_CLASS), true);
    assert.equal(doc.body.classList.contains(TEXT_SCALED_CLASS), false);
  });
});
