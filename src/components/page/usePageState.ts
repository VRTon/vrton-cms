import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useSensors, useSensor, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { API_PREFIX } from './constants';
import { parsePageAndLang } from './parsing';
import { extractI18nObject, injectI18nObject, extractBlocks, injectBlocks, deriveBlocksFromMarkdown } from './markdown';
import { withClientIds, stripClientIds, normalizeBlocksForBuilder, cloneBlocks } from './utils';
import { findBlockByTypeOccurrence, getBlockTypeOccurrence } from './utils';

export interface AdminFile {
  path: string
  updatedAt?: string
}

export interface PageGroup {
  page: string
  entries: Array<{ path: string; lang: string; section: string }>
}

export interface BlockItem {
  _iid: string
  _cid?: string
  type?: string
  [key: string]: unknown
}

export interface AdminState {
  files: AdminFile[]
  activePath: string
  setActivePath: (path: string) => void
  rawMarkdown: string
  setRawMarkdown: (md: string) => void
  lastSavedMarkdown: string
  setLastSavedMarkdown: (md: string) => void
  status: string
  setStatus: (s: string) => void
  busy: boolean
  setBusy: (b: boolean) => void
  blocksData: BlockItem[] | null
  setBlocksData: (data: BlockItem[] | null) => void
  blocksHistory: BlockItem[][]
  setBlocksHistory: (h: BlockItem[][]) => void
  historyCursor: number
  setHistoryCursor: (c: number) => void
  blocksError: string
  setBlocksError: (e: string) => void
  i18nData: unknown | null
  setI18nData: (d: unknown) => void
  i18nError: string
  setI18nError: (e: string) => void
  selectedBlockId: string
  setSelectedBlockId: (id: string) => void
  canUndo: boolean
  canRedo: boolean
  pushBlocksHistory: (nextBlocks: BlockItem[]) => void
  mutateBlocks: (updater: (current: BlockItem[] | null) => BlockItem[] | null) => void
  normalizedFiles: Array<{ path: string; page: string; lang: string; section: string }>
  pages: PageGroup[]
  loadFiles: () => Promise<void>
  loadActiveFile: (path: string) => Promise<void>
  sensors: ReturnType<typeof useSensors>
  historyCursorRef: React.MutableRefObject<number>
  blocksHistoryRef: React.MutableRefObject<BlockItem[][]>
}

export function usePageState(contentMode: string = 'pages'): AdminState {
  const [files, setFiles] = useState<AdminFile[]>([]);
  const [activePath, setActivePath] = useState('');
  const [rawMarkdown, setRawMarkdown] = useState('');
  const [lastSavedMarkdown, setLastSavedMarkdown] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [blocksData, setBlocksData] = useState<BlockItem[] | null>(null);
  const [blocksHistory, setBlocksHistory] = useState<BlockItem[][]>([]);
  const [historyCursor, setHistoryCursor] = useState(-1);
  const [blocksError, setBlocksError] = useState('');
  const [i18nData, setI18nData] = useState<unknown | null>(null);
  const [i18nError, setI18nError] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [showAdvancedI18n, setShowAdvancedI18n] = useState(false);

  const historyCursorRef = useRef(-1);
  const blocksHistoryRef = useRef<BlockItem[][]>([]);

  const normalizedFiles = useMemo(() => {
    return files
      .map((file) => ({ ...file, ...parsePageAndLang(file.path) }))
      .filter((file) => (file.section === 'pages' || file.section === 'i18n') && file.page);
  }, [files]);

  const pages = useMemo(() => {
    const source = normalizedFiles.filter((entry) => entry.section === 'pages' && entry.page);
    const groups = new Map<string, typeof normalizedFiles>();
    for (const file of source) {
      if (!groups.has(file.page)) {
        groups.set(file.page, []);
      }
      groups.get(file.page).push(file);
    }
    return Array.from(groups.entries())
      .filter(([page]) => page !== 'not-found')
      .map(([page, entries]) => ({
        page,
        entries: entries.sort((a, b) => (a.lang || '').localeCompare(b.lang || '')),
      }))
      .sort((a, b) => (a.page || '').localeCompare(b.page || ''));
  }, [normalizedFiles]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    historyCursorRef.current = historyCursor;
    blocksHistoryRef.current = blocksHistory;
  }, [historyCursor, blocksHistory]);

  const pushBlocksHistory = useCallback((nextBlocks: BlockItem[]) => {
    if (!Array.isArray(nextBlocks)) {
      return;
    }
    const snapshot = cloneBlocks(nextBlocks);
    if (!Array.isArray(snapshot)) {
      return;
    }
    setBlocksHistory((current) => {
      const cursor = historyCursorRef.current;
      const hasCurrentSnapshot = cursor >= 0 && cursor < current.length;
      const baseline = hasCurrentSnapshot ? current[cursor] : null;
      const nextSerialized = JSON.stringify(snapshot);
      if (baseline && JSON.stringify(baseline) === nextSerialized) {
        return current;
      }
      const trimmed = cursor >= 0 ? current.slice(0, cursor + 1) : [];
      const nextHistory = [...trimmed, snapshot];
      const limitedHistory = nextHistory.length > 100 ? nextHistory.slice(nextHistory.length - 100) : nextHistory;
      setHistoryCursor(limitedHistory.length - 1);
      return limitedHistory;
    });
  }, []);

  const mutateBlocks = useCallback((updater: (current: BlockItem[] | null) => BlockItem[] | null) => {
    setBlocksData((current) => {
      const next = updater(current);
      if (!Array.isArray(next)) {
        return next;
      }
      pushBlocksHistory(next);
      return next;
    });
  }, [pushBlocksHistory]);

  const loadFiles = useCallback(async () => {
    const response = await fetch(`${API_PREFIX}/list`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Unable to load files');
    }

    setFiles(payload.files || []);

    if (!activePath && (payload.files || []).length > 0) {
      const targetSection = contentMode === 'links' ? 'i18n' : 'pages';
      const parsed = (payload.files || [])
        .map((file: AdminFile) => ({ ...file, ...parsePageAndLang(file.path) }))
        .filter((file: { section?: string; page?: string; lang?: string }) => file.section === targetSection && file.page && file.lang);

      const preferredHomeSpanish = parsed.find((file) => file.page === 'home' && file.lang === 'es');
      const preferredSpanish = parsed.find((file) => file.lang === 'es');
      const preferredHome = parsed.find((file) => file.page === 'home');

      setActivePath(preferredHomeSpanish?.path || preferredSpanish?.path || preferredHome?.path || parsed[0]?.path || '');
    }
  }, [activePath, contentMode]);

  const loadActiveFile = useCallback(async (pathValue: string) => {
    const response = await fetch(`${API_PREFIX}/file?path=${encodeURIComponent(pathValue)}`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Unable to load file');
    }

    const normalizedPath = String(pathValue || '').replace(/\\/g, '/');
    const isI18nPath = /\/content\/i18n\/[^/]+\.md$/.test(normalizedPath) || /\/i18n\/[^/]+\.md$/.test(normalizedPath);

    if (isI18nPath) {
      setRawMarkdown(payload.content);
      setLastSavedMarkdown(payload.content);
      const { data, error } = extractI18nObject(payload.content);
      setI18nData(data);
      setI18nError(error);
      setBlocksData(null);
      setBlocksHistory([]);
      setHistoryCursor(-1);
      setBlocksError('');
      setSelectedBlockId('');
    } else {
      const selectedLocator = blocksData ? getBlockTypeOccurrence(blocksData, selectedBlockId) : -1;
      setI18nData(null);
      setI18nError('');
      const { blocks, error } = extractBlocks(payload.content);
      const sourceBlocks = Array.isArray(blocks) ? blocks : deriveBlocksFromMarkdown(payload.content);
      const normalizedBlocks = withClientIds(normalizeBlocksForBuilder(sourceBlocks));
      const normalizedContent = injectBlocks(payload.content, stripClientIds(normalizedBlocks || []));
      setRawMarkdown(normalizedContent);
      setLastSavedMarkdown(normalizedContent);
      setBlocksData(normalizedBlocks);
      setBlocksHistory(Array.isArray(normalizedBlocks) ? [cloneBlocks(normalizedBlocks) as BlockItem[]] : []);
      setHistoryCursor(Array.isArray(normalizedBlocks) ? 0 : -1);
      setBlocksError(error);
      const matchingBlock = findBlockByTypeOccurrence(normalizedBlocks, selectedLocator);
      setSelectedBlockId(matchingBlock?._cid || normalizedBlocks?.[0]?._cid || '');
    }
  }, [blocksData, selectedBlockId]);

  const canUndo = historyCursor > 0;
  const canRedo = historyCursor >= 0 && historyCursor < blocksHistory.length - 1;

  return {
    files,
    activePath,
    setActivePath,
    rawMarkdown,
    setRawMarkdown,
    lastSavedMarkdown,
    setLastSavedMarkdown,
    status,
    setStatus,
    busy,
    setBusy,
    blocksData,
    setBlocksData,
    blocksHistory,
    setBlocksHistory,
    historyCursor,
    setHistoryCursor,
    blocksError,
    setBlocksError,
    i18nData,
    setI18nData,
    i18nError,
    setI18nError,
    selectedBlockId,
    setSelectedBlockId,
    canUndo,
    canRedo,
    pushBlocksHistory,
    mutateBlocks,
    normalizedFiles,
    pages,
    loadFiles,
    loadActiveFile,
    sensors,
    historyCursorRef,
    blocksHistoryRef,
  };
}
