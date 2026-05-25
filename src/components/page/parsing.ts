export interface ColumnDropId {
  sectionId: string
  rowId: string
  columnId: string
}

export interface PageAndLang {
  page: string
  lang: string
}

export function parseColumnDropId(value: string): ColumnDropId | null {
  const text = String(value || '');
  if (!text.startsWith('column-drop:')) {
    return null;
  }
  const parts = text.split(':');
  if (parts.length !== 4) {
    return null;
  }
  return {
    sectionId: parts[1],
    rowId: parts[2],
    columnId: parts[3],
  };
}

export function parseColumnDragId(value: string): ColumnDropId | null {
  const text = String(value || '');
  if (!text.startsWith('column:')) {
    return null;
  }
  const parts = text.split(':');
  if (parts.length !== 4) {
    return null;
  }
  return {
    sectionId: parts[1],
    rowId: parts[2],
    columnId: parts[3],
  };
}

export function parseColumnTargetId(value: string): ColumnDropId | null {
  const text = String(value || '');
  if (!text.startsWith('column-target:')) {
    return null;
  }
  const parts = text.split(':');
  if (parts.length !== 4) {
    return null;
  }
  return {
    sectionId: parts[1],
    rowId: parts[2],
    columnId: parts[3],
  };
}

export function parseAnyColumnTarget(value: string): ColumnDropId | null {
  return parseColumnDropId(value) || parseColumnTargetId(value) || parseColumnDragId(value);
}

export function parsePageAndLang(filePath: string): PageAndLang | null {
  const text = String(filePath || '').replace(/\\/g, '/');

  // Strip leading absolute-path prefix (e.g. /home/madkoding/.../content/ or C:\...\)
  const contentMatch = text.match(/\/content\//);
  const relativePath = contentMatch ? text.slice(text.indexOf('/content/') + '/content/'.length) : text;

  const parts = relativePath.split('/');

  // content/pages/<page>/<lang>.md
  if (parts.length >= 3 && parts[0] === 'pages') {
    const page = parts[1];
    const langBase = parts[2] || '';
    const dotIdx = langBase.lastIndexOf('.');
    const lang = dotIdx > 0 ? langBase.slice(0, dotIdx) : langBase;
    if (page && lang && !page.includes('.') && !lang.includes('.')) {
      return { page, lang };
    }
  }

  // content/i18n/<lang>.md
  if (parts.length >= 2 && parts[0] === 'i18n') {
    const langBase = parts[1] || '';
    const dotIdx = langBase.lastIndexOf('.');
    const lang = dotIdx > 0 ? langBase.slice(0, dotIdx) : langBase;
    if (lang && !lang.includes('.')) {
      return { page: 'i18n', lang };
    }
  }

  // fallback: legacy page.lang.md format
  const lastSlash = relativePath.lastIndexOf('/');
  if (lastSlash < 0) return null;
  const nameWithExt = relativePath.slice(lastSlash + 1);
  const dot = nameWithExt.lastIndexOf('.');
  if (dot < 0) return null;
  const base = nameWithExt.slice(0, dot);
  const dotParts = base.split('.');
  if (dotParts.length !== 2) return null;
  return { page: dotParts[0], lang: dotParts[1] };
}

export function parseBlockId(value: string): { blockIndex: number; rowIndex: number; columnIndex: number; itemIndex: number } | null {
  const text = String(value || '');
  const parts = text.split(':');
  if (parts.length !== 4) {
    return null;
  }
  return {
    blockIndex: parseInt(parts[0], 10),
    rowIndex: parseInt(parts[1], 10),
    columnIndex: parseInt(parts[2], 10),
    itemIndex: parseInt(parts[3], 10),
  };
}

export function parseRowId(value: string): string | null {
  const text = String(value || '');
  if (!text.startsWith('row:')) {
    return null;
  }
  return text.slice(4);
}

export function parseColumnId(value: string): string | null {
  const text = String(value || '');
  if (!text.startsWith('col:')) {
    return null;
  }
  return text.slice(4);
}

export function parseRowDropId(value: string): { sectionId: string; rowId: string } | null {
  const text = String(value || '');
  if (!text.startsWith('row-drop:')) {
    return null;
  }
  const parts = text.split(':');
  if (parts.length !== 3) {
    return null;
  }
  return {
    sectionId: parts[1],
    rowId: parts[2],
  };
}

export function parseSectionDropId(value: string): string | null {
  const text = String(value || '');
  if (!text.startsWith('section-drop:')) {
    return null;
  }
  return text.slice(13);
}

export function makeUploadStateKey(blockIndex: number, rowIndex: number, columnIndex: number, itemIndex: number): string {
  return `${blockIndex}:${rowIndex}:${columnIndex}:${itemIndex}`;
}

export function buildColumnDropId(sectionId: string, rowId: string, columnId: string): string {
  return `column-drop:${sectionId}:${rowId}:${columnId}`;
}

export function buildRowDropId(sectionId: string, rowId: string): string {
  return `row-drop:${sectionId}:${rowId}`;
}

export function buildSectionDropId(sectionId: string): string {
  return `section-drop:${sectionId}`;
}

export function buildColumnDragId(sectionId: string, rowId: string, columnId: string): string {
  return `column:${sectionId}:${rowId}:${columnId}`;
}

export function buildColumnTargetId(sectionId: string, rowId: string, columnId: string): string {
  return `column-target:${sectionId}:${rowId}:${columnId}`;
}