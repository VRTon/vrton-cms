import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyTransparentBackdrop, HERO_CLEAR_ALPHA, HERO_CLEAR_COLOR } from './heroCanvasBackdrop.ts';

function createRendererStub() {
  const calls = [];

  return {
    calls,
    setClearColor(color, alpha) {
      calls.push([color, alpha]);
    },
  };
}

describe('hero canvas backdrop', () => {
  it('leaves the scene without its own background so the page shows through', () => {
    const scene = { background: { isColor: true } };

    applyTransparentBackdrop(scene, createRendererStub());

    assert.equal(scene.background, null);
  });

  it('clears the canvas with zero alpha instead of an opaque colour', () => {
    const renderer = createRendererStub();

    applyTransparentBackdrop({ background: null }, renderer);

    assert.equal(HERO_CLEAR_ALPHA, 0);
    assert.deepStrictEqual(renderer.calls, [[HERO_CLEAR_COLOR, HERO_CLEAR_ALPHA]]);
  });
});
