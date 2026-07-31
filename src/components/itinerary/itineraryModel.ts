import type {
  ItineraryActivity,
  ItineraryBlock,
  ItineraryColumn,
  ItineraryColumnId,
  ItineraryIcon,
  ItineraryRow,
} from '../../types';

export const ITINERARY_COLUMN_IDS: ItineraryColumnId[] = ['main', 'party'];

export const ITINERARY_ICON_OPTIONS: Array<{ value: ItineraryIcon; label: string; className: string }> = [
  { value: 'welcome', label: 'Welcome', className: 'fa-hand-sparkles' },
  { value: 'accessibility', label: 'Accessibility', className: 'fa-universal-access' },
  { value: 'panel', label: 'Panel', className: 'fa-microphone-lines' },
  { value: 'story', label: 'Story', className: 'fa-microphone' },
  { value: 'music', label: 'Music', className: 'fa-music' },
  { value: 'social', label: 'Social', className: 'fa-people-group' },
  { value: 'ceremony', label: 'Ceremony', className: 'fa-heart' },
  { value: 'ambient', label: 'Ambient', className: 'fa-headphones' },
  { value: 'dj', label: 'DJ', className: 'fa-music' },
  { value: 'dance', label: 'Dance', className: 'fa-person-rays' },
  { value: 'games', label: 'Games', className: 'fa-gamepad' },
];

const ICON_VALUES = new Set(ITINERARY_ICON_OPTIONS.map((option) => option.value));

const DEFAULT_COLUMNS: [ItineraryColumn, ItineraryColumn] = [
  { id: 'main', label: 'Main Instance' },
  { id: 'party', label: 'Party Instance' },
];

export interface NormalizeItineraryOptions {
  preserveEditableWhitespace?: boolean
}

function text(value: unknown, options: NormalizeItineraryOptions = {}): string {
  if (typeof value !== 'string') {
    return '';
  }
  return options.preserveEditableWhitespace ? value : value.trim();
}

function normalizeTime(value: unknown): string {
  const normalized = text(value);
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalized) ? normalized : '';
}

export function getItineraryIconClass(icon?: ItineraryIcon): string {
  return ITINERARY_ICON_OPTIONS.find((option) => option.value === icon)?.className || 'fa-calendar-day';
}

export function getItineraryDescriptionPreview(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.split(/\r?\n/, 1)[0].trim();
}

export function normalizeItineraryActivity(
  value: unknown,
  options: NormalizeItineraryOptions = {},
): ItineraryActivity | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const entry = value as Record<string, unknown>;
  const title = text(entry.title, options);
  const description = text(entry.description, options);
  const speaker = text(entry.speaker, options);
  const image = text(entry.image, options);
  const imageAlt = text(entry.imageAlt, options);
  const icon = text(entry.icon) as ItineraryIcon;

  return {
    title,
    description,
    ...(speaker ? { speaker } : {}),
    ...(image ? { image } : {}),
    ...(imageAlt ? { imageAlt } : {}),
    ...(ICON_VALUES.has(icon) ? { icon } : {}),
  };
}

function normalizeColumn(
  value: unknown,
  id: ItineraryColumnId,
  options: NormalizeItineraryOptions,
): ItineraryColumn {
  const fallback = DEFAULT_COLUMNS.find((column) => column.id === id) as ItineraryColumn;
  if (!value || typeof value !== 'object') {
    return { ...fallback };
  }
  const column = value as Record<string, unknown>;
  const label = text(column.label, options);
  return {
    id,
    label: options.preserveEditableWhitespace ? label : label || fallback.label,
  };
}

export function normalizeItineraryRow(
  value: unknown,
  options: NormalizeItineraryOptions = {},
): ItineraryRow {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const activities = row.activities && typeof row.activities === 'object'
    ? row.activities as Record<string, unknown>
    : row;

  return {
    startTime: normalizeTime(row.startTime),
    endTime: normalizeTime(row.endTime),
    activities: {
      main: normalizeItineraryActivity(activities.main, options),
      party: normalizeItineraryActivity(activities.party, options),
    },
  };
}

export function createEmptyItineraryRow(): ItineraryRow {
  return {
    startTime: '',
    endTime: '',
    activities: { main: null, party: null },
  };
}

export function createEmptyItineraryActivity(): ItineraryActivity {
  return {
    title: '',
    description: '',
    icon: 'welcome',
  };
}

export function normalizeItineraryBlock(
  value: unknown,
  options: NormalizeItineraryOptions = {},
): ItineraryBlock {
  const block = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const sourceColumns = Array.isArray(block.columns) ? block.columns : [];
  const rows = Array.isArray(block.rows)
    ? block.rows.map((row) => normalizeItineraryRow(row, options))
    : [];

  return {
    ...block,
    type: 'itinerary',
    title: text(block.title, options),
    columns: [
      normalizeColumn(
        sourceColumns.find((column) => (column as { id?: unknown })?.id === 'main') || sourceColumns[0],
        'main',
        options,
      ),
      normalizeColumn(
        sourceColumns.find((column) => (column as { id?: unknown })?.id === 'party') || sourceColumns[1],
        'party',
        options,
      ),
    ],
    rows,
  } as ItineraryBlock;
}
