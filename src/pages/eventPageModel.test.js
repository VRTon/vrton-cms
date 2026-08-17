import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEventYear, prepareEventPageBlocks } from './eventPageModel.ts';

test('accepts only VRTon slugs with a four-digit year', () => {
  assert.equal(parseEventYear('vrton-2024'), '2024');
  assert.equal(parseEventYear('event-2024'), null);
  assert.equal(parseEventYear('vrton-24'), null);
  assert.equal(parseEventYear('vrton-2024-extra'), null);
});

test('uses the first gallery as the carousel and preserves every other block', () => {
  const amount = { type: 'section', title: 'Monto' };
  const firstGallery = {
    type: 'gallery',
    items: [{ src: '/one.webp', alt: 'One' }, { src: '', alt: 'Invalid' }],
  };
  const collaborators = { type: 'gallery', items: [{ src: '/logo.webp', alt: 'Logo' }] };
  const result = prepareEventPageBlocks([amount, firstGallery, collaborators]);

  assert.deepEqual(result.carouselItems, [{ src: '/one.webp', alt: 'One' }]);
  assert.deepEqual(result.remainingBlocks, [amount, collaborators]);
});

test('returns a localized-placeholder state when photos are absent', () => {
  const amount = { type: 'section', title: 'Amount' };
  assert.deepEqual(prepareEventPageBlocks([amount]), {
    carouselItems: [],
    remainingBlocks: [amount],
  });
});

test('does not create an amount section when content does not provide one', () => {
  const result = prepareEventPageBlocks([{ type: 'gallery', items: [] }]);
  assert.equal(result.remainingBlocks.some((block) => block.type === 'section'), false);
});
