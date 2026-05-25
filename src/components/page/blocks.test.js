import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  createDefaultBlock,
  createSectionItem,
  isContainerBlock,
  isInlineComponentType,
} from './blocks.js';

describe('blocks', () => {
  describe('createDefaultBlock', () => {
    it('creates text block with _cid', () => {
      const block = createDefaultBlock('text');
      assert.ok(block._cid);
      assert.strictEqual(block.type, 'text');
    });

    it('creates hero block with showVrchatBadge and showSocial', () => {
      const block = createDefaultBlock('hero');
      assert.strictEqual(block.type, 'hero');
      assert.strictEqual(block.showVrchatBadge, true);
      assert.strictEqual(block.showSocial, true);
    });

    it('creates gallery block with items array', () => {
      const block = createDefaultBlock('gallery');
      assert.strictEqual(block.type, 'gallery');
      assert.ok(Array.isArray(block.items));
      assert.strictEqual(block.items.length, 2);
    });

    it('creates accordion block with items array', () => {
      const block = createDefaultBlock('accordion');
      assert.strictEqual(block.type, 'accordion');
      assert.ok(Array.isArray(block.items));
      assert.strictEqual(block.items.length, 2);
    });

    it('creates schedule block with title and items', () => {
      const block = createDefaultBlock('schedule');
      assert.strictEqual(block.type, 'schedule');
      assert.strictEqual(block.title, 'Day Schedule');
      assert.ok(Array.isArray(block.items));
    });

    it('creates heading block with level 2', () => {
      const block = createDefaultBlock('heading');
      assert.strictEqual(block.type, 'heading');
      assert.strictEqual(block.level, 2);
      assert.strictEqual(block.text, 'Section title');
    });

    it('creates image block with empty src, alt, caption', () => {
      const block = createDefaultBlock('image');
      assert.strictEqual(block.type, 'image');
      assert.strictEqual(block.src, '');
      assert.strictEqual(block.alt, '');
      assert.strictEqual(block.caption, '');
    });

    it('creates video block with controls settings', () => {
      const block = createDefaultBlock('video');
      assert.strictEqual(block.type, 'video');
      assert.strictEqual(block.controls, true);
      assert.strictEqual(block.autoplay, false);
      assert.strictEqual(block.muted, false);
      assert.strictEqual(block.loop, false);
    });

    it('creates button block with defaults', () => {
      const block = createDefaultBlock('button');
      assert.strictEqual(block.type, 'button');
      assert.strictEqual(block.label, 'Open link');
      assert.strictEqual(block.href, '/');
      assert.strictEqual(block.newTab, false);
    });

    it('creates links block with items', () => {
      const block = createDefaultBlock('links');
      assert.strictEqual(block.type, 'links');
      assert.ok(Array.isArray(block.items));
      assert.strictEqual(block.items.length, 2);
    });

    it('creates section block with rows', () => {
      const block = createDefaultBlock('section');
      assert.strictEqual(block.type, 'section');
      assert.ok(Array.isArray(block.rows));
      assert.strictEqual(block.rows.length, 1);
    });

    it('creates divider block with line style', () => {
      const block = createDefaultBlock('divider');
      assert.strictEqual(block.type, 'divider');
      assert.strictEqual(block.style, 'line');
    });

    it('creates spacer block with height 40', () => {
      const block = createDefaultBlock('spacer');
      assert.strictEqual(block.type, 'spacer');
      assert.strictEqual(block.height, 40);
    });

    it('defaults unknown type to text block', () => {
      const block = createDefaultBlock('unknown-type');
      assert.strictEqual(block.type, 'text');
    });
  });

  describe('createSectionItem', () => {
    it('creates item with _iid for text type', () => {
      const item = createSectionItem('text');
      assert.ok(item._iid);
      assert.strictEqual(item.type, 'text');
    });

    it('creates item with _iid for image type', () => {
      const item = createSectionItem('image');
      assert.ok(item._iid);
      assert.strictEqual(item.type, 'image');
    });

    it('returns text item for section type', () => {
      const item = createSectionItem('section');
      assert.strictEqual(item.type, 'text');
      assert.strictEqual(item.markdown, '');
      assert.ok(item._iid);
    });
  });

  describe('isContainerBlock', () => {
    it('returns true for section type', () => {
      assert.strictEqual(isContainerBlock({ type: 'section' }), true);
    });

    it('returns false for text type', () => {
      assert.strictEqual(isContainerBlock({ type: 'text' }), false);
    });

    it('returns false for null', () => {
      assert.strictEqual(isContainerBlock(null), false);
    });

    it('returns false for undefined', () => {
      assert.strictEqual(isContainerBlock(undefined), false);
    });
  });

  describe('isInlineComponentType', () => {
    it('returns true for text', () => {
      assert.strictEqual(isInlineComponentType('text'), true);
    });

    it('returns true for image', () => {
      assert.strictEqual(isInlineComponentType('image'), true);
    });

    it('returns true for heading', () => {
      assert.strictEqual(isInlineComponentType('heading'), true);
    });

    it('returns true for gallery', () => {
      assert.strictEqual(isInlineComponentType('gallery'), true);
    });

    it('returns true for accordion', () => {
      assert.strictEqual(isInlineComponentType('accordion'), true);
    });

    it('returns true for schedule', () => {
      assert.strictEqual(isInlineComponentType('schedule'), true);
    });

    it('returns false for hero', () => {
      assert.strictEqual(isInlineComponentType('hero'), false);
    });

    it('returns false for events', () => {
      assert.strictEqual(isInlineComponentType('events'), false);
    });

    it('returns false for faq', () => {
      assert.strictEqual(isInlineComponentType('faq'), false);
    });

    it('returns false for section', () => {
      assert.strictEqual(isInlineComponentType('section'), false);
    });
  });
});