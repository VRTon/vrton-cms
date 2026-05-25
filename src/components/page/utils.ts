import { makeId, makeItemId, makeRowId, makeColumnId } from './ids';

export function normalizeSectionItems(items: unknown[]): Array<{ _iid: string } & Record<string, unknown>> {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item) => ({ ...item as Record<string, unknown>, _iid: (item as { _iid?: string })._iid || makeItemId() }));
}

export function createDefaultSectionColumn(items: unknown[] = []): { _colid: string; width: number; items: Array<{ _iid: string } & Record<string, unknown>> } {
  return {
    _colid: makeColumnId(),
    width: 12,
    items: normalizeSectionItems(items),
  };
}

export function createDefaultSectionRow(items: unknown[] = []): { _rid: string; columns: ReturnType<typeof createDefaultSectionColumn>[] } {
  return {
    _rid: makeRowId(),
    columns: [createDefaultSectionColumn(items)],
  };
}

export function normalizeSectionRows(
  rows: unknown[],
  fallbackItems: unknown[] = [],
): Array<{ _rid: string; columns: Array<{ _colid: string; width: number; items: Array<{ _iid: string } & Record<string, unknown>> }> }> {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [createDefaultSectionRow(fallbackItems)];
  }

  return rows.map((row) => {
    const rowData = row as { columns?: unknown[]; items?: unknown[]; _rid?: string };
    const rowColumns = Array.isArray(rowData.columns) && rowData.columns.length > 0
      ? rowData.columns.map((column) => {
        const colData = column as { _colid?: string; width?: number; items?: unknown[] };
        return {
          ...column,
          _colid: colData._colid || makeColumnId(),
          width: Math.min(12, Math.max(1, Number(colData.width) || 12)),
          items: normalizeSectionItems(colData.items),
        };
      })
      : [createDefaultSectionColumn(Array.isArray(rowData.items) ? rowData.items : [])];

    return {
      ...row,
      _rid: rowData._rid || makeRowId(),
      columns: rowColumns,
    };
  });
}

export function countSectionItems(block: { type?: string; rows?: unknown[]; items?: unknown[] } | null | undefined): number {
  if (!block || block.type !== 'section') {
    return 0;
  }
  if (Array.isArray(block.rows)) {
    return block.rows.reduce((sum, row) => {
      const rowData = row as { columns?: unknown[] };
      const columns = Array.isArray(rowData.columns) ? rowData.columns : [];
      return sum + columns.reduce((columnSum, column) => {
        const colData = column as { items?: unknown[] };
        return columnSum + (Array.isArray(colData.items) ? colData.items.length : 0);
      }, 0);
    }, 0);
  }
  return Array.isArray(block.items) ? block.items.length : 0;
}

export function findItemLocationInSection(
  section: { type?: string; rows?: unknown[]; items?: unknown[] },
  itemId: string,
): { rowIndex: number; columnIndex: number; itemIndex: number } | null {
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
      const itemIndex = items.findIndex((item) => (item as { _iid?: string })._iid === itemId);
      if (itemIndex >= 0) {
        return { rowIndex, columnIndex, itemIndex };
      }
    }
  }

  return null;
}

export function cloneBlocks<T>(blocks: T): T {
  return JSON.parse(JSON.stringify(blocks));
}

export function areJsonObjectsEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function normalizeComparableContent(content: string): string {
  return content.replace(/\s+/g, ' ').trim();
}

export function parsePipedEntries(input: string, keys: string[]): Array<Record<string, string>> {
  if (!input || typeof input !== 'string') {
    return [];
  }
  return input.split('\n').filter(Boolean).map((line) => {
    const parts = line.split('|').map((part) => part.trim());
    const entry: Record<string, string> = {};
    keys.forEach((key, index) => {
      entry[key] = parts[index] || '';
    });
    return entry;
  });
}

export function formatPipedEntries(items: Array<Record<string, string>>, keys: string[]): string {
  if (!Array.isArray(items)) {
    return '';
  }
  return items.map((item) => keys.map((key) => item[key] || '').join('|')).join('\n');
}

export function normalizeScheduleItems(items: unknown[]): Array<{ time: string; title: string; details?: string }> {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item) => {
    const entry = item as { time?: string; title?: string; details?: string };
    return {
      time: entry.time || '',
      title: entry.title || '',
      details: entry.details,
    };
  });
}

export function normalizeFooterQuickLinks(items: unknown[]): Array<{ label: string; href: string }> {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item) => {
    const entry = item as { label?: string; href?: string };
    return { label: entry.label || '', href: entry.href || '' };
  });
}

export function normalizeSocialLinks(
  items: unknown[],
  presets: Array<{ id: string; name: string; href: string; icon: string; className: string }>,
): Array<{ id?: string; label: string; href: string; icon: string }> {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item) => {
    const entry = item as { id?: string; label?: string; href?: string };
    if (entry.id) {
      const preset = presets.find((p) => p.id === entry.id);
      if (preset) {
        return { id: preset.id, label: preset.name, href: preset.href, icon: preset.icon };
      }
    }
    return { label: entry.label || '', href: entry.href || '', icon: '' };
  });
}

export function isValidOptionalHttpUrl(url: string): boolean {
  if (!url) {
    return true;
  }
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function getBlockTypeOccurrence(
  blocks: Array<{ type?: string }>,
  type: string,
  occurrence: number,
): number {
  let count = 0;
  for (let i = 0; i < blocks.length; i += 1) {
    if (blocks[i]?.type === type) {
      count += 1;
      if (count === occurrence) {
        return i;
      }
    }
  }
  return -1;
}

export function findBlockByTypeOccurrence(
  blocks: Array<{ type?: string }>,
  type: string,
  occurrence: number,
): { block: { type?: string }; index: number } | null {
  const index = getBlockTypeOccurrence(blocks, type, occurrence);
  if (index < 0) {
    return null;
  }
  return { block: blocks[index], index };
}

export function makeCollaboratorId(name: string): string {
  const normalized = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || `collab-${Date.now()}`;
}

export function normalizeCollaboratorsCatalog(
  collaborators: unknown[],
): Array<{ id: string; src?: string; alt?: string; name?: string; href?: string }> {
  if (!Array.isArray(collaborators)) {
    return [];
  }
  return collaborators.map((c) => {
    const entry = c as { id?: string; src?: string; alt?: string; name?: string; href?: string };
    return {
      id: entry.id || makeCollaboratorId(entry.name || ''),
      src: entry.src,
      alt: entry.alt,
      name: entry.name,
      href: entry.href,
    };
  });
}

export function buildCollaboratorsCatalogFromRows(
  rows: Array<{ collaboratorIds?: string[]; collaborators?: unknown[] }>,
): Array<{ id: string; src?: string; alt?: string; name?: string; href?: string }> {
  const catalog: Map<string, { id: string; src?: string; alt?: string; name?: string; href?: string }> = new Map();
  for (const row of rows) {
    if (Array.isArray(row.collaborators)) {
      for (const collab of row.collaborators) {
        const entry = collab as { id?: string; src?: string; alt?: string; name?: string; href?: string };
        if (entry.id && !catalog.has(entry.id)) {
          catalog.set(entry.id, {
            id: entry.id,
            src: entry.src,
            alt: entry.alt,
            name: entry.name,
            href: entry.href,
          });
        }
      }
    }
  }
  return Array.from(catalog.values());
}

export function normalizeEventsRowsWithCatalog(
  rows: unknown[],
  catalog: Array<{ id: string; src?: string; alt?: string; name?: string; href?: string }>,
): Array<{ year?: string; amount?: string; events?: unknown[]; collaboratorIds?: string[]; collaborators?: unknown[] }> {
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows.map((row) => {
    const entry = row as { year?: string; amount?: string; events?: unknown[]; collaboratorIds?: string[]; collaborators?: unknown[] };
    const collaborators = (entry.collaboratorIds || [])
      .map((id: string) => catalog.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => ({ src: (c as { src?: string }).src, alt: (c as { name?: string }).name, href: (c as { href?: string }).href }));
    return { ...entry, collaborators };
  });
}

export function applyCollaboratorsCatalogToEventsBlock(
  block: { type?: string; meta?: { collaborators?: unknown[] } },
  collaboratorsCatalog: Array<{ id: string; src?: string; alt?: string; name?: string; href?: string }>,
): { type?: string; meta?: { collaborators?: unknown[] } } {
  if (!block || block.type !== 'events') {
    return block;
  }
  return { ...block, meta: { ...block.meta, collaborators: collaboratorsCatalog } };
}

export function normalizeEventsEditorData(
  data: { rows?: unknown[]; collaboratorsCatalog?: unknown[] },
): { rows: unknown[]; collaboratorsCatalog: unknown[] } {
  return {
    rows: Array.isArray(data.rows) ? data.rows : [],
    collaboratorsCatalog: normalizeCollaboratorsCatalog(data.collaboratorsCatalog || []),
  };
}

export function normalizeFaqEditorData(data: unknown): { leftItems: unknown[]; rightItems: unknown[] } {
  const entry = data as { leftItems?: unknown[]; rightItems?: unknown[] };
  return {
    leftItems: Array.isArray(entry.leftItems) ? entry.leftItems : [],
    rightItems: Array.isArray(entry.rightItems) ? entry.rightItems : [],
  };
}

export function withClientIds(blocks: unknown[]): unknown[] | null {
  if (!Array.isArray(blocks)) {
    return null;
  }
  return blocks.map((block) => {
    const b = block as { type?: string; _cid?: string; rows?: unknown[]; items?: unknown[] };
    return {
      ...block,
      ...(b.type === 'subsection' ? { type: 'section' } : {}),
      _cid: b._cid || makeId(),
      ...(b.type === 'section' || b.type === 'subsection'
        ? { rows: normalizeSectionRows(b.rows, b.items) }
        : {}),
    };
  });
}

export function stripClientIds(blocks: unknown[]): unknown[] {
  if (!Array.isArray(blocks)) {
    return blocks;
  }
  return blocks.map((block) => {
    const b = block as { type?: string; rows?: unknown[]; items?: unknown[] };
    if (b.type === 'section') {
      return {
        ...block,
        rows: normalizeSectionRows(b.rows, b.items).map((row) => {
          const r = row as { _rid?: string; columns?: unknown[] };
          return {
            ...row,
            _rid: undefined,
            columns: (Array.isArray(r.columns) ? r.columns : []).map((column) => {
              const c = column as { _colid?: string; items?: unknown[] };
              return {
                ...column,
                _colid: undefined,
                items: (Array.isArray(c.items) ? c.items : []).map((item) => item),
              };
            }),
          };
        }),
      };
    }
    return block;
  });
}

export function normalizeBlocksForBuilder(blocks: unknown[]): unknown[] {
  if (!Array.isArray(blocks)) {
    return [];
  }
  return blocks.map((block) => {
    const b = block as { type?: string; items?: unknown[]; rows?: unknown[] };
    if (b.type === 'section' || b.type === 'subsection') {
      return { ...block, rows: normalizeSectionRows(b.rows, b.items) };
    }
    return block;
  });
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

