import test from 'node:test';
import assert from 'node:assert/strict';
import { applySubitemDrag, applyColumnDrag, applyRowDrag } from './adminDragModel.js';

function makeSection(id, rows) {
  return {
    _cid: id,
    type: 'section',
    rows,
  };
}

function makeRow(id, columns) {
  return {
    _rid: id,
    columns,
  };
}

function makeColumn(id, itemIds = []) {
  return {
    _colid: id,
    width: 12,
    items: itemIds.map((itemId) => ({ _iid: itemId, type: 'text', markdown: itemId })),
  };
}

function findColumn(blocks, sectionId, rowId, columnId) {
  const section = blocks.find((block) => block._cid === sectionId);
  const row = section.rows.find((entry) => entry._rid === rowId);
  return row.columns.find((entry) => entry._colid === columnId);
}

test('reorders rows within same section', () => {
  const blocks = [
    makeSection('s1', [
      makeRow('r1', [makeColumn('c1', ['i1'])]),
      makeRow('r2', [makeColumn('c2', ['i2'])]),
    ]),
  ];

  const result = applyRowDrag(blocks, 'row:s1:r1', 'row:s1:r2');
  assert.ok(result);
  assert.equal(result.nextBlocks[0].rows[0]._rid, 'r2');
  assert.equal(result.nextBlocks[0].rows[1]._rid, 'r1');
});

test('moves column across different rows and sections', () => {
  const blocks = [
    makeSection('s1', [
      makeRow('r1', [makeColumn('c1', ['i1'])]),
    ]),
    makeSection('s2', [
      makeRow('r2', [makeColumn('c2', ['i2'])]),
    ]),
  ];

  const result = applyColumnDrag(blocks, 'column:s1:r1:c1', 'column-target:s2:r2:c2');
  assert.ok(result);
  assert.equal(result.selectedSectionId, 's2');

  const sourceFallbackColumn = findColumn(result.nextBlocks, 's1', 'r1', 'c1');
  assert.equal(sourceFallbackColumn, undefined);
  assert.equal(result.nextBlocks[0].rows[0].columns.length, 1);
  assert.equal(result.nextBlocks[0].rows[0].columns[0].items.length, 0);

  const movedColumn = findColumn(result.nextBlocks, 's2', 'r2', 'c1');
  assert.ok(movedColumn);
  assert.equal(movedColumn.items[0]._iid, 'i1');
});

test('moves component to a different row column via column drop target', () => {
  const blocks = [
    makeSection('s1', [
      makeRow('r1', [makeColumn('c1', ['i1'])]),
      makeRow('r2', [makeColumn('c2', [])]),
    ]),
  ];

  const result = applySubitemDrag(blocks, 'subitem:i1', 'column-drop:s1:r2:c2');
  assert.ok(result);

  const sourceColumn = findColumn(result.nextBlocks, 's1', 'r1', 'c1');
  const targetColumn = findColumn(result.nextBlocks, 's1', 'r2', 'c2');
  assert.equal(sourceColumn.items.length, 0);
  assert.equal(targetColumn.items.length, 1);
  assert.equal(targetColumn.items[0]._iid, 'i1');
});

test('moves component when dropping over row handle (fallback first column)', () => {
  const blocks = [
    makeSection('s1', [
      makeRow('r1', [makeColumn('c1', ['i1'])]),
      makeRow('r2', [makeColumn('c2', [])]),
    ]),
  ];

  const result = applySubitemDrag(blocks, 'subitem:i1', 'row:s1:r2');
  assert.ok(result);

  const targetColumn = findColumn(result.nextBlocks, 's1', 'r2', 'c2');
  assert.equal(targetColumn.items.length, 1);
  assert.equal(targetColumn.items[0]._iid, 'i1');
});

test('reorders item within same column when dropped over another item', () => {
  const blocks = [
    makeSection('s1', [
      makeRow('r1', [makeColumn('c1', ['i1', 'i2', 'i3'])]),
    ]),
  ];

  const result = applySubitemDrag(blocks, 'subitem:i1', 'subitem:i3');
  assert.ok(result);
  const column = findColumn(result.nextBlocks, 's1', 'r1', 'c1');
  assert.deepEqual(column.items.map((item) => item._iid), ['i2', 'i1', 'i3']);
});

test('moves item across sections via column-target', () => {
  const blocks = [
    makeSection('s1', [
      makeRow('r1', [makeColumn('c1', ['i1'])]),
    ]),
    makeSection('s2', [
      makeRow('r2', [makeColumn('c2', [])]),
    ]),
  ];

  const result = applySubitemDrag(blocks, 'subitem:i1', 'column-target:s2:r2:c2');
  assert.ok(result);
  assert.equal(result.selectedSectionId, 's2');
  const source = findColumn(result.nextBlocks, 's1', 'r1', 'c1');
  const target = findColumn(result.nextBlocks, 's2', 'r2', 'c2');
  assert.equal(source.items.length, 0);
  assert.equal(target.items.length, 1);
  assert.equal(target.items[0]._iid, 'i1');
});

test('returns null on invalid drag targets', () => {
  const blocks = [
    makeSection('s1', [
      makeRow('r1', [makeColumn('c1', ['i1'])]),
      makeRow('r2', [makeColumn('c2', ['i2'])]),
    ]),
  ];

  assert.equal(applyRowDrag(blocks, 'row:s1:r1', 'row:s2:r2'), null);
  assert.equal(applyColumnDrag(blocks, 'column:s1:r1:c1', 'column:s1:r1:c1'), null);
  assert.equal(applySubitemDrag(blocks, 'subitem:missing', 'column-drop:s1:r2:c2'), null);
});
