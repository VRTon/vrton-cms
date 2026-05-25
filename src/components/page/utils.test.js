import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  normalizeSectionItems,
  createDefaultSectionColumn,
  createDefaultSectionRow,
  normalizeSectionRows,
  countSectionItems,
  withClientIds,
  stripClientIds,
  slugify,
  parsePipedEntries,
  formatPipedEntries,
  normalizeScheduleItems,
  normalizeFooterQuickLinks,
  isValidOptionalHttpUrl,
  makeCollaboratorId,
  normalizeCollaboratorsCatalog,
  buildCollaboratorsCatalogFromRows,
  normalizeEventsRowsWithCatalog,
  areJsonObjectsEqual,
  normalizeComparableContent,
  cloneBlocks,
} from './utils.js';

describe('utils', () => {
  describe('normalizeSectionItems', () => {
    it('returns empty array for non-array input', () => {
      const result = normalizeSectionItems(null);
      assert.deepStrictEqual(result, []);
    });

    it('adds _iid to items missing it', () => {
      const items = [{ type: 'text' }];
      const result = normalizeSectionItems(items);
      assert.ok(result[0]._iid);
    });

    it('preserves existing _iid', () => {
      const items = [{ type: 'text', _iid: 'existing-id' }];
      const result = normalizeSectionItems(items);
      assert.strictEqual(result[0]._iid, 'existing-id');
    });

    it('handles empty array', () => {
      const result = normalizeSectionItems([]);
      assert.deepStrictEqual(result, []);
    });
  });

  describe('createDefaultSectionColumn', () => {
    it('creates column with _colid', () => {
      const col = createDefaultSectionColumn();
      assert.ok(col._colid);
      assert.ok(col._colid.startsWith('col-'));
    });

    it('has width 12 by default', () => {
      const col = createDefaultSectionColumn();
      assert.strictEqual(col.width, 12);
    });

    it('has empty items array by default', () => {
      const col = createDefaultSectionColumn();
      assert.ok(Array.isArray(col.items));
      assert.strictEqual(col.items.length, 0);
    });

    it('normalizes items with _iid', () => {
      const col = createDefaultSectionColumn([{ type: 'text' }]);
      assert.ok(col.items[0]._iid);
    });
  });

  describe('createDefaultSectionRow', () => {
    it('creates row with _rid', () => {
      const row = createDefaultSectionRow();
      assert.ok(row._rid);
      assert.ok(row._rid.startsWith('row-'));
    });

    it('has columns array with one column', () => {
      const row = createDefaultSectionRow();
      assert.ok(Array.isArray(row.columns));
      assert.strictEqual(row.columns.length, 1);
    });
  });

  describe('normalizeSectionRows', () => {
    it('returns default row for empty input', () => {
      const result = normalizeSectionRows([]);
      assert.strictEqual(result.length, 1);
      assert.ok(result[0]._rid);
    });

    it('preserves existing rows', () => {
      const rows = [{ _rid: 'existing', columns: [] }];
      const result = normalizeSectionRows(rows, []);
      assert.strictEqual(result[0]._rid, 'existing');
    });
  });

  describe('countSectionItems', () => {
    it('returns 0 for non-section block', () => {
      assert.strictEqual(countSectionItems({ type: 'text' }), 0);
    });

    it('returns 0 for null', () => {
      assert.strictEqual(countSectionItems(null), 0);
    });

    it('counts items in rows', () => {
      const block = {
        type: 'section',
        rows: [
          {
            columns: [
              { items: [{ _iid: '1' }, { _iid: '2' }] },
              { items: [{ _iid: '3' }] },
            ],
          },
        ],
      };
      assert.strictEqual(countSectionItems(block), 3);
    });
  });

  describe('withClientIds', () => {
    it('returns null for non-array', () => {
      assert.strictEqual(withClientIds(null), null);
    });

    it('adds _cid to blocks missing it', () => {
      const blocks = [{ type: 'text' }];
      const result = withClientIds(blocks);
      assert.ok(result[0]._cid);
    });

    it('converts subsection to section', () => {
      const blocks = [{ type: 'subsection' }];
      const result = withClientIds(blocks);
      assert.strictEqual(result[0].type, 'section');
    });

    it('preserves existing _cid', () => {
      const blocks = [{ type: 'text', _cid: 'existing-cid' }];
      const result = withClientIds(blocks);
      assert.strictEqual(result[0]._cid, 'existing-cid');
    });
  });

  describe('stripClientIds', () => {
    it('returns non-array as-is', () => {
      assert.strictEqual(stripClientIds(null), null);
    });

    it('removes _rid from section rows', () => {
      const blocks = [{
        type: 'section',
        rows: [{ _rid: 'row-123', columns: [] }],
      }];
      const result = stripClientIds(blocks);
      assert.strictEqual(result[0].rows[0]._rid, undefined);
    });

    it('preserves non-section blocks', () => {
      const blocks = [{ type: 'text', markdown: 'hello' }];
      const result = stripClientIds(blocks);
      assert.strictEqual(result[0].markdown, 'hello');
    });
  });

  describe('slugify', () => {
    it('converts to lowercase', () => {
      assert.strictEqual(slugify('Hello World'), 'hello-world');
    });

    it('replaces spaces with hyphens', () => {
      assert.strictEqual(slugify('hello world test'), 'hello-world-test');
    });

    it('removes accents', () => {
      assert.strictEqual(slugify('José María'), 'jose-maria');
    });

    it('removes special characters', () => {
      assert.strictEqual(slugify('Hello!@#World'), 'helloworld');
    });

    it('trims hyphens', () => {
      assert.strictEqual(slugify('  hello  '), 'hello');
    });

    it('collapses multiple hyphens', () => {
      assert.strictEqual(slugify('hello---world'), 'hello-world');
    });
  });

  describe('parsePipedEntries', () => {
    it('parses single line', () => {
      const result = parsePipedEntries('a|b|c', ['key1', 'key2', 'key3']);
      assert.deepStrictEqual(result, [{ key1: 'a', key2: 'b', key3: 'c' }]);
    });

    it('parses multiple lines', () => {
      const result = parsePipedEntries('a|b\nc|d', ['x', 'y']);
      assert.strictEqual(result.length, 2);
      assert.deepStrictEqual(result[0], { x: 'a', y: 'b' });
      assert.deepStrictEqual(result[1], { x: 'c', y: 'd' });
    });

    it('returns empty array for null input', () => {
      const result = parsePipedEntries(null, ['key']);
      assert.deepStrictEqual(result, []);
    });

    it('filters empty lines', () => {
      const result = parsePipedEntries('a|b\n\n\nc|d', ['x', 'y']);
      assert.strictEqual(result.length, 2);
    });

    it('handles missing parts', () => {
      const result = parsePipedEntries('a', ['x', 'y']);
      assert.deepStrictEqual(result[0], { x: 'a', y: '' });
    });
  });

  describe('formatPipedEntries', () => {
    it('formats single item', () => {
      const result = formatPipedEntries([{ x: 'a', y: 'b' }], ['x', 'y']);
      assert.strictEqual(result, 'a | b');
    });

    it('formats multiple items', () => {
      const result = formatPipedEntries([{ x: 'a', y: 'b' }, { x: 'c', y: 'd' }], ['x', 'y']);
      assert.strictEqual(result, 'a | b\na | d');
    });

    it('returns empty string for null', () => {
      assert.strictEqual(formatPipedEntries(null, ['x']), '');
    });

    it('filters empty values', () => {
      const result = formatPipedEntries([{}], ['x', 'y']);
      assert.strictEqual(result, '');
    });
  });

  describe('normalizeScheduleItems', () => {
    it('returns empty array for null', () => {
      const result = normalizeScheduleItems(null);
      assert.deepStrictEqual(result, []);
    });

    it('normalizes time, title, details', () => {
      const items = [{ time: ' 09:00 ', title: ' Event ', details: ' Info ' }];
      const result = normalizeScheduleItems(items);
      assert.strictEqual(result[0].time, '09:00');
      assert.strictEqual(result[0].title, 'Event');
      assert.strictEqual(result[0].details, 'Info');
    });
  });

  describe('normalizeFooterQuickLinks', () => {
    it('filters entries without label or href', () => {
      const items = [
        { label: 'Website', href: '/' },
        { label: '', href: '/' },
        { label: 'Blog', href: '' },
      ];
      const result = normalizeFooterQuickLinks(items);
      assert.strictEqual(result.length, 1);
    });

    it('returns empty array for null', () => {
      const result = normalizeFooterQuickLinks(null);
      assert.deepStrictEqual(result, []);
    });
  });

  describe('isValidOptionalHttpUrl', () => {
    it('returns true for empty string', () => {
      assert.strictEqual(isValidOptionalHttpUrl(''), true);
    });

    it('returns true for valid http URL', () => {
      assert.strictEqual(isValidOptionalHttpUrl('http://example.com'), true);
    });

    it('returns true for valid https URL', () => {
      assert.strictEqual(isValidOptionalHttpUrl('https://example.com'), true);
    });

    it('returns false for invalid protocol', () => {
      assert.strictEqual(isValidOptionalHttpUrl('ftp://example.com'), false);
    });

    it('returns false for invalid URL', () => {
      assert.strictEqual(isValidOptionalHttpUrl('not-a-url'), false);
    });
  });

  describe('makeCollaboratorId', () => {
    it('normalizes name', () => {
      assert.strictEqual(makeCollaboratorId('John Doe'), 'john-doe');
    });

    it('uses fallback for empty name', () => {
      assert.ok(makeCollaboratorId('', 'user1').startsWith('collab-'));
    });
  });

  describe('normalizeCollaboratorsCatalog', () => {
    it('returns empty array for null', () => {
      const result = normalizeCollaboratorsCatalog(null);
      assert.deepStrictEqual(result, []);
    });

    it('normalizes entries', () => {
      const items = [{ id: '1', name: 'John', src: 'img.jpg' }];
      const result = normalizeCollaboratorsCatalog(items);
      assert.strictEqual(result[0].name, 'John');
    });
  });

  describe('buildCollaboratorsCatalogFromRows', () => {
    it('extracts collaborators from rows', () => {
      const rows = [
        {
          collaborators: [
            { alt: 'John', src: 'john.jpg' },
          ],
        },
      ];
      const result = buildCollaboratorsCatalogFromRows(rows);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].name, 'John');
    });

    it('deduplicates by key', () => {
      const rows = [
        { collaborators: [{ alt: 'John', src: 'john.jpg' }] },
        { collaborators: [{ alt: 'John', src: 'john.jpg' }] },
      ];
      const result = buildCollaboratorsCatalogFromRows(rows);
      assert.strictEqual(result.length, 1);
    });
  });

  describe('normalizeEventsRowsWithCatalog', () => {
    it('returns empty array for null', () => {
      const result = normalizeEventsRowsWithCatalog(null, []);
      assert.deepStrictEqual(result, []);
    });

    it('filters rows without year', () => {
      const rows = [{ year: '', events: [] }];
      const result = normalizeEventsRowsWithCatalog(rows, []);
      assert.strictEqual(result.length, 0);
    });

    it('maps collaborator ids', () => {
      const catalog = [{ id: 'collab1', name: 'John', src: 'john.jpg' }];
      const rows = [{
        year: '2024',
        events: [],
        collaborators: [{ alt: 'John', src: 'john.jpg' }],
      }];
      const result = normalizeEventsRowsWithCatalog(rows, catalog);
      assert.deepStrictEqual(result[0].collaboratorIds, ['collab1']);
    });
  });

  describe('areJsonObjectsEqual', () => {
    it('returns true for equal objects', () => {
      assert.strictEqual(areJsonObjectsEqual({ a: 1 }, { a: 1 }), true);
    });

    it('returns false for different objects', () => {
      assert.strictEqual(areJsonObjectsEqual({ a: 1 }, { a: 2 }), false);
    });

    it('returns true for equal arrays', () => {
      assert.strictEqual(areJsonObjectsEqual([1, 2, 3], [1, 2, 3]), true);
    });

    it('returns false for null/undefined mismatch', () => {
      assert.strictEqual(areJsonObjectsEqual(null, { a: 1 }), false);
    });
  });

  describe('normalizeComparableContent', () => {
    it('trims whitespace', () => {
      assert.strictEqual(normalizeComparableContent('  hello  '), 'hello');
    });

    it('trims trailing newlines', () => {
      assert.strictEqual(normalizeComparableContent('hello\n\n'), 'hello');
    });

    it('returns empty string for null', () => {
      assert.strictEqual(normalizeComparableContent(null), '');
    });
  });

  describe('cloneBlocks', () => {
    it('deep clones array', () => {
      const original = [{ type: 'text', nested: { value: 1 } }];
      const cloned = cloneBlocks(original);
      assert.deepStrictEqual(cloned, original);
      cloned[0].nested.value = 2;
      assert.notStrictEqual(cloned[0].nested.value, original[0].nested.value);
    });

    it('returns null for non-array', () => {
      assert.strictEqual(cloneBlocks(null), null);
    });
  });
});