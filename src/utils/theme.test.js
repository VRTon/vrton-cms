import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  THEME_STORAGE_KEY,
  LIGHT,
  DARK,
  SYSTEM,
  isValidTheme,
  isValidThemeChoice,
  resolveTheme,
  resolveThemeChoice,
  toggleTheme,
  readStoredTheme,
  readStoredThemeChoice,
  writeStoredTheme,
  writeStoredThemeChoice,
  applyTheme,
} from './theme.ts';

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

describe('resolveTheme', () => {
  test('sin preferencia guardada sigue al sistema', () => {
    assert.equal(resolveTheme(null, true), DARK);
    assert.equal(resolveTheme(null, false), LIGHT);
  });

  test('una eleccion explicita le gana al sistema', () => {
    assert.equal(resolveTheme(LIGHT, true), LIGHT);
    assert.equal(resolveTheme(DARK, false), DARK);
  });

  test('un valor invalido se ignora y vuelve a mandar el sistema', () => {
    for (const bad of ['', 'DARK', 'azul', '{}', null, undefined, 0, [], {}]) {
      assert.equal(resolveTheme(bad, true), DARK);
      assert.equal(resolveTheme(bad, false), LIGHT);
    }
  });
});

describe('isValidTheme', () => {
  test('acepta solo light y dark', () => {
    assert.equal(isValidTheme(LIGHT), true);
    assert.equal(isValidTheme(DARK), true);
    assert.equal(isValidTheme('Light'), false);
    assert.equal(isValidTheme(null), false);
  });
});

describe('toggleTheme', () => {
  test('alterna entre los dos temas', () => {
    assert.equal(toggleTheme(LIGHT), DARK);
    assert.equal(toggleTheme(DARK), LIGHT);
  });

  test('cualquier cosa que no sea dark se trata como claro', () => {
    assert.equal(toggleTheme('cualquiera'), DARK);
  });
});

describe('readStoredTheme', () => {
  test('devuelve el tema guardado', () => {
    withLocalStorage({ [THEME_STORAGE_KEY]: DARK }, () => {
      assert.equal(readStoredTheme(), DARK);
    });
  });

  test('devuelve null si no hay nada', () => {
    withLocalStorage({}, () => {
      assert.equal(readStoredTheme(), null);
    });
  });

  test('devuelve null si el valor guardado esta corrupto', () => {
    withLocalStorage({ [THEME_STORAGE_KEY]: 'purpura' }, () => {
      assert.equal(readStoredTheme(), null);
    });
  });

  test('no explota si localStorage tira una excepcion', () => {
    const original = globalThis.window;
    globalThis.window = {
      localStorage: {
        getItem() { throw new Error('SecurityError'); },
      },
    };
    try {
      assert.equal(readStoredTheme(), null);
    } finally {
      globalThis.window = original;
    }
  });
});

describe('writeStoredTheme', () => {
  test('persiste con la clave que pide el issue', () => {
    withLocalStorage({}, (store) => {
      writeStoredTheme(DARK);
      assert.equal(store.get(THEME_STORAGE_KEY), DARK);
    });
  });

  test('ignora valores invalidos en vez de guardar basura', () => {
    withLocalStorage({}, (store) => {
      writeStoredTheme('rosado');
      assert.equal(store.has(THEME_STORAGE_KEY), false);
    });
  });

  test('no explota si localStorage tira una excepcion', () => {
    const original = globalThis.window;
    globalThis.window = {
      localStorage: {
        setItem() { throw new Error('QuotaExceededError'); },
      },
    };
    try {
      assert.doesNotThrow(() => writeStoredTheme(DARK));
    } finally {
      globalThis.window = original;
    }
  });
});

describe('applyTheme', () => {
  function fakeDoc() {
    const html = {
      attrs: {},
      setAttribute(k, v) { this.attrs[k] = v; },
    };
    const meta = {
      attrs: { name: 'theme-color', content: '#d33741' },
      setAttribute(k, v) { this.attrs[k] = v; },
    };
    return {
      documentElement: html,
      querySelector: (sel) => (sel === 'meta[name="theme-color"]' ? meta : null),
      _html: html,
      _meta: meta,
    };
  }

  test('escribe data-theme en el html', () => {
    const doc = fakeDoc();
    applyTheme(DARK, doc);
    assert.equal(doc._html.attrs['data-theme'], DARK);
  });

  test('actualiza el meta theme-color', () => {
    const doc = fakeDoc();
    applyTheme(DARK, doc);
    assert.equal(doc._meta.attrs.content, '#12100f');

    applyTheme(LIGHT, doc);
    assert.equal(doc._meta.attrs.content, '#ffffff');
  });

  test('un tema invalido no toca el DOM', () => {
    const doc = fakeDoc();
    applyTheme('naranjo', doc);
    assert.equal(doc._html.attrs['data-theme'], undefined);
  });
});

function withFullLocalStorage(initial, run) {
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

describe('isValidThemeChoice', () => {
  test('acepta system ademas de los dos temas', () => {
    assert.equal(isValidThemeChoice(SYSTEM), true);
    assert.equal(isValidThemeChoice(LIGHT), true);
    assert.equal(isValidThemeChoice(DARK), true);
  });

  test('rechaza cualquier otra cosa', () => {
    assert.equal(isValidThemeChoice('auto'), false);
    assert.equal(isValidThemeChoice(null), false);
  });
});

describe('readStoredThemeChoice', () => {
  test('sin nada guardado la eleccion es system', () => {
    withFullLocalStorage({}, () => {
      assert.equal(readStoredThemeChoice(), SYSTEM);
    });
  });

  test('un tema guardado se devuelve tal cual', () => {
    withFullLocalStorage({ [THEME_STORAGE_KEY]: DARK }, () => {
      assert.equal(readStoredThemeChoice(), DARK);
    });
  });

  test('un valor invalido se trata como system', () => {
    withFullLocalStorage({ [THEME_STORAGE_KEY]: 'morado' }, () => {
      assert.equal(readStoredThemeChoice(), SYSTEM);
    });
  });
});

describe('writeStoredThemeChoice', () => {
  test('elegir system borra la clave en vez de guardar la palabra', () => {
    withFullLocalStorage({ [THEME_STORAGE_KEY]: DARK }, (store) => {
      writeStoredThemeChoice(SYSTEM);
      assert.equal(store.has(THEME_STORAGE_KEY), false);
    });
  });

  test('elegir un tema lo persiste', () => {
    withFullLocalStorage({}, (store) => {
      writeStoredThemeChoice(LIGHT);
      assert.equal(store.get(THEME_STORAGE_KEY), LIGHT);
    });
  });

  test('ignora una eleccion invalida', () => {
    withFullLocalStorage({ [THEME_STORAGE_KEY]: DARK }, (store) => {
      writeStoredThemeChoice('morado');
      assert.equal(store.get(THEME_STORAGE_KEY), DARK);
    });
  });
});

describe('resolveThemeChoice', () => {
  test('system sigue al sistema', () => {
    assert.equal(resolveThemeChoice(SYSTEM, true), DARK);
    assert.equal(resolveThemeChoice(SYSTEM, false), LIGHT);
  });

  test('una eleccion explicita le gana al sistema', () => {
    assert.equal(resolveThemeChoice(LIGHT, true), LIGHT);
    assert.equal(resolveThemeChoice(DARK, false), DARK);
  });
});
