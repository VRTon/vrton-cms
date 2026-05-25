import { arrayMove } from '@dnd-kit/sortable';
import type { Block, Row, Column, Item, SectionBlock } from '../types';
import { normalizeSectionItems, createDefaultSectionColumn, createDefaultSectionRow, normalizeSectionRows } from '../components/page/utils';
import { parseColumnDropId, parseColumnDragId, parseColumnTargetId, parseAnyColumnTarget, parseRowDragId } from '../components/page/parsing';
import { isContainerBlock } from '../components/page/blocks';

function makeItemId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeColumnId() {
  return `col-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeRowId() {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface ItemLocation {
  rowIndex: number
  columnIndex: number
  itemIndex: number
}

interface ColumnDropInfo {
  sectionId: string
  rowId: string
  columnId: string
}

function findItemLocationInSection(section: SectionBlock, itemId: string): ItemLocation | null {
  if (!section || section.type !== 'section' || !itemId) {
    return null;
  }

  const rows = normalizeSectionRows(section.rows, section.items);
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const columns = Array.isArray(row.columns) ? row.columns : [];
    for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
      const column = columns[columnIndex];
      const items = Array.isArray(column.items) ? column.items : [];
      const itemIndex = items.findIndex((item) => item._iid === itemId);
      if (itemIndex >= 0) {
        return { rowIndex, columnIndex, itemIndex };
      }
    }
  }

  return null;
}

interface RowDragInfo {
  sectionId: string
  rowId: string
}

function getFirstColumnTarget(section: SectionBlock | undefined, rowId: string): ColumnDropInfo | null {
  if (!section || section.type !== 'section') {
    return null;
  }
  const rows = normalizeSectionRows(section.rows, section.items);
  const row = rows.find((entry) => entry._rid === rowId);
  if (!row) {
    return null;
  }
  const column = Array.isArray(row.columns) ? row.columns[0] : null;
  if (!column) {
    return null;
  }
  return {
    sectionId: section._cid,
    rowId: row._rid,
    columnId: column._colid,
  };
}

interface DragResult {
  nextBlocks: Block[]
  selectedSectionId?: string
}

export function applyRowDrag(current: Block[], activeId: string, overId: string): DragResult | null {
  const activeRow = parseRowDragId(activeId);
  const overRow = parseRowDragId(overId);
  if (!activeRow || !overRow || activeRow.sectionId !== overRow.sectionId) {
    return null;
  }

  const sectionIndex = current.findIndex((block) => block._cid === activeRow.sectionId && block.type === 'section');
  if (sectionIndex < 0) {
    return null;
  }

  const next = [...current];
  const section = { ...next[sectionIndex] } as SectionBlock;
  const rows = normalizeSectionRows(section.rows, section.items);
  const oldIndex = rows.findIndex((row) => row._rid === activeRow.rowId);
  const newIndex = rows.findIndex((row) => row._rid === overRow.rowId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
    return null;
  }

  section.rows = arrayMove(rows, oldIndex, newIndex);
  next[sectionIndex] = section;
  return { nextBlocks: next };
}

export function applyColumnDrag(current: Block[], activeId: string, overId: string): DragResult | null {
  const activeColumn = parseColumnDragId(activeId);
  const overColumn = parseColumnDragId(overId);
  const overColumnTarget = parseColumnTargetId(overId);
  const overColumnDrop = parseColumnDropId(overId);
  const target = overColumnTarget || overColumn || overColumnDrop;

  if (!activeColumn || !target || activeColumn.columnId === target.columnId) {
    return null;
  }

  const sourceSectionIndex = current.findIndex((block) => block._cid === activeColumn.sectionId && block.type === 'section');
  const targetSectionIndex = current.findIndex((block) => block._cid === target.sectionId && block.type === 'section');
  if (sourceSectionIndex < 0 || targetSectionIndex < 0) {
    return null;
  }

  const next = [...current];
  const sourceSection = { ...next[sourceSectionIndex] } as SectionBlock;
  const sourceRows = normalizeSectionRows(sourceSection.rows, sourceSection.items).map((row) => ({
    ...row,
    columns: (Array.isArray(row.columns) ? row.columns : []).map((column) => ({
      ...column,
      items: Array.isArray(column.items) ? [...column.items] : [],
    })),
  }));
  const targetSection = sourceSectionIndex === targetSectionIndex
    ? sourceSection
    : { ...next[targetSectionIndex] } as SectionBlock;
  const targetRows = sourceSectionIndex === targetSectionIndex
    ? sourceRows
    : normalizeSectionRows(targetSection.rows, targetSection.items).map((row) => ({
      ...row,
      columns: (Array.isArray(row.columns) ? row.columns : []).map((column) => ({
        ...column,
        items: Array.isArray(column.items) ? [...column.items] : [],
      })),
    }));

  const sourceRowIndex = sourceRows.findIndex((row) => row._rid === activeColumn.rowId);
  const targetRowIndex = targetRows.findIndex((row) => row._rid === target.rowId);
  if (sourceRowIndex < 0 || targetRowIndex < 0) {
    return null;
  }

  const sourceRow = { ...sourceRows[sourceRowIndex] };
  const sourceColumns = Array.isArray(sourceRow.columns) ? [...sourceRow.columns] : [] as Column[];
  const sourceColumnIndex = sourceColumns.findIndex((column) => column._colid === activeColumn.columnId);
  if (sourceColumnIndex < 0) {
    return null;
  }
  const [movedColumn] = sourceColumns.splice(sourceColumnIndex, 1);
  if (!movedColumn) {
    return null;
  }

  if (sourceColumns.length === 0) {
    sourceColumns.push(createDefaultSectionColumn([]));
  }
  sourceRow.columns = sourceColumns;
  sourceRows[sourceRowIndex] = sourceRow;

  const targetRow = { ...targetRows[targetRowIndex] };
  const targetColumns = Array.isArray(targetRow.columns) ? [...targetRow.columns] : [] as Column[];
  let insertAt = targetColumns.findIndex((column) => column._colid === target.columnId);
  if (insertAt < 0) {
    insertAt = targetColumns.length;
  }
  if (sourceRowIndex === targetRowIndex && sourceColumnIndex < insertAt) {
    insertAt -= 1;
  }
  targetColumns.splice(insertAt, 0, movedColumn);
  targetRow.columns = targetColumns;
  targetRows[targetRowIndex] = targetRow;

  sourceSection.rows = sourceRows;
  targetSection.rows = targetRows;
  next[sourceSectionIndex] = sourceSection;
  next[targetSectionIndex] = targetSection;
  return { nextBlocks: next, selectedSectionId: targetSection._cid };
}

export function applySubitemDrag(current: Block[], activeId: string, overId: string): DragResult | null {
  if (!activeId.startsWith('subitem:')) {
    return null;
  }
  const draggedItemId = activeId.replace('subitem:', '');
  const directColumnTarget = parseAnyColumnTarget(overId);
  const overRowTarget = parseRowDragId(overId);
  if (!overId.startsWith('subitem:') && !directColumnTarget && !overRowTarget) {
    return null;
  }

  let sourceBlockIndex = -1;
  let sourceLocation: ItemLocation | null = null;

  for (let index = 0; index < current.length; index += 1) {
    const block = current[index];
    if (!isContainerBlock(block)) {
      continue;
    }
    const location = findItemLocationInSection(block as SectionBlock, draggedItemId);
    if (location) {
      sourceBlockIndex = index;
      sourceLocation = location;
      break;
    }
  }

  if (sourceBlockIndex < 0 || !sourceLocation || !isContainerBlock(current[sourceBlockIndex])) {
    return null;
  }

  const next = [...current];
  const sourceBlock = { ...next[sourceBlockIndex] } as SectionBlock;
  const sourceRows = normalizeSectionRows(sourceBlock.rows, sourceBlock.items).map((row) => ({
    ...row,
    columns: (Array.isArray(row.columns) ? row.columns : []).map((column) => ({
      ...column,
      items: Array.isArray(column.items) ? [...column.items] : [],
    })),
  }));

  // eslint-disable-next-line max-len
  if (!sourceRows[sourceLocation.rowIndex] || !sourceRows[sourceLocation.rowIndex].columns[sourceLocation.columnIndex]) {
    return null;
  }

  const sourceColumn = sourceRows[sourceLocation.rowIndex].columns[sourceLocation.columnIndex];
  const sourceItems = sourceColumn.items;
  if (!sourceItems[sourceLocation.itemIndex]) {
    return null;
  }

  const draggedItem = sourceItems[sourceLocation.itemIndex];
  sourceItems.splice(sourceLocation.itemIndex, 1);
  sourceBlock.rows = sourceRows;
  next[sourceBlockIndex] = sourceBlock;

  let targetColumn = parseAnyColumnTarget(overId);
  if (!targetColumn && overRowTarget) {
    const rowSection = next.find((block) => block._cid === overRowTarget.sectionId && block.type === 'section') as SectionBlock | undefined;
    targetColumn = getFirstColumnTarget(rowSection, overRowTarget.rowId);
  }

  if (targetColumn) {
    const targetBlockIndex = next.findIndex((block) => block._cid === targetColumn.sectionId && block.type === 'section');
    if (targetBlockIndex < 0) {
      return null;
    }

    const targetBlock = { ...next[targetBlockIndex] } as SectionBlock;
    const targetRows = normalizeSectionRows(targetBlock.rows, targetBlock.items).map((row) => ({
      ...row,
      columns: (Array.isArray(row.columns) ? row.columns : []).map((column) => ({
        ...column,
        items: Array.isArray(column.items) ? [...column.items] : [],
      })),
    }));

    const targetRowIndex = targetRows.findIndex((row) => row._rid === targetColumn.rowId);
    if (targetRowIndex < 0) {
      return null;
    }
    // eslint-disable-next-line max-len
    const targetColumnIndex = (targetRows[targetRowIndex].columns || []).findIndex((column) => column._colid === targetColumn.columnId);
    if (targetColumnIndex < 0) {
      return null;
    }

    const targetItems = targetRows[targetRowIndex].columns[targetColumnIndex].items;
    targetItems.push(draggedItem);
    targetBlock.rows = targetRows;
    next[targetBlockIndex] = targetBlock;
    return { nextBlocks: next, selectedSectionId: targetBlock._cid };
  }

  const overItemId = overId.replace('subitem:', '');
  let targetBlockIndex = -1;
  let targetLocation: ItemLocation | null = null;

  for (let index = 0; index < next.length; index += 1) {
    const block = next[index];
    if (!isContainerBlock(block)) {
      continue;
    }
    const location = findItemLocationInSection(block as SectionBlock, overItemId);
    if (location) {
      targetBlockIndex = index;
      targetLocation = location;
      break;
    }
  }

  if (targetBlockIndex < 0 || !targetLocation || !isContainerBlock(next[targetBlockIndex])) {
    return null;
  }

  const targetBlock = { ...next[targetBlockIndex] } as SectionBlock;
  const targetRows = normalizeSectionRows(targetBlock.rows, targetBlock.items).map((row) => ({
    ...row,
    columns: (Array.isArray(row.columns) ? row.columns : []).map((column) => ({
      ...column,
      items: Array.isArray(column.items) ? [...column.items] : [],
    })),
  }));

  // eslint-disable-next-line max-len
  if (!targetRows[targetLocation.rowIndex] || !targetRows[targetLocation.rowIndex].columns[targetLocation.columnIndex]) {
    return null;
  }

  const targetItems = targetRows[targetLocation.rowIndex].columns[targetLocation.columnIndex].items;
  const insertAt = targetLocation.itemIndex;

  targetItems.splice(insertAt, 0, draggedItem);
  targetBlock.rows = targetRows;
  next[targetBlockIndex] = targetBlock;
  return { nextBlocks: next, selectedSectionId: targetBlock._cid };
}