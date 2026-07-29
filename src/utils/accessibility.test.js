import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCESSIBILITY_STORAGE_KEY,
  ACCESSIBILITY_CLASS,
  ACCESSIBILITY_ATTRIBUTE,
  ON,
  OFF,
  isValidStoredValue,
  readStoredAccessibility,
  writeStoredAccessibility,
  resolveAccessibility,
  applyAccessibility,
} from './accessibility.ts';

function withLocalStorage(initial, run) {
  const store = new Map(Object.entries(initial || {}));
  const original = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
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

describe('resolveAccessibility', () => {
  test('sin preferencia guardada arranca apagado', () => {
    assert.equal(resolveAccessibility(null), false);
  });

  test('respeta la eleccion guardada', () => {
    assert.equal(resolveAccessibility(true), true);
    assert.equal(resolveAccessibility(false), false);
  });
});

describe('isValidStoredValue', () => {
  test('acepta solo on y off', () => {
    assert.equal(isValidStoredValue(ON), true);
    assert.equal(isValidStoredValue(OFF), true);
    assert.equal(isValidStoredValue('true'), false);
    assert.equal(isValidStoredValue('ON'), false);
    assert.equal(isValidStoredValue(null), false);
  });
});

describe('readStoredAccessibility', () => {
  test('lee on como encendido', () => {
    withLocalStorage({ [ACCESSIBILITY_STORAGE_KEY]: ON }, () => {
      assert.equal(readStoredAccessibility(), true);
    });
  });

  test('lee off como apagado', () => {
    withLocalStorage({ [ACCESSIBILITY_STORAGE_KEY]: OFF }, () => {
      assert.equal(readStoredAccessibility(), false);
    });
  });

  test('sin nada guardado devuelve null, que no es lo mismo que apagado', () => {
    withLocalStorage({}, () => {
      assert.equal(readStoredAccessibility(), null);
    });
  });

  test('un valor corrupto se trata como ausencia de preferencia', () => {
    withLocalStorage({ [ACCESSIBILITY_STORAGE_KEY]: 'quizas' }, () => {
      assert.equal(readStoredAccessibility(), null);
    });
  });

  test('no explota si localStorage tira una excepcion', () => {
    const original = globalThis.window;
    globalThis.window = {
      localStorage: { getItem() { throw new Error('SecurityError'); } },
    };
    try {
      assert.equal(readStoredAccessibility(), null);
    } finally {
      globalThis.window = original;
    }
  });
});

describe('writeStoredAccessibility', () => {
  test('persiste con la clave que pide el issue', () => {
    withLocalStorage({}, (store) => {
      writeStoredAccessibility(true);
      assert.equal(store.get(ACCESSIBILITY_STORAGE_KEY), ON);
      writeStoredAccessibility(false);
      assert.equal(store.get(ACCESSIBILITY_STORAGE_KEY), OFF);
    });
  });

  test('no explota si localStorage tira una excepcion', () => {
    const original = globalThis.window;
    globalThis.window = {
      localStorage: { setItem() { throw new Error('QuotaExceededError'); } },
    };
    try {
      assert.doesNotThrow(() => writeStoredAccessibility(true));
    } finally {
      globalThis.window = original;
    }
  });
});

describe('applyAccessibility', () => {
  test('CP2: al activar, el body recibe la clase accessibility-mode', () => {
    const doc = fakeDoc();
    applyAccessibility(true, doc);
    assert.equal(doc._classes.has(ACCESSIBILITY_CLASS), true);
  });

  test('CP3: al desactivar, el body pierde la clase', () => {
    const doc = fakeDoc();
    applyAccessibility(true, doc);
    applyAccessibility(false, doc);
    assert.equal(doc._classes.has(ACCESSIBILITY_CLASS), false);
  });

  test('el atributo espejo en html se pone y se quita', () => {
    const doc = fakeDoc();
    applyAccessibility(true, doc);
    assert.equal(doc._html.attrs[ACCESSIBILITY_ATTRIBUTE], ON);

    applyAccessibility(false, doc);
    assert.equal(doc._html.attrs[ACCESSIBILITY_ATTRIBUTE], undefined);
  });

  test('no explota si todavia no hay body', () => {
    const doc = fakeDoc();
    doc.body = null;
    assert.doesNotThrow(() => applyAccessibility(true, doc));
    assert.equal(doc._html.attrs[ACCESSIBILITY_ATTRIBUTE], ON);
  });
});
