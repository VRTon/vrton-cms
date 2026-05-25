import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  API_PREFIX,
  API_ASSETS_PREFIX,
  PREVIEW_WIDTHS,
  ADMIN_LANGUAGE_OPTIONS,
  BLOCK_LIBRARY,
  BLOCK_CATEGORIES,
  BASIC_BLOCK_TYPES,
  BLOCK_ICON_BY_TYPE,
  BLOCK_LABEL_BY_TYPE,
  SOCIAL_LINK_PRESETS,
  SOCIAL_ICON_BY_CLASS,
  getBlockIcon,
  getBlockLabel,
} from './constants.js';

describe('constants', () => {
  describe('API_PREFIX', () => {
    it('is defined', () => {
      assert.strictEqual(API_PREFIX, '/__admin/api/content');
    });
  });

  describe('API_ASSETS_PREFIX', () => {
    it('is defined', () => {
      assert.strictEqual(API_ASSETS_PREFIX, '/__admin/api/assets');
    });
  });

  describe('PREVIEW_WIDTHS', () => {
    it('has desktop, tablet, mobile', () => {
      assert.ok(PREVIEW_WIDTHS.desktop);
      assert.ok(PREVIEW_WIDTHS.tablet);
      assert.ok(PREVIEW_WIDTHS.mobile);
    });

    it('desktop > tablet > mobile', () => {
      assert.ok(PREVIEW_WIDTHS.desktop > PREVIEW_WIDTHS.tablet);
      assert.ok(PREVIEW_WIDTHS.tablet > PREVIEW_WIDTHS.mobile);
    });
  });

  describe('ADMIN_LANGUAGE_OPTIONS', () => {
    it('has es and en options', () => {
      const keys = ADMIN_LANGUAGE_OPTIONS.map((o) => o.key);
      assert.ok(keys.includes('es'));
      assert.ok(keys.includes('en'));
    });
  });

  describe('BLOCK_LIBRARY', () => {
    it('has all expected block types', () => {
      const types = BLOCK_LIBRARY.map((b) => b.type);
      assert.ok(types.includes('hero'));
      assert.ok(types.includes('section'));
      assert.ok(types.includes('text'));
      assert.ok(types.includes('image'));
    });

    it('all entries have required fields', () => {
      BLOCK_LIBRARY.forEach((entry) => {
        assert.ok(typeof entry.type === 'string');
        assert.ok(typeof entry.label === 'string');
        assert.ok(typeof entry.icon === 'string');
        assert.ok(typeof entry.category === 'string');
      });
    });

    it('categories are valid', () => {
      const validCategories = ['structure', 'content', 'media', 'actions'];
      BLOCK_LIBRARY.forEach((entry) => {
        assert.ok(validCategories.includes(entry.category));
      });
    });
  });

  describe('BLOCK_CATEGORIES', () => {
    it('has structure, content, media, actions', () => {
      const keys = BLOCK_CATEGORIES.map((c) => c.key);
      assert.ok(keys.includes('structure'));
      assert.ok(keys.includes('content'));
      assert.ok(keys.includes('media'));
      assert.ok(keys.includes('actions'));
    });
  });

  describe('BASIC_BLOCK_TYPES', () => {
    it('is a Set', () => {
      assert.ok(BASIC_BLOCK_TYPES instanceof Set);
    });

    it('includes expected types', () => {
      assert.ok(BASIC_BLOCK_TYPES.has('text'));
      assert.ok(BASIC_BLOCK_TYPES.has('heading'));
      assert.ok(BASIC_BLOCK_TYPES.has('image'));
      assert.ok(BASIC_BLOCK_TYPES.has('gallery'));
    });

    it('does not include hero, events, faq', () => {
      assert.ok(!BASIC_BLOCK_TYPES.has('hero'));
      assert.ok(!BASIC_BLOCK_TYPES.has('events'));
      assert.ok(!BASIC_BLOCK_TYPES.has('faq'));
    });
  });

  describe('BLOCK_ICON_BY_TYPE', () => {
    it('maps text to fa-align-left', () => {
      assert.strictEqual(BLOCK_ICON_BY_TYPE['text'], 'fa-align-left');
    });

    it('maps image to fa-image', () => {
      assert.strictEqual(BLOCK_ICON_BY_TYPE['image'], 'fa-image');
    });

    it('returns default for unknown type', () => {
      assert.strictEqual(BLOCK_ICON_BY_TYPE['unknown-type'], undefined);
    });
  });

  describe('BLOCK_LABEL_BY_TYPE', () => {
    it('maps text to Text', () => {
      assert.strictEqual(BLOCK_LABEL_BY_TYPE['text'], 'Text');
    });

    it('maps section to Section', () => {
      assert.strictEqual(BLOCK_LABEL_BY_TYPE['section'], 'Section');
    });
  });

  describe('SOCIAL_LINK_PRESETS', () => {
    it('has discord, vrchat, instagram, etc.', () => {
      const ids = SOCIAL_LINK_PRESETS.map((p) => p.id);
      assert.ok(ids.includes('discord'));
      assert.ok(ids.includes('vrchat'));
      assert.ok(ids.includes('instagram'));
      assert.ok(ids.includes('youtube'));
    });

    it('all have href and icon', () => {
      SOCIAL_LINK_PRESETS.forEach((preset) => {
        assert.ok(typeof preset.href === 'string');
        assert.ok(typeof preset.icon === 'string');
      });
    });
  });

  describe('getBlockIcon', () => {
    it('returns icon for text type', () => {
      assert.strictEqual(getBlockIcon('text'), 'fa-align-left');
    });

    it('returns fa-square for unknown type', () => {
      assert.strictEqual(getBlockIcon('unknown'), 'fa-square');
    });

    it('converts markdown to text icon', () => {
      assert.strictEqual(getBlockIcon('markdown'), 'fa-align-left');
    });
  });

  describe('getBlockLabel', () => {
    it('returns label for text type', () => {
      assert.strictEqual(getBlockLabel('text'), 'Text');
    });

    it('returns type string for unknown type', () => {
      assert.strictEqual(getBlockLabel('unknown-type'), 'unknown-type');
    });

    it('converts markdown to Text label', () => {
      assert.strictEqual(getBlockLabel('markdown'), 'Text');
    });
  });
});