import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  parseColumnDropId,
  parseColumnDragId,
  parseColumnTargetId,
  parseAnyColumnTarget,
  parsePageAndLang,
  parseBlockId,
  parseRowId,
  parseColumnId,
  parseRowDropId,
  parseSectionDropId,
  makeUploadStateKey,
  buildColumnDropId,
  buildRowDropId,
  buildSectionDropId,
  buildColumnDragId,
  buildColumnTargetId,
} from './parsing.js';

describe('parsing', () => {
  describe('parseColumnDropId', () => {
    it('parses valid column-drop format', () => {
      const result = parseColumnDropId('column-drop:sec1:row1:col1');
      assert.deepStrictEqual(result, { sectionId: 'sec1', rowId: 'row1', columnId: 'col1' });
    });

    it('returns null for non-column-drop format', () => {
      assert.strictEqual(parseColumnDropId('column:sec1:row1:col1'), null);
    });

    it('returns null for wrong number of parts', () => {
      assert.strictEqual(parseColumnDropId('column-drop:sec1:row1'), null);
    });

    it('returns null for empty string', () => {
      assert.strictEqual(parseColumnDropId(''), null);
    });
  });

  describe('parseColumnDragId', () => {
    it('parses valid column format', () => {
      const result = parseColumnDragId('column:sec1:row1:col1');
      assert.deepStrictEqual(result, { sectionId: 'sec1', rowId: 'row1', columnId: 'col1' });
    });

    it('returns null for column-drop format', () => {
      assert.strictEqual(parseColumnDragId('column-drop:sec1:row1:col1'), null);
    });
  });

  describe('parseColumnTargetId', () => {
    it('parses valid column-target format', () => {
      const result = parseColumnTargetId('column-target:sec1:row1:col1');
      assert.deepStrictEqual(result, { sectionId: 'sec1', rowId: 'row1', columnId: 'col1' });
    });
  });

  describe('parseAnyColumnTarget', () => {
    it('returns parseColumnDropId result for column-drop', () => {
      const result = parseAnyColumnTarget('column-drop:sec1:row1:col1');
      assert.deepStrictEqual(result, { sectionId: 'sec1', rowId: 'row1', columnId: 'col1' });
    });

    it('returns parseColumnTargetId result for column-target', () => {
      const result = parseAnyColumnTarget('column-target:sec1:row1:col1');
      assert.deepStrictEqual(result, { sectionId: 'sec1', rowId: 'row1', columnId: 'col1' });
    });

    it('returns parseColumnDragId result for column', () => {
      const result = parseAnyColumnTarget('column:sec1:row1:col1');
      assert.deepStrictEqual(result, { sectionId: 'sec1', rowId: 'row1', columnId: 'col1' });
    });

    it('returns null for unknown format', () => {
      assert.strictEqual(parseAnyColumnTarget('unknown:format'), null);
    });
  });

  describe('parsePageAndLang', () => {
    it('parses pages/home.es.md', () => {
      const result = parsePageAndLang('pages/home.es.md');
      assert.deepStrictEqual(result, { page: 'home', lang: 'es' });
    });

    it('parses pages/about.en.md', () => {
      const result = parsePageAndLang('pages/about.en.md');
      assert.deepStrictEqual(result, { page: 'about', lang: 'en' });
    });

    it('handles i18n/es.md', () => {
      const result = parsePageAndLang('i18n/es.md');
      assert.deepStrictEqual(result, { page: 'i18n', lang: 'es' });
    });

    it('returns null for malformed path', () => {
      const result = parsePageAndLang('invalid');
      assert.strictEqual(result, null);
    });
  });

  describe('parseBlockId', () => {
    it('parses valid block id format', () => {
      const result = parseBlockId('0:1:2:3');
      assert.deepStrictEqual(result, { blockIndex: 0, rowIndex: 1, columnIndex: 2, itemIndex: 3 });
    });

    it('returns null for wrong number of parts', () => {
      assert.strictEqual(parseBlockId('0:1:2'), null);
    });

    it('parses with different numbers', () => {
      const result = parseBlockId('10:20:30:40');
      assert.deepStrictEqual(result, { blockIndex: 10, rowIndex: 20, columnIndex: 30, itemIndex: 40 });
    });
  });

  describe('parseRowId', () => {
    it('extracts row id from row: format', () => {
      assert.strictEqual(parseRowId('row:abc123'), 'abc123');
    });

    it('returns null for non-row format', () => {
      assert.strictEqual(parseRowId('col:abc123'), null);
    });
  });

  describe('parseColumnId', () => {
    it('extracts column id from col: format', () => {
      assert.strictEqual(parseColumnId('col:xyz789'), 'xyz789');
    });

    it('returns null for non-col format', () => {
      assert.strictEqual(parseColumnId('row:xyz789'), null);
    });
  });

  describe('parseRowDropId', () => {
    it('parses valid row-drop format', () => {
      const result = parseRowDropId('row-drop:sec1:row1');
      assert.deepStrictEqual(result, { sectionId: 'sec1', rowId: 'row1' });
    });

    it('returns null for wrong format', () => {
      assert.strictEqual(parseRowDropId('row:sec1:row1'), null);
    });
  });

  describe('parseSectionDropId', () => {
    it('parses valid section-drop format', () => {
      assert.strictEqual(parseSectionDropId('section-drop:sec1'), 'sec1');
    });

    it('returns null for wrong format', () => {
      assert.strictEqual(parseSectionDropId('row-drop:sec1'), null);
    });
  });

  describe('makeUploadStateKey', () => {
    it('creates key in block:row:col:item format', () => {
      assert.strictEqual(makeUploadStateKey(0, 1, 2, 3), '0:1:2:3');
    });

    it('works with larger numbers', () => {
      assert.strictEqual(makeUploadStateKey(10, 20, 30, 40), '10:20:30:40');
    });
  });

  describe('buildColumnDropId', () => {
    it('builds column-drop format', () => {
      assert.strictEqual(buildColumnDropId('sec1', 'row1', 'col1'), 'column-drop:sec1:row1:col1');
    });
  });

  describe('buildRowDropId', () => {
    it('builds row-drop format', () => {
      assert.strictEqual(buildRowDropId('sec1', 'row1'), 'row-drop:sec1:row1');
    });
  });

  describe('buildSectionDropId', () => {
    it('builds section-drop format', () => {
      assert.strictEqual(buildSectionDropId('sec1'), 'section-drop:sec1');
    });
  });

  describe('buildColumnDragId', () => {
    it('builds column format', () => {
      assert.strictEqual(buildColumnDragId('sec1', 'row1', 'col1'), 'column:sec1:row1:col1');
    });
  });

  describe('buildColumnTargetId', () => {
    it('builds column-target format', () => {
      assert.strictEqual(buildColumnTargetId('sec1', 'row1', 'col1'), 'column-target:sec1:row1:col1');
    });
  });
});