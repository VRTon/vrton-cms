import { useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { DndContext, DragOverlay, closestCenter, useDraggable, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { BLOCK_LIBRARY, getBlockIcon, getBlockLabel } from './constants';
import { createDefaultBlock, createSectionItem } from './blocks';
import { DraggableLibraryItem, SectionItemsDropZone, SortableSectionItemRow } from './DragComponents';
import { LibraryDragGhost, SubitemDragGhost, RowDragGhost, ColumnDragGhost } from './DragGhost';
import { buildDefaultEventsRows, buildDefaultFaqConfig } from '../home/defaultHomeContent';
import { fileToDataUrl, optimizeImageForUpload } from './upload';
import { socialLinks as socialLinkPresets } from '../common/SocialIcons';
import { slugify } from './utils';
import { extractI18nObject, injectI18nObject, injectBlocks } from './markdown';
import {
  areJsonObjectsEqual,
  normalizeComparableContent,
  normalizeSectionRows,
  stripClientIds,
  createDefaultSectionColumn,
  createDefaultSectionRow,
} from './utils';

interface PageGroup {
  page: string
  entries: Array<{ path: string; lang: string; section: string }>
}

interface I18nData {
  [key: string]: string
}

interface SectionItem {
  _iid?: string
  type?: string
}

interface GalleryItem {
  src?: string
  alt?: string
  caption?: string
}

interface AccordionItem {
  title?: string
  markdown?: string
}

interface ScheduleItem {
  time?: string
  title?: string
  details?: string
}

interface EventsRow {
  year?: string
  amount?: string
  events?: unknown[]
  collaborators?: unknown[]
  collaboratorIds?: string[]
}

interface CollaboratorCatalogEntry {
  id?: string
  name?: string
  src?: string
  href?: string
}

function getSelectedCollaboratorIds(row: EventsRow, catalog: CollaboratorCatalogEntry[]): string[] {
  const explicitIds = Array.isArray(row.collaboratorIds)
    ? row.collaboratorIds
      .map((id) => String(id || '').trim())
      .filter(Boolean)
    : [];

  if (explicitIds.length > 0) {
    return Array.from(new Set(explicitIds));
  }

  const legacyCollaborators = Array.isArray(row.collaborators)
    ? row.collaborators as Array<{ alt?: string; src?: string; href?: string }>
    : [];

  if (legacyCollaborators.length === 0 || catalog.length === 0) {
    return [];
  }

  const resolvedIds = legacyCollaborators
    .map((legacy) => {
      const legacyAlt = String(legacy.alt || '').trim().toLowerCase();
      const legacySrc = String(legacy.src || '').trim();
      const legacyHref = String(legacy.href || '').trim();

      const match = catalog.find((entry) => {
        const entryId = String(entry.id || '').trim();
        if (!entryId) {
          return false;
        }

        const entryName = String(entry.name || '').trim().toLowerCase();
        const entrySrc = String(entry.src || '').trim();
        const entryHref = String(entry.href || '').trim();

        if (legacySrc && entrySrc && legacySrc === entrySrc) {
          return true;
        }

        if (legacyAlt && entryName && legacyAlt === entryName) {
          return true;
        }

        if (legacyHref && entryHref && legacyHref === entryHref) {
          return true;
        }

        return false;
      });

      return String(match?.id || '').trim();
    })
    .filter(Boolean);

  return Array.from(new Set(resolvedIds));
}

function getImageExtensionFromMime(file: File): string {
  const mime = String(file.type || '').toLowerCase();
  if (mime === 'image/webp') {
    return 'webp';
  }
  if (mime === 'image/png') {
    return 'png';
  }
  if (mime === 'image/jpeg') {
    return 'jpg';
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  return ['png', 'jpg', 'jpeg', 'webp'].includes(ext) ? (ext === 'jpeg' ? 'jpg' : ext) : 'jpg';
}

interface FAQConfigItem {
  question?: string
  answer_html?: string
}

interface HeroButtonItem {
  label?: string
  href?: string
  variant?: 'primary' | 'accent'
  external?: boolean
}

interface SectionColumn {
  _colid?: string
  width?: number
  items?: SectionItem[]
}

interface SectionRow {
  _rid?: string
  columns?: SectionColumn[]
}

interface BlockEntry {
  _cid?: string
  type?: string
  rows?: SectionRow[]
  items?: SectionItem[]
  [key: string]: unknown
}

interface SortTargetProps {
  id: string
  children: ReactNode
  className?: string
}

function SortDropTarget({ id, children, className = '' }: SortTargetProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? 'is-over' : ''}`.trim()}>
      {children}
    </div>
  );
}

interface DragHandleButtonProps {
  id: string
  data: Record<string, unknown>
  icon: string
  title: string
}

function DragHandleButton({ id, data, icon, title }: DragHandleButtonProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data });
  return (
    <button
      ref={setNodeRef}
      type="button"
      className="admin-icon-btn secondary"
      style={{ opacity: isDragging ? 0.4 : 1 }}
      title={title}
      {...attributes}
      {...listeners}
    >
      <i className={`fa-solid ${icon}`} aria-hidden="true" />
    </button>
  );
}

interface AdminPageProps {
  contentMode: string
  pages: PageGroup[]
  normalizedFiles: Array<{ path: string; page: string; lang: string; section: string }>
  activePath: string
  onPathChange: (path: string, force?: boolean) => boolean
  selectPageSlug: (slug: string) => void
  i18nData: I18nData | null
  i18nError: string
  setI18nData: (data: I18nData | null) => void
  setI18nError: (error: string) => void
  rawMarkdown: string
  setRawMarkdown: (md: string) => void
  lastSavedMarkdown: string
  setLastSavedMarkdown: (md: string) => void
  status: string
  setStatus: (s: string) => void
  busy: boolean
  setBusy: (b: boolean) => void
  blocksData: unknown[] | null
  setBlocksData: (data: unknown[] | null) => void
  selectedBlockId: string
  setSelectedBlockId: (id: string) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  hasUnsavedChanges: boolean
  previewPath: string
  previewVersion: number
  setPreviewVersion: (v: number) => void
  previewDevice: string
  setPreviewDevice: (d: string) => void
  previewHostWidth: number
  setPreviewHostWidth: (w: number) => void
  isModeMenuOpen: boolean
  setIsModeMenuOpen: (open: boolean) => void
  contentMode: string
  setContentMode: (mode: string) => void
  isCreateModalOpen: boolean
  setIsCreateModalOpen: (open: boolean) => void
  isPreviewModalOpen: boolean
  setIsPreviewModalOpen: (open: boolean) => void
  newPageTitle: string
  setNewPageTitle: (title: string) => void
  onCreatePage: () => void
  blocksHistory: unknown[][]
  historyCursor: number
  pushBlocksHistory: (blocks: unknown[]) => void
  mutateBlocks: (updater: (current: unknown[] | null) => unknown[] | null) => void
  loadFiles: () => Promise<void>
  loadActiveFile: (path: string) => Promise<void>
  saveFile: (path: string, content: string) => Promise<void>
  createFile: (path: string, content: string) => Promise<void>
  deleteFile: (path: string) => Promise<void>
}

function confirmDiscardChanges() {
  return window.confirm('You have unsaved changes. Are you sure you want to discard them?');
}

export function AdminPage(props: AdminPageProps) {
  const { t, i18n } = useTranslation();

  const {
    contentMode,
    pages,
    normalizedFiles,
    activePath,
    onPathChange,
    selectPageSlug,
    i18nData,
    i18nError,
    setI18nData,
    setI18nError,
    rawMarkdown,
    setRawMarkdown,
    lastSavedMarkdown,
    setLastSavedMarkdown,
    status,
    setStatus,
    busy,
    setBusy,
    blocksData,
    selectedBlockId,
    setSelectedBlockId,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    hasUnsavedChanges,
    previewPath,
    previewVersion,
    setPreviewVersion,
    previewDevice,
    setPreviewDevice,
    previewHostWidth,
    setPreviewHostWidth,
    isModeMenuOpen,
    setIsModeMenuOpen,
    setContentMode,
    isCreateModalOpen,
    setIsCreateModalOpen,
    isPreviewModalOpen,
    setIsPreviewModalOpen,
    newPageTitle,
    setNewPageTitle,
    onCreatePage,
    blocksHistory,
    historyCursor,
    mutateBlocks,
    loadFiles,
    loadActiveFile,
    saveFile,
    createFile,
    deleteFile,
  } = props;

  const [isMobileView, setIsMobileView] = useState(false);
  const [activeLibraryType, setActiveLibraryType] = useState<string | null>(null);
  const [activeSubitemType, setActiveSubitemType] = useState<string | null>(null);
  const [isRowDragging, setIsRowDragging] = useState(false);
  const [isColumnDragging, setIsColumnDragging] = useState(false);
  const [draggedEventSlide, setDraggedEventSlide] = useState<{ rowIndex: number; slideIndex: number } | null>(null);
  const [draggedFaqItem, setDraggedFaqItem] = useState<{ side: 'left' | 'right'; index: number } | null>(null);
  const [collaboratorsPicker, setCollaboratorsPicker] = useState<{ blockCid: string; rowIndex: number } | null>(null);

  useEffect(() => {
    const updateViewport = () => {
      const mobile = window.innerWidth <= 980;
      setIsMobileView(mobile);
      if (!mobile) {
        setIsModeMenuOpen(false);
      }
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, [setIsModeMenuOpen]);

  const activeMeta = useMemo(() => {
    return normalizedFiles.find((entry) => entry.path === activePath) || null;
  }, [normalizedFiles, activePath]);

  const isI18nFile = activeMeta?.section === 'i18n';
  const isPageFile = activeMeta?.section === 'pages';
  const activeLang = String(activeMeta?.lang || 'es').toLowerCase();

  useEffect(() => {
    if (activeLang && i18n.language !== activeLang) {
      i18n.changeLanguage(activeLang);
    }
  }, [activeLang, i18n]);

  const activePageGroup = useMemo(() => {
    if (!activeMeta?.page) {
      return pages[0] || null;
    }
    return pages.find((group) => group.page === activeMeta.page) || pages[0] || null;
  }, [activeMeta?.page, pages]);

  const modeGroups = useMemo(() => {
    if (contentMode === 'pages') {
      return pages;
    }

    if (contentMode === 'links') {
      return [
        {
          page: 'i18n',
          entries: normalizedFiles.filter((entry) => entry.section === 'i18n'),
        },
      ];
    }

    const homeGroup = pages.find((group) => group.page === 'home');
    return homeGroup ? [homeGroup] : (pages[0] ? [pages[0]] : []);
  }, [contentMode, normalizedFiles, pages]);

  const activeModeGroup = useMemo(() => {
    if (!activeMeta?.page) {
      return modeGroups[0] || null;
    }
    return modeGroups.find((group) => group.page === activeMeta.page) || modeGroups[0] || null;
  }, [activeMeta?.page, modeGroups]);

  const comparableContent = useMemo(() => {
    if (isI18nFile) {
      if (!i18nData || i18nError) {
        return rawMarkdown;
      }
      return injectI18nObject(rawMarkdown, i18nData);
    }
    return rawMarkdown;
  }, [isI18nFile, i18nData, i18nError, rawMarkdown]);

  const actualHasUnsavedChanges = useMemo(() => {
    if (!activePath) {
      return false;
    }
    if (isI18nFile && i18nData && !i18nError) {
      const saved = extractI18nObject(lastSavedMarkdown);
      if (!saved.error) {
        return !areJsonObjectsEqual(saved.data, i18nData);
      }
    }
    return normalizeComparableContent(comparableContent) !== normalizeComparableContent(lastSavedMarkdown);
  }, [activePath, comparableContent, i18nData, i18nError, isI18nFile, lastSavedMarkdown]);

  const isStatusSuccess = ['saved', 'created', 'deleted'].some((prefix) => status.toLowerCase().startsWith(prefix));

  const sectionRowsByBlock = useMemo(() => {
    if (!Array.isArray(blocksData)) {
      return [];
    }
    return blocksData.map((block) => {
      const typedBlock = block as BlockEntry;
      if (typedBlock?.type !== 'section') {
        return [] as SectionRow[];
      }
      return normalizeSectionRows(typedBlock.rows, typedBlock.items);
    });
  }, [blocksData]);

  const i18nObject = useMemo(() => {
    if (!i18nData || typeof i18nData !== 'object') {
      return null;
    }
    return i18nData as Record<string, unknown>;
  }, [i18nData]);

  const quickLinksItems = useMemo(() => {
    const footer = i18nObject?.footer as { quick_links_items?: unknown[] } | undefined;
    return Array.isArray(footer?.quick_links_items) ? footer.quick_links_items : [];
  }, [i18nObject]);

  const socialLinksItems = useMemo(() => {
    const social = i18nObject?.social as { links?: unknown[] } | undefined;
    return Array.isArray(social?.links) ? social.links : [];
  }, [i18nObject]);

  const socialPresetById = useMemo(() => {
    const map = new Map<string, { id: string; icon: string; className: string }>();
    socialLinkPresets.forEach((entry) => {
      map.set(String(entry.id), {
        id: String(entry.id),
        icon: String(entry.icon),
        className: String(entry.className),
      });
    });
    return map;
  }, []);

  const renderSocialIcon = useCallback((icon: string) => {
    if (icon === 'x-brand') {
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M18.9 2H22l-6.77 7.74L23.2 22h-6.26l-4.9-6.72L6.16 22H3.05l7.24-8.28L.8 2h6.42l4.43 6.08L18.9 2zm-1.1 18h1.73L6.28 3.9H4.42L17.8 20z"
          />
        </svg>
      );
    }

    return <i className={`${icon.startsWith('fa-vr') ? 'fas' : 'fab'} ${icon}`} aria-hidden="true" />;
  }, []);

  const navLinksItems = useMemo(() => {
    const nav = i18nObject?.nav as { links?: unknown[] } | undefined;
    if (Array.isArray(nav?.links) && nav.links.length > 0) {
      return nav.links;
    }
    return [
      { label: String(t('nav.home')), href: '/' },
      { label: String(t('nav.events')), href: '#events' },
      { label: String(t('nav.faq')), href: '#faq' },
    ];
  }, [i18nObject, t]);

  const eventsBlockIndex = useMemo(() => {
    if (!Array.isArray(blocksData)) {
      return -1;
    }
    return blocksData.findIndex((block) => (block as BlockEntry)?.type === 'events');
  }, [blocksData]);

  const eventsBlock = useMemo(() => {
    if (!Array.isArray(blocksData) || eventsBlockIndex < 0) {
      return null;
    }
    return blocksData[eventsBlockIndex] as BlockEntry;
  }, [blocksData, eventsBlockIndex]);

  const collaboratorsRows = useMemo(() => {
    if (!eventsBlock) {
      return [] as EventsRow[];
    }
    return Array.isArray(eventsBlock.rows) && eventsBlock.rows.length > 0
      ? eventsBlock.rows as EventsRow[]
      : buildDefaultEventsRows() as unknown as EventsRow[];
  }, [eventsBlock]);

  const collaboratorsCatalog = useMemo(() => {
    if (!eventsBlock) {
      return [] as Array<{ id?: string; name?: string; src?: string; href?: string }>;
    }

    if (Array.isArray(eventsBlock.collaboratorsCatalog) && eventsBlock.collaboratorsCatalog.length > 0) {
      return eventsBlock.collaboratorsCatalog as Array<{ id?: string; name?: string; src?: string; href?: string }>;
    }

    const seen = new Set<string>();
    const fallback: Array<{ id?: string; name?: string; src?: string; href?: string }> = [];
    collaboratorsRows.forEach((row) => {
      const rowCollaborators = Array.isArray(row.collaborators) ? row.collaborators : [];
      rowCollaborators.forEach((entry) => {
        const collab = entry as { alt?: string; src?: string; href?: string };
        const name = String(collab.alt || '').trim();
        const src = String(collab.src || '').trim();
        const href = String(collab.href || '').trim();
        const key = `${name}::${src}`;
        if (!name || seen.has(key)) {
          return;
        }
        seen.add(key);
        fallback.push({
          id: slugify(name) || `collab-${fallback.length + 1}`,
          name,
          src,
          href,
        });
      });
    });
    return fallback;
  }, [eventsBlock, collaboratorsRows]);

  const updateBlocksAndMarkdown = useCallback((nextBlocks: unknown[] | null) => {
    if (!Array.isArray(nextBlocks)) {
      return;
    }

    mutateBlocks(() => nextBlocks);
    const nextMarkdown = injectBlocks(rawMarkdown, stripClientIds(nextBlocks));
    setRawMarkdown(nextMarkdown);
  }, [mutateBlocks, rawMarkdown, setRawMarkdown]);

  const updateBlockField = useCallback((blockCid: string, field: string, value: unknown) => {
    if (!Array.isArray(blocksData)) {
      return;
    }

    const nextBlocks = blocksData.map((block) => {
      const typedBlock = block as BlockEntry;
      if (typedBlock?._cid !== blockCid) {
        return block;
      }
      return {
        ...typedBlock,
        [field]: value,
      };
    });

    updateBlocksAndMarkdown(nextBlocks);
  }, [blocksData, updateBlocksAndMarkdown]);

  const updateBlockItems = useCallback((blockCid: string, updater: (items: unknown[]) => unknown[]) => {
    if (!Array.isArray(blocksData)) {
      return;
    }

    const nextBlocks = blocksData.map((block) => {
      const typedBlock = block as BlockEntry;
      if (typedBlock?._cid !== blockCid) {
        return block;
      }

      const currentItems = Array.isArray(typedBlock.items) ? typedBlock.items : [];
      return {
        ...typedBlock,
        items: updater(currentItems),
      };
    });

    updateBlocksAndMarkdown(nextBlocks);
  }, [blocksData, updateBlocksAndMarkdown]);

  const updateFaqColumns = useCallback((blockCid: string, leftItems: unknown[], rightItems: unknown[]) => {
    if (!Array.isArray(blocksData)) {
      return;
    }

    const nextBlocks = blocksData.map((block) => {
      const typedBlock = block as BlockEntry;
      if (typedBlock?._cid !== blockCid) {
        return block;
      }
      return {
        ...typedBlock,
        leftItems,
        rightItems,
      };
    });

    updateBlocksAndMarkdown(nextBlocks);
  }, [blocksData, updateBlocksAndMarkdown]);

  const updateI18nObject = useCallback((nextI18n: Record<string, unknown>) => {
    setI18nData(nextI18n);
    setI18nError('');
    const nextMarkdown = injectI18nObject(rawMarkdown, nextI18n);
    setRawMarkdown(nextMarkdown);
  }, [rawMarkdown, setI18nData, setI18nError, setRawMarkdown]);

  const updateQuickLinksItem = useCallback((index: number, patch: Record<string, unknown>) => {
    if (!i18nObject) {
      return;
    }
    const footer = { ...(i18nObject.footer as Record<string, unknown> || {}) };
    const nextItems = [...quickLinksItems];
    nextItems[index] = {
      ...(nextItems[index] as Record<string, unknown> || {}),
      ...patch,
    };
    footer.quick_links_items = nextItems;
    updateI18nObject({ ...i18nObject, footer });
  }, [i18nObject, quickLinksItems, updateI18nObject]);

  const removeQuickLinksItem = useCallback((index: number) => {
    if (!i18nObject) {
      return;
    }
    const footer = { ...(i18nObject.footer as Record<string, unknown> || {}) };
    footer.quick_links_items = quickLinksItems.filter((_, idx) => idx !== index);
    updateI18nObject({ ...i18nObject, footer });
  }, [i18nObject, quickLinksItems, updateI18nObject]);

  const addQuickLinksItem = useCallback(() => {
    if (!i18nObject) {
      return;
    }
    const footer = { ...(i18nObject.footer as Record<string, unknown> || {}) };
    footer.quick_links_items = [...quickLinksItems, { label: 'New link', href: '/' }];
    updateI18nObject({ ...i18nObject, footer });
  }, [i18nObject, quickLinksItems, updateI18nObject]);

  const updateSocialLinksItem = useCallback((index: number, patch: Record<string, unknown>) => {
    if (!i18nObject) {
      return;
    }
    const social = { ...(i18nObject.social as Record<string, unknown> || {}) };
    const nextItems = [...socialLinksItems];
    nextItems[index] = {
      ...(nextItems[index] as Record<string, unknown> || {}),
      ...patch,
    };
    social.links = nextItems;
    updateI18nObject({ ...i18nObject, social });
  }, [i18nObject, socialLinksItems, updateI18nObject]);

  const removeSocialLinksItem = useCallback((index: number) => {
    if (!i18nObject) {
      return;
    }
    const social = { ...(i18nObject.social as Record<string, unknown> || {}) };
    social.links = socialLinksItems.filter((_, idx) => idx !== index);
    updateI18nObject({ ...i18nObject, social });
  }, [i18nObject, socialLinksItems, updateI18nObject]);

  const addSocialLinksItem = useCallback(() => {
    if (!i18nObject) {
      return;
    }
    const social = { ...(i18nObject.social as Record<string, unknown> || {}) };
    social.links = [...socialLinksItems, { id: 'custom', name: 'New social', href: '/' }];
    updateI18nObject({ ...i18nObject, social });
  }, [i18nObject, socialLinksItems, updateI18nObject]);

  const updateNavLinksItem = useCallback((index: number, patch: Record<string, unknown>) => {
    if (!i18nObject) {
      return;
    }
    const nav = { ...(i18nObject.nav as Record<string, unknown> || {}) };
    const nextItems = [...navLinksItems];
    nextItems[index] = {
      ...(nextItems[index] as Record<string, unknown> || {}),
      ...patch,
    };
    nav.links = nextItems;
    updateI18nObject({ ...i18nObject, nav });
  }, [i18nObject, navLinksItems, updateI18nObject]);

  const removeNavLinksItem = useCallback((index: number) => {
    if (!i18nObject) {
      return;
    }
    const nav = { ...(i18nObject.nav as Record<string, unknown> || {}) };
    nav.links = navLinksItems.filter((_, idx) => idx !== index);
    updateI18nObject({ ...i18nObject, nav });
  }, [i18nObject, navLinksItems, updateI18nObject]);

  const addNavLinksItem = useCallback(() => {
    if (!i18nObject) {
      return;
    }
    const nav = { ...(i18nObject.nav as Record<string, unknown> || {}) };
    nav.links = [...navLinksItems, { label: 'New nav item', href: '#section' }];
    updateI18nObject({ ...i18nObject, nav });
  }, [i18nObject, navLinksItems, updateI18nObject]);

  const addBlockItem = useCallback((blockCid: string, factory: () => unknown) => {
    updateBlockItems(blockCid, (items) => [...items, factory()]);
  }, [updateBlockItems]);

  const removeBlockItem = useCallback((blockCid: string, itemIndex: number) => {
    updateBlockItems(blockCid, (items) => items.filter((_, idx) => idx !== itemIndex));
  }, [updateBlockItems]);

  const updateCollaboratorCatalogItem = useCallback((index: number, patch: Record<string, unknown>) => {
    if (!eventsBlock || !Array.isArray(blocksData)) {
      return;
    }
    const nextCatalog = collaboratorsCatalog.map((entry, idx) => {
      if (idx !== index) {
        return entry;
      }
      return {
        ...entry,
        ...patch,
      };
    });
    updateBlockField(String(eventsBlock._cid || ''), 'collaboratorsCatalog', nextCatalog);
  }, [blocksData, collaboratorsCatalog, eventsBlock, updateBlockField]);

  const addCollaboratorCatalogItem = useCallback(() => {
    if (!eventsBlock || !Array.isArray(blocksData)) {
      return;
    }
    const nextCatalog = [
      ...collaboratorsCatalog,
      {
        id: `collab-${Date.now()}`,
        name: 'New collaborator',
        src: '',
        href: '',
      },
    ];
    updateBlockField(String(eventsBlock._cid || ''), 'collaboratorsCatalog', nextCatalog);
  }, [blocksData, collaboratorsCatalog, eventsBlock, updateBlockField]);

  const removeCollaboratorCatalogItem = useCallback((index: number) => {
    if (!eventsBlock || !Array.isArray(blocksData)) {
      return;
    }
    const removed = collaboratorsCatalog[index];
    const removedId = String(removed?.id || '').trim();
    const nextCatalog = collaboratorsCatalog.filter((_, idx) => idx !== index);
    const cleanedRows = removedId
      ? collaboratorsRows.map((row) => ({
        ...row,
        collaboratorIds: (Array.isArray(row.collaboratorIds) ? row.collaboratorIds : []).filter((id) => id !== removedId),
      }))
      : collaboratorsRows;

    const nextBlocks = blocksData.map((block) => {
      const typed = block as BlockEntry;
      if (typed?._cid !== eventsBlock._cid) {
        return block;
      }
      return {
        ...typed,
        collaboratorsCatalog: nextCatalog,
        rows: cleanedRows,
      };
    });
    updateBlocksAndMarkdown(nextBlocks);
  }, [blocksData, collaboratorsCatalog, collaboratorsRows, eventsBlock, updateBlocksAndMarkdown]);

  const toggleCollaboratorIdForEventRow = useCallback((blockCid: string, rowIndex: number, collaboratorId: string) => {
    if (!Array.isArray(blocksData)) {
      return;
    }

    const targetBlock = blocksData.find((block) => (block as BlockEntry)?._cid === blockCid) as BlockEntry | undefined;
    if (!targetBlock) {
      return;
    }

    const sourceRows = Array.isArray(targetBlock.rows) && targetBlock.rows.length > 0
      ? targetBlock.rows as EventsRow[]
      : buildDefaultEventsRows() as unknown as EventsRow[];
    const localCatalog = Array.isArray(targetBlock.collaboratorsCatalog) && targetBlock.collaboratorsCatalog.length > 0
      ? targetBlock.collaboratorsCatalog as CollaboratorCatalogEntry[]
      : collaboratorsCatalog;

    const nextRows = sourceRows.map((row, idx) => {
      if (idx !== rowIndex) {
        return row;
      }
      const ids = [...getSelectedCollaboratorIds(row, localCatalog)];
      const exists = ids.includes(collaboratorId);
      return {
        ...row,
        collaboratorIds: exists ? ids.filter((id) => id !== collaboratorId) : [...ids, collaboratorId],
      };
    });

    updateBlockField(blockCid, 'rows', nextRows);
  }, [blocksData, collaboratorsCatalog, updateBlockField]);

  const uploadCatalogCollaboratorLogo = useCallback(async (index: number, file: File) => {
    const optimizedFile = await optimizeImageForUpload(file);
    const dataUrl = await fileToDataUrl(optimizedFile);
    const safeExt = getImageExtensionFromMime(optimizedFile);
    const fileName = `collab-catalog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
    const uploadPath = `uploads/images/collaborators/${fileName}`;

    const response = await fetch('/__admin/api/assets/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: uploadPath, dataUrl }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error || 'Upload failed');
    }

    updateCollaboratorCatalogItem(index, { src: payload.publicPath || `/${uploadPath}` });
  }, [updateCollaboratorCatalogItem]);

  const activeCollaboratorsPicker = useMemo(() => {
    if (!collaboratorsPicker || !Array.isArray(blocksData)) {
      return null;
    }

    const targetBlock = blocksData.find((block) => (block as BlockEntry)?._cid === collaboratorsPicker.blockCid) as BlockEntry | undefined;
    if (!targetBlock || targetBlock.type !== 'events') {
      return null;
    }

    const sourceRows = Array.isArray(targetBlock.rows) && targetBlock.rows.length > 0
      ? targetBlock.rows as EventsRow[]
      : buildDefaultEventsRows() as unknown as EventsRow[];

    const targetRow = sourceRows[collaboratorsPicker.rowIndex];
    if (!targetRow) {
      return null;
    }

    const localCatalog = Array.isArray(targetBlock.collaboratorsCatalog) && targetBlock.collaboratorsCatalog.length > 0
      ? targetBlock.collaboratorsCatalog as CollaboratorCatalogEntry[]
      : collaboratorsCatalog;

    return {
      blockCid: String(targetBlock._cid || ''),
      rowIndex: collaboratorsPicker.rowIndex,
      rowYear: String(targetRow.year || ''),
      selectedIds: getSelectedCollaboratorIds(targetRow, localCatalog),
      catalog: localCatalog,
    };
  }, [blocksData, collaboratorsCatalog, collaboratorsPicker]);

  const moveBlock = useCallback((blockCid: string, direction: -1 | 1) => {
    if (!Array.isArray(blocksData)) {
      return;
    }

    const currentIndex = blocksData.findIndex((block) => (block as BlockEntry)._cid === blockCid);
    if (currentIndex < 0) {
      return;
    }

    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= blocksData.length) {
      return;
    }

    const nextBlocks = [...blocksData];
    const [moved] = nextBlocks.splice(currentIndex, 1);
    nextBlocks.splice(targetIndex, 0, moved);
    updateBlocksAndMarkdown(nextBlocks);
  }, [blocksData, updateBlocksAndMarkdown]);

  const removeBlock = useCallback((blockCid: string) => {
    if (!Array.isArray(blocksData)) {
      return;
    }

    const nextBlocks = blocksData.filter((block) => (block as BlockEntry)._cid !== blockCid);
    updateBlocksAndMarkdown(nextBlocks);
    if (selectedBlockId === blockCid) {
      setSelectedBlockId('');
    }
  }, [blocksData, selectedBlockId, setSelectedBlockId, updateBlocksAndMarkdown]);

  const addBlockFromLibrary = useCallback((type: string) => {
    if (!Array.isArray(blocksData)) {
      return;
    }

    const nextBlock = createDefaultBlock(type) as BlockEntry;
    const nextBlocks = [...blocksData, nextBlock];
    updateBlocksAndMarkdown(nextBlocks);
    setSelectedBlockId(String(nextBlock._cid || ''));
  }, [blocksData, setSelectedBlockId, updateBlocksAndMarkdown]);

  const insertBlockFromLibraryAt = useCallback((type: string, insertIndex: number) => {
    if (!Array.isArray(blocksData)) {
      return;
    }

    const nextBlock = createDefaultBlock(type) as BlockEntry;
    const safeIndex = Math.max(0, Math.min(insertIndex, blocksData.length));
    const nextBlocks = [...blocksData];
    nextBlocks.splice(safeIndex, 0, nextBlock);
    updateBlocksAndMarkdown(nextBlocks);
    setSelectedBlockId(String(nextBlock._cid || ''));
  }, [blocksData, setSelectedBlockId, updateBlocksAndMarkdown]);

  const updateSectionItemField = useCallback((
    blockCid: string,
    rowIndex: number,
    columnIndex: number,
    itemIndex: number,
    field: string,
    value: unknown,
  ) => {
    if (!Array.isArray(blocksData)) {
      return;
    }

    const nextBlocks = blocksData.map((block) => {
      const typedBlock = block as BlockEntry;
      if (typedBlock?._cid !== blockCid || typedBlock.type !== 'section') {
        return block;
      }

      const rows = normalizeSectionRows(typedBlock.rows, typedBlock.items).map((row, rIdx) => {
        if (rIdx !== rowIndex) {
          return row;
        }

        const columns = (row.columns || []).map((column, cIdx) => {
          if (cIdx !== columnIndex) {
            return column;
          }

          const items = (column.items || []).map((item, iIdx) => {
            if (iIdx !== itemIndex) {
              return item;
            }

            return {
              ...item,
              [field]: value,
            };
          });

          return {
            ...column,
            items,
          };
        });

        return {
          ...row,
          columns,
        };
      });

      return {
        ...typedBlock,
        rows,
      };
    });

    updateBlocksAndMarkdown(nextBlocks);
  }, [blocksData, updateBlocksAndMarkdown]);

  const addSectionRow = useCallback((blockCid: string) => {
    if (!Array.isArray(blocksData)) {
      return;
    }

    const nextBlocks = blocksData.map((block) => {
      const typedBlock = block as BlockEntry;
      if (typedBlock?._cid !== blockCid || typedBlock.type !== 'section') {
        return block;
      }

      const rows = normalizeSectionRows(typedBlock.rows, typedBlock.items);
      return {
        ...typedBlock,
        rows: [...rows, createDefaultSectionRow()],
      };
    });

    updateBlocksAndMarkdown(nextBlocks);
  }, [blocksData, updateBlocksAndMarkdown]);

  const removeSectionRow = useCallback((blockCid: string, rowIndex: number) => {
    if (!Array.isArray(blocksData)) {
      return;
    }

    const nextBlocks = blocksData.map((block) => {
      const typedBlock = block as BlockEntry;
      if (typedBlock?._cid !== blockCid || typedBlock.type !== 'section') {
        return block;
      }

      const rows = normalizeSectionRows(typedBlock.rows, typedBlock.items);
      const nextRows = rows.filter((_, idx) => idx !== rowIndex);
      return {
        ...typedBlock,
        rows: nextRows.length > 0 ? nextRows : [createDefaultSectionRow()],
      };
    });

    updateBlocksAndMarkdown(nextBlocks);
  }, [blocksData, updateBlocksAndMarkdown]);

  const moveSectionRow = useCallback((blockCid: string, rowIndex: number, direction: -1 | 1) => {
    if (!Array.isArray(blocksData)) {
      return;
    }

    const nextBlocks = blocksData.map((block) => {
      const typedBlock = block as BlockEntry;
      if (typedBlock?._cid !== blockCid || typedBlock.type !== 'section') {
        return block;
      }

      const rows = [...normalizeSectionRows(typedBlock.rows, typedBlock.items)];
      const targetIndex = rowIndex + direction;
      if (targetIndex < 0 || targetIndex >= rows.length) {
        return block;
      }

      const [moved] = rows.splice(rowIndex, 1);
      rows.splice(targetIndex, 0, moved);

      return {
        ...typedBlock,
        rows,
      };
    });

    updateBlocksAndMarkdown(nextBlocks);
  }, [blocksData, updateBlocksAndMarkdown]);

  const moveSectionRowToIndex = useCallback((blockCid: string, fromIndex: number, toIndex: number) => {
    if (!Array.isArray(blocksData) || fromIndex === toIndex) {
      return;
    }

    const nextBlocks = blocksData.map((block) => {
      const typedBlock = block as BlockEntry;
      if (typedBlock?._cid !== blockCid || typedBlock.type !== 'section') {
        return block;
      }

      const rows = [...normalizeSectionRows(typedBlock.rows, typedBlock.items)];
      if (fromIndex < 0 || fromIndex >= rows.length || toIndex < 0 || toIndex >= rows.length) {
        return block;
      }

      const [moved] = rows.splice(fromIndex, 1);
      rows.splice(toIndex, 0, moved);
      return { ...typedBlock, rows };
    });

    updateBlocksAndMarkdown(nextBlocks);
  }, [blocksData, updateBlocksAndMarkdown]);

  const addSectionColumn = useCallback((blockCid: string, rowIndex: number) => {
    if (!Array.isArray(blocksData)) {
      return;
    }

    const nextBlocks = blocksData.map((block) => {
      const typedBlock = block as BlockEntry;
      if (typedBlock?._cid !== blockCid || typedBlock.type !== 'section') {
        return block;
      }

      const rows = normalizeSectionRows(typedBlock.rows, typedBlock.items).map((row, idx) => {
        if (idx !== rowIndex) {
          return row;
        }
        const columns = row.columns || [];
        return {
          ...row,
          columns: [...columns, createDefaultSectionColumn()],
        };
      });

      return {
        ...typedBlock,
        rows,
      };
    });

    updateBlocksAndMarkdown(nextBlocks);
  }, [blocksData, updateBlocksAndMarkdown]);

  const removeSectionColumn = useCallback((blockCid: string, rowIndex: number, columnIndex: number) => {
    if (!Array.isArray(blocksData)) {
      return;
    }

    const nextBlocks = blocksData.map((block) => {
      const typedBlock = block as BlockEntry;
      if (typedBlock?._cid !== blockCid || typedBlock.type !== 'section') {
        return block;
      }

      const rows = normalizeSectionRows(typedBlock.rows, typedBlock.items).map((row, idx) => {
        if (idx !== rowIndex) {
          return row;
        }
        const columns = (row.columns || []).filter((_, cIdx) => cIdx !== columnIndex);
        return {
          ...row,
          columns: columns.length > 0 ? columns : [createDefaultSectionColumn()],
        };
      });

      return {
        ...typedBlock,
        rows,
      };
    });

    updateBlocksAndMarkdown(nextBlocks);
  }, [blocksData, updateBlocksAndMarkdown]);

  const moveSectionColumn = useCallback((blockCid: string, rowIndex: number, columnIndex: number, direction: -1 | 1) => {
    if (!Array.isArray(blocksData)) {
      return;
    }

    const nextBlocks = blocksData.map((block) => {
      const typedBlock = block as BlockEntry;
      if (typedBlock?._cid !== blockCid || typedBlock.type !== 'section') {
        return block;
      }

      const rows = normalizeSectionRows(typedBlock.rows, typedBlock.items).map((row, idx) => {
        if (idx !== rowIndex) {
          return row;
        }

        const columns = [...(row.columns || [])];
        const targetIndex = columnIndex + direction;
        if (targetIndex < 0 || targetIndex >= columns.length) {
          return row;
        }

        const [moved] = columns.splice(columnIndex, 1);
        columns.splice(targetIndex, 0, moved);

        return {
          ...row,
          columns,
        };
      });

      return {
        ...typedBlock,
        rows,
      };
    });

    updateBlocksAndMarkdown(nextBlocks);
  }, [blocksData, updateBlocksAndMarkdown]);

  const moveSectionColumnToIndex = useCallback((blockCid: string, rowIndex: number, fromIndex: number, toIndex: number) => {
    if (!Array.isArray(blocksData) || fromIndex === toIndex) {
      return;
    }

    const nextBlocks = blocksData.map((block) => {
      const typedBlock = block as BlockEntry;
      if (typedBlock?._cid !== blockCid || typedBlock.type !== 'section') {
        return block;
      }

      const rows = normalizeSectionRows(typedBlock.rows, typedBlock.items).map((row, idx) => {
        if (idx !== rowIndex) {
          return row;
        }

        const columns = [...(row.columns || [])];
        if (fromIndex < 0 || fromIndex >= columns.length || toIndex < 0 || toIndex >= columns.length) {
          return row;
        }

        const [moved] = columns.splice(fromIndex, 1);
        columns.splice(toIndex, 0, moved);
        return { ...row, columns };
      });

      return { ...typedBlock, rows };
    });

    updateBlocksAndMarkdown(nextBlocks);
  }, [blocksData, updateBlocksAndMarkdown]);

  const setSectionColumnWidth = useCallback((blockCid: string, rowIndex: number, columnIndex: number, width: number) => {
    if (!Array.isArray(blocksData)) {
      return;
    }

    const safeWidth = Math.min(12, Math.max(1, Number(width) || 12));

    const nextBlocks = blocksData.map((block) => {
      const typedBlock = block as BlockEntry;
      if (typedBlock?._cid !== blockCid || typedBlock.type !== 'section') {
        return block;
      }

      const rows = normalizeSectionRows(typedBlock.rows, typedBlock.items).map((row, rIdx) => {
        if (rIdx !== rowIndex) {
          return row;
        }

        const columns = (row.columns || []).map((column, cIdx) => {
          if (cIdx !== columnIndex) {
            return column;
          }

          return {
            ...column,
            width: safeWidth,
          };
        });

        return {
          ...row,
          columns,
        };
      });

      return {
        ...typedBlock,
        rows,
      };
    });

    updateBlocksAndMarkdown(nextBlocks);
  }, [blocksData, updateBlocksAndMarkdown]);

  const addSectionItem = useCallback((blockCid: string, rowIndex: number, columnIndex: number, type: string) => {
    if (!Array.isArray(blocksData)) {
      return;
    }

    const nextBlocks = blocksData.map((block) => {
      const typedBlock = block as BlockEntry;
      if (typedBlock?._cid !== blockCid || typedBlock.type !== 'section') {
        return block;
      }

      const rows = normalizeSectionRows(typedBlock.rows, typedBlock.items).map((row, rIdx) => {
        if (rIdx !== rowIndex) {
          return row;
        }

        const columns = (row.columns || []).map((column, cIdx) => {
          if (cIdx !== columnIndex) {
            return column;
          }

          return {
            ...column,
            items: [...(column.items || []), createSectionItem(type) as SectionItem],
          };
        });

        return {
          ...row,
          columns,
        };
      });

      return {
        ...typedBlock,
        rows,
      };
    });

    updateBlocksAndMarkdown(nextBlocks);
  }, [blocksData, updateBlocksAndMarkdown]);

  const removeSectionItem = useCallback((blockCid: string, rowIndex: number, columnIndex: number, itemIndex: number) => {
    if (!Array.isArray(blocksData)) {
      return;
    }

    const nextBlocks = blocksData.map((block) => {
      const typedBlock = block as BlockEntry;
      if (typedBlock?._cid !== blockCid || typedBlock.type !== 'section') {
        return block;
      }

      const rows = normalizeSectionRows(typedBlock.rows, typedBlock.items).map((row, rIdx) => {
        if (rIdx !== rowIndex) {
          return row;
        }

        const columns = (row.columns || []).map((column, cIdx) => {
          if (cIdx !== columnIndex) {
            return column;
          }

          return {
            ...column,
            items: (column.items || []).filter((_, iIdx) => iIdx !== itemIndex),
          };
        });

        return {
          ...row,
          columns,
        };
      });

      return {
        ...typedBlock,
        rows,
      };
    });

    updateBlocksAndMarkdown(nextBlocks);
  }, [blocksData, updateBlocksAndMarkdown]);

  const moveSectionItemById = useCallback((itemId: string, targetBlockCid: string, targetRowIndex: number, targetColumnIndex: number) => {
    if (!Array.isArray(blocksData) || !itemId) {
      return;
    }

    let movingItem: SectionItem | null = null;

    const withoutSource = blocksData.map((block) => {
      const typedBlock = block as BlockEntry;
      if (typedBlock.type !== 'section') {
        return block;
      }

      const rows = normalizeSectionRows(typedBlock.rows, typedBlock.items).map((row) => {
        const columns = (row.columns || []).map((column) => {
          const items = (column.items || []).filter((item) => {
            if ((item as SectionItem)?._iid === itemId) {
              movingItem = item as SectionItem;
              return false;
            }
            return true;
          });
          return { ...column, items };
        });
        return { ...row, columns };
      });

      return {
        ...typedBlock,
        rows,
      };
    });

    if (!movingItem) {
      return;
    }

    const nextBlocks = withoutSource.map((block) => {
      const typedBlock = block as BlockEntry;
      if (typedBlock._cid !== targetBlockCid || typedBlock.type !== 'section') {
        return block;
      }

      const rows = normalizeSectionRows(typedBlock.rows, typedBlock.items).map((row, rIdx) => {
        if (rIdx !== targetRowIndex) {
          return row;
        }
        const columns = (row.columns || []).map((column, cIdx) => {
          if (cIdx !== targetColumnIndex) {
            return column;
          }
          return {
            ...column,
            items: [...(column.items || []), movingItem as SectionItem],
          };
        });
        return { ...row, columns };
      });

      return {
        ...typedBlock,
        rows,
      };
    });

    updateBlocksAndMarkdown(nextBlocks);
  }, [blocksData, updateBlocksAndMarkdown]);

  const reorderSectionItemByTarget = useCallback((itemId: string, targetItemId: string) => {
    if (!Array.isArray(blocksData) || !itemId || !targetItemId || itemId === targetItemId) {
      return;
    }

    let movingItem: SectionItem | null = null;
    let targetMeta: { blockCid: string; rowIndex: number; columnIndex: number; itemIndex: number } | null = null;

    blocksData.forEach((block) => {
      const typedBlock = block as BlockEntry;
      if (typedBlock.type !== 'section') {
        return;
      }

      const rows = normalizeSectionRows(typedBlock.rows, typedBlock.items);
      rows.forEach((row, rowIndex) => {
        (row.columns || []).forEach((column, columnIndex) => {
          (column.items || []).forEach((item, itemIndex) => {
            const iid = String((item as SectionItem)._iid || '');
            if (iid === itemId) {
              movingItem = item as SectionItem;
            }
            if (iid === targetItemId) {
              targetMeta = {
                blockCid: String(typedBlock._cid || ''),
                rowIndex,
                columnIndex,
                itemIndex,
              };
            }
          });
        });
      });
    });

    if (!movingItem || !targetMeta) {
      return;
    }

    const stripped = blocksData.map((block) => {
      const typedBlock = block as BlockEntry;
      if (typedBlock.type !== 'section') {
        return block;
      }

      const rows = normalizeSectionRows(typedBlock.rows, typedBlock.items).map((row) => {
        const columns = (row.columns || []).map((column) => ({
          ...column,
          items: (column.items || []).filter((item) => String((item as SectionItem)._iid || '') !== itemId),
        }));
        return { ...row, columns };
      });

      return { ...typedBlock, rows };
    });

    const nextBlocks = stripped.map((block) => {
      const typedBlock = block as BlockEntry;
      if (String(typedBlock._cid || '') !== targetMeta?.blockCid || typedBlock.type !== 'section') {
        return block;
      }

      const rows = normalizeSectionRows(typedBlock.rows, typedBlock.items).map((row, rowIndex) => {
        if (rowIndex !== targetMeta?.rowIndex) {
          return row;
        }

        const columns = (row.columns || []).map((column, columnIndex) => {
          if (columnIndex !== targetMeta?.columnIndex) {
            return column;
          }

          const items = [...(column.items || [])];
          items.splice(targetMeta.itemIndex, 0, movingItem as SectionItem);
          return { ...column, items };
        });

        return { ...row, columns };
      });

      return { ...typedBlock, rows };
    });

    updateBlocksAndMarkdown(nextBlocks);
  }, [blocksData, updateBlocksAndMarkdown]);

  const insertSectionItemBeforeTarget = useCallback((type: string, targetItemId: string) => {
    if (!Array.isArray(blocksData) || !type || !targetItemId) {
      return;
    }

    let targetMeta: { blockCid: string; rowIndex: number; columnIndex: number; itemIndex: number } | null = null;

    blocksData.forEach((block) => {
      const typedBlock = block as BlockEntry;
      if (typedBlock.type !== 'section') {
        return;
      }

      const rows = normalizeSectionRows(typedBlock.rows, typedBlock.items);
      rows.forEach((row, rowIndex) => {
        (row.columns || []).forEach((column, columnIndex) => {
          (column.items || []).forEach((item, itemIndex) => {
            if (String((item as SectionItem)._iid || '') === targetItemId) {
              targetMeta = {
                blockCid: String(typedBlock._cid || ''),
                rowIndex,
                columnIndex,
                itemIndex,
              };
            }
          });
        });
      });
    });

    if (!targetMeta) {
      return;
    }

    const nextBlocks = blocksData.map((block) => {
      const typedBlock = block as BlockEntry;
      if (String(typedBlock._cid || '') !== targetMeta?.blockCid || typedBlock.type !== 'section') {
        return block;
      }

      const rows = normalizeSectionRows(typedBlock.rows, typedBlock.items).map((row, rowIndex) => {
        if (rowIndex !== targetMeta?.rowIndex) {
          return row;
        }

        const columns = (row.columns || []).map((column, columnIndex) => {
          if (columnIndex !== targetMeta?.columnIndex) {
            return column;
          }

          const items = [...(column.items || [])];
          items.splice(targetMeta.itemIndex, 0, createSectionItem(type) as SectionItem);
          return { ...column, items };
        });

        return { ...row, columns };
      });

      return { ...typedBlock, rows };
    });

    updateBlocksAndMarkdown(nextBlocks);
  }, [blocksData, updateBlocksAndMarkdown]);

  const handleDragStart = useCallback((event: { active: { id: string; data?: { current?: { source?: string; type?: string; itemId?: string } } } }) => {
    const source = event.active.data?.current?.source;

    setIsRowDragging(source === 'row');
    setIsColumnDragging(source === 'column');

    if (source === 'library') {
      setActiveLibraryType(event.active.data?.current?.type || null);
      setActiveSubitemType(null);
      return;
    }

    if (source === 'subitem') {
      setActiveSubitemType(event.active.data?.current?.type || null);
      setActiveLibraryType(null);
      return;
    }

    setActiveLibraryType(null);
    setActiveSubitemType(null);
  }, []);

  const handleDragEnd = useCallback((event: { active: { data?: { current?: { source?: string; type?: string; itemId?: string } } }; over?: { id: string } | null }) => {
    const overId = String(event.over?.id || '');
    const source = event.active.data?.current?.source;
    const activeItemId = String(event.active.data?.current?.itemId || '');

    setActiveLibraryType(null);
    setActiveSubitemType(null);
    setIsRowDragging(false);
    setIsColumnDragging(false);

    if (source === 'subitem' && overId.startsWith('subitem:')) {
      const targetItemId = overId.replace('subitem:', '');
      reorderSectionItemByTarget(activeItemId, targetItemId);
      return;
    }

    if (source === 'row' && overId.startsWith('row-target:')) {
      const [, blockCid, toIndexRaw] = overId.split(':');
      const fromIndex = Number(event.active.data?.current?.rowIndex);
      const toIndex = Number(toIndexRaw);
      if (!blockCid || Number.isNaN(fromIndex) || Number.isNaN(toIndex)) {
        return;
      }
      moveSectionRowToIndex(blockCid, fromIndex, toIndex);
      return;
    }

    if (source === 'column' && overId.startsWith('column-target:')) {
      const [, blockCid, rowIndexRaw, toIndexRaw] = overId.split(':');
      const rowIndex = Number(rowIndexRaw);
      const fromIndex = Number(event.active.data?.current?.columnIndex);
      const toIndex = Number(toIndexRaw);
      if (!blockCid || Number.isNaN(rowIndex) || Number.isNaN(fromIndex) || Number.isNaN(toIndex)) {
        return;
      }
      moveSectionColumnToIndex(blockCid, rowIndex, fromIndex, toIndex);
      return;
    }

    if (source === 'library' && overId.startsWith('subitem:')) {
      const targetItemId = overId.replace('subitem:', '');
      const blockType = event.active.data?.current?.type;
      if (!blockType) {
        return;
      }
      insertSectionItemBeforeTarget(blockType, targetItemId);
      return;
    }

    if (source === 'library' && overId === 'canvas-dropzone') {
      const blockType = event.active.data?.current?.type;
      if (!blockType) {
        return;
      }
      addBlockFromLibrary(blockType);
      return;
    }

    if (source === 'library' && overId.startsWith('canvas-insert:')) {
      const blockType = event.active.data?.current?.type;
      const insertIndex = Number(overId.replace('canvas-insert:', ''));
      if (!blockType || Number.isNaN(insertIndex)) {
        return;
      }
      insertBlockFromLibraryAt(blockType, insertIndex);
      return;
    }

    if (!overId.startsWith('section-drop:')) {
      return;
    }

    const [, blockCid, rowIndexRaw, columnIndexRaw] = overId.split(':');
    const rowIndex = Number(rowIndexRaw);
    const columnIndex = Number(columnIndexRaw);
    if (!blockCid || Number.isNaN(rowIndex) || Number.isNaN(columnIndex)) {
      return;
    }

    if (source === 'library') {
      const blockType = event.active.data?.current?.type;
      if (!blockType) {
        return;
      }
      addSectionItem(blockCid, rowIndex, columnIndex, blockType);
      return;
    }

    if (source === 'subitem') {
      const itemId = event.active.data?.current?.itemId;
      if (!itemId) {
        return;
      }
      moveSectionItemById(itemId, blockCid, rowIndex, columnIndex);
    }
  }, [
    addSectionItem,
    addBlockFromLibrary,
    insertBlockFromLibraryAt,
    moveSectionItemById,
    reorderSectionItemByTarget,
    insertSectionItemBeforeTarget,
    moveSectionRowToIndex,
    moveSectionColumnToIndex,
  ]);

  const handleDragCancel = useCallback(() => {
    setActiveLibraryType(null);
    setActiveSubitemType(null);
    setIsRowDragging(false);
    setIsColumnDragging(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!activePath) {
      return;
    }
    setBusy(true);
    setStatus('Saving...');
    try {
      const contentToSave = comparableContent;
      await saveFile(activePath, contentToSave);
      const regenerateResponse = await fetch('/__admin/api/content/regenerate', { method: 'POST' });
      if (!regenerateResponse.ok) {
        let details = 'Failed to refresh public content';
        try {
          const payload = await regenerateResponse.json();
          if (payload?.error) {
            details = String(payload.error);
          }
        } catch {
          // ignore non-json errors
        }
        throw new Error(details);
      }

      await fetch('http://localhost:5173/__admin/api/hot-reload', {
        method: 'POST',
        mode: 'cors',
      });

      setLastSavedMarkdown(contentToSave);
      setStatus('Saved');
      setPreviewVersion((v) => v + 1);
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setBusy(false);
    }
  }, [activePath, comparableContent, saveFile, setBusy, setLastSavedMarkdown, setPreviewVersion, setStatus]);

  const handleDelete = useCallback(async () => {
    if (!activePath) {
      return;
    }
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }
    setBusy(true);
    setStatus('Deleting...');
    try {
      await deleteFile(activePath);
      await fetch('/__admin/api/content/regenerate', { method: 'POST' });
      await fetch('http://localhost:5173/__admin/api/hot-reload', {
        method: 'POST',
        mode: 'cors',
      });
      setStatus('Deleted');
      await loadFiles();
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setBusy(false);
    }
  }, [activePath, deleteFile, loadFiles, setBusy, setStatus]);

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div className="admin-header-left">
          <h1 className="admin-title">Content Admin</h1>
        </div>
        <div className="admin-header-center">
          {contentMode === 'pages' && (
            <select
              className="admin-select admin-page-selector"
              value={activeModeGroup?.page || ''}
              onChange={(e) => selectPageSlug(e.target.value)}
            >
              {modeGroups.map((group) => (
                <option key={group.page} value={group.page}>{group.page}</option>
              ))}
            </select>
          )}
        </div>
        <div id="admin-header-actions" className="admin-header-actions">
          <div className="admin-actions" style={{ marginRight: 8 }}>
            <button
              type="button"
              className={`admin-btn ${contentMode === 'pages' ? 'primary' : 'secondary'}`}
              onClick={() => setContentMode('pages')}
              title="Pages"
            >
              Pages
            </button>
            <button
              type="button"
              className={`admin-btn ${contentMode === 'links' ? 'primary' : 'secondary'}`}
              onClick={() => setContentMode('links')}
              title="Links"
            >
              Links
            </button>
            <button
              type="button"
              className={`admin-btn ${contentMode === 'collaborators' ? 'primary' : 'secondary'}`}
              onClick={() => setContentMode('collaborators')}
              title="Collaborators"
            >
              Collaborators
            </button>
          </div>
          {hasUnsavedChanges && (
            <span className="admin-unsaved-indicator">Unsaved changes</span>
          )}
          <button
            type="button"
            className="admin-btn"
            onClick={onUndo}
            disabled={!canUndo || busy}
            title="Undo"
          >
            <i className="fa-solid fa-rotate-left" />
          </button>
          <button
            type="button"
            className="admin-btn"
            onClick={onRedo}
            disabled={!canRedo || busy}
            title="Redo"
          >
            <i className="fa-solid fa-rotate-right" />
          </button>
          <button
            type="button"
            className="admin-btn primary"
            onClick={handleSave}
            disabled={busy}
          >
            {busy ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
      <main className="admin-main">
        <aside className="admin-sidebar">
          {contentMode === 'pages' && (
            <div className="admin-sidebar-section">
              <h3>Blocks</h3>
              <div className="admin-block-library">
                {BLOCK_LIBRARY.map((entry) => (
                  <DraggableLibraryItem
                    key={entry.type}
                    entry={entry}
                  />
                ))}
              </div>
            </div>
          )}
        </aside>

        <div className="admin-content">
          <div className="admin-editor-topbar">
            {contentMode === 'pages' && isPageFile && (
              <div className="admin-canvas-toolbar" style={{ marginRight: 'auto', borderBottom: 0, paddingBottom: 0 }}>
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => setIsCreateModalOpen(true)}
                  disabled={busy}
                >
                  New page
                </button>
                <button
                  type="button"
                  className="admin-btn danger"
                  onClick={handleDelete}
                  disabled={busy}
                >
                  Delete page
                </button>
              </div>
            )}
            <div className="admin-lang-switcher">
              {(activeModeGroup?.entries || []).map((entry) => (
                <button
                  key={entry.lang}
                  type="button"
                  className={`admin-lang-btn ${activePath === entry.path ? 'active' : ''}`}
                  onClick={() => onPathChange(entry.path)}
                >
                  {entry.lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {contentMode === 'links' && (
            <div className="admin-i18n-editor admin-links-manager">
              <div className="admin-i18n-header">
                <h3>Links Manager</h3>
              </div>

              <div className="admin-links-panels">
                <section className="admin-links-section">
                  <div className="admin-links-section-head">
                    <div>
                      <strong>Navbar links</strong>
                      <p className="admin-note">Links shown in the public site navbar.</p>
                    </div>
                    <button type="button" className="admin-icon-btn secondary" title="Add navbar link" onClick={addNavLinksItem}>
                      <i className="fa-solid fa-plus" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="admin-links-list">
                    {navLinksItems.map((entry, index) => {
                      const item = entry as { label?: string; href?: string };
                      return (
                        <article key={`nav-link-${index}`} className="admin-link-card">
                          <div className="admin-link-card-fields admin-link-card-fields-two">
                            <input
                              className="admin-input"
                              placeholder="Label"
                              value={String(item.label || '')}
                              onChange={(e) => updateNavLinksItem(index, { label: e.target.value })}
                            />
                            <input
                              className="admin-input"
                              placeholder="URL"
                              value={String(item.href || '')}
                              onChange={(e) => updateNavLinksItem(index, { href: e.target.value })}
                            />
                          </div>
                          <button
                            type="button"
                            className="admin-icon-btn danger"
                            title="Remove navbar link"
                            onClick={() => removeNavLinksItem(index)}
                          >
                            <i className="fa-solid fa-trash" aria-hidden="true" />
                          </button>
                        </article>
                      );
                    })}
                  </div>
                </section>

                <section className="admin-links-section">
                  <div className="admin-links-section-head">
                    <div>
                      <strong>Footer links</strong>
                      <p className="admin-note">Quick links shown in footer.</p>
                    </div>
                    <button type="button" className="admin-icon-btn secondary" title="Add quick link" onClick={addQuickLinksItem}>
                      <i className="fa-solid fa-plus" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="admin-links-list">
                    {quickLinksItems.map((entry, index) => {
                      const item = entry as { label?: string; href?: string };
                      return (
                        <article key={`quick-link-${index}`} className="admin-link-card">
                          <div className="admin-link-card-fields admin-link-card-fields-two">
                            <input
                              className="admin-input"
                              placeholder="Label"
                              value={String(item.label || '')}
                              onChange={(e) => updateQuickLinksItem(index, { label: e.target.value })}
                            />
                            <input
                              className="admin-input"
                              placeholder="URL"
                              value={String(item.href || '')}
                              onChange={(e) => updateQuickLinksItem(index, { href: e.target.value })}
                            />
                          </div>
                          <button
                            type="button"
                            className="admin-icon-btn danger"
                            title="Remove quick link"
                            onClick={() => removeQuickLinksItem(index)}
                          >
                            <i className="fa-solid fa-trash" aria-hidden="true" />
                          </button>
                        </article>
                      );
                    })}
                  </div>
                </section>

                <section className="admin-links-section">
                  <div className="admin-links-section-head">
                    <div>
                      <strong>Social links</strong>
                      <p className="admin-note">Used by the footer social icons.</p>
                    </div>
                    <button type="button" className="admin-icon-btn secondary" title="Add social link" onClick={addSocialLinksItem}>
                      <i className="fa-solid fa-plus" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="admin-links-list">
                    {socialLinksItems.map((entry, index) => {
                      const item = entry as { id?: string; name?: string; href?: string; icon?: string; className?: string };
                      const itemId = String(item.id || '').trim();
                      const preset = socialPresetById.get(itemId);
                      const resolvedClassName = String(item.className || '').trim() || preset?.className || 'custom';
                      const resolvedIcon = String(item.icon || '').trim() || preset?.icon || 'fa-link';
                      return (
                        <article key={`social-link-${index}`} className="admin-link-card admin-link-card-social">
                          <div className="admin-social-icon-preview" title={`.${resolvedClassName}`}>
                            {renderSocialIcon(resolvedIcon)}
                          </div>
                          <div className="admin-link-card-fields admin-link-card-fields-three">
                            <input
                              className="admin-input"
                              placeholder="ID"
                              value={String(item.id || '')}
                              onChange={(e) => updateSocialLinksItem(index, { id: e.target.value })}
                            />
                            <input
                              className="admin-input"
                              placeholder="Name"
                              value={String(item.name || '')}
                              onChange={(e) => updateSocialLinksItem(index, { name: e.target.value })}
                            />
                            <input
                              className="admin-input"
                              placeholder="URL"
                              value={String(item.href || '')}
                              onChange={(e) => updateSocialLinksItem(index, { href: e.target.value })}
                            />
                          </div>
                          <button
                            type="button"
                            className="admin-icon-btn danger"
                            title="Remove social link"
                            onClick={() => removeSocialLinksItem(index)}
                          >
                            <i className="fa-solid fa-trash" aria-hidden="true" />
                          </button>
                        </article>
                      );
                    })}
                  </div>
                </section>
              </div>
            </div>
          )}

          {contentMode === 'collaborators' && (
            <div className="admin-i18n-editor admin-collaborators-manager">
              <div className="admin-i18n-header">
                <h3>Collaborators Manager</h3>
              </div>

              <section className="admin-links-section">
                <div className="admin-links-section-head">
                  <div>
                    <strong>Available collaborators catalog</strong>
                    <p className="admin-note">Reusable logos shown in each year section.</p>
                  </div>
                  <button
                    type="button"
                    className="admin-icon-btn secondary"
                    title="Add collaborator to catalog"
                    onClick={addCollaboratorCatalogItem}
                  >
                    <i className="fa-solid fa-plus" aria-hidden="true" />
                  </button>
                </div>

                <div className="admin-collab-catalog-grid">
                  {collaboratorsCatalog.map((entry, index) => {
                  const collab = entry as { id?: string; name?: string; src?: string; href?: string };
                  const uploadInputId = `catalog-collab-upload-${index}`;
                  return (
                    <article key={`catalog-collab-${index}`} className="admin-collab-card">
                      <div className="admin-collab-logo-box">
                        {String(collab.src || '').trim()
                          ? (
                            <img
                              src={String(collab.src)}
                              alt={String(collab.name || collab.id || 'Collaborator logo')}
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                          )
                          : <span className="admin-note">No image</span>}
                      </div>
                      <div className="admin-collab-fields">
                        <input
                          className="admin-input"
                          placeholder="ID"
                          value={String(collab.id || '')}
                          onChange={(e) => updateCollaboratorCatalogItem(index, { id: e.target.value })}
                        />
                        <input
                          className="admin-input"
                          placeholder="Name"
                          value={String(collab.name || '')}
                          onChange={(e) => {
                            const nextName = e.target.value;
                            updateCollaboratorCatalogItem(index, {
                              name: nextName,
                              id: String(collab.id || '').trim() ? collab.id : (slugify(nextName) || `collab-${index + 1}`),
                            });
                          }}
                        />
                        <input
                          className="admin-input"
                          placeholder="URL (optional)"
                          value={String(collab.href || '')}
                          onChange={(e) => updateCollaboratorCatalogItem(index, { href: e.target.value })}
                        />
                      </div>

                      <div className="admin-actions">
                        <label htmlFor={uploadInputId} className="admin-icon-btn secondary" title="Upload logo" style={{ cursor: 'pointer' }}>
                          <i className="fa-solid fa-upload" aria-hidden="true" />
                        </label>
                        <input
                          id={uploadInputId}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) {
                              return;
                            }
                            try {
                              await uploadCatalogCollaboratorLogo(index, file);
                              setStatus('Logo uploaded');
                            } catch (error) {
                              setStatus(error instanceof Error ? error.message : 'Upload failed');
                            } finally {
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="admin-icon-btn danger"
                          title="Remove collaborator from catalog"
                          onClick={() => removeCollaboratorCatalogItem(index)}
                        >
                          <i className="fa-solid fa-trash" aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  );
                })}
                </div>
              </section>
            </div>
          )}

          {contentMode === 'pages' && isPageFile && blocksData && (
            <div className="admin-canvas">
              <SectionItemsDropZone
                dropId="canvas-dropzone"
                emptyMessage="Drag blocks here to append at the end"
                className="admin-canvas-dropzone"
              >
              <div className="admin-canvas-blocks">
                {Array.isArray(blocksData) && blocksData.map((block, index) => {
                  const typedBlock = block as BlockEntry;
                  const blockType = String(typedBlock?.type || 'Unknown');

                  const sectionRows = sectionRowsByBlock[index] || [];
                  const defaultFaq = buildDefaultFaqConfig(activeLang);
                  const effectiveHero = {
                    title: String(typedBlock.title || t('home.hero.title')),
                    subtitle: String(typedBlock.subtitle || t('home.hero.subtitle')),
                    attendText: String(typedBlock.attendText || t('home.hero.attend')),
                    volunteerText: String(typedBlock.volunteerText || t('home.hero.volunteer')),
                    sponsorText: String(typedBlock.sponsorText || t('home.hero.sponsor')),
                    volunteerUrl: String(typedBlock.volunteerUrl || 'https://docs.google.com/forms/d/e/1FAIpQLSd7f-826J4-Ca9-QZ9GRjV9-HMOqhsM8yF1M65bfwb5ZfliwA/viewform?usp=header'),
                    sponsorUrl: String(typedBlock.sponsorUrl || 'https://docs.google.com/forms/d/e/1FAIpQLSd7f-826J4-Ca9-QZ9GRjV9-HMOqhsM8yF1M65bfwb5ZfliwA/viewform?usp=header'),
                    buttons: Array.isArray(typedBlock.buttons) && typedBlock.buttons.length > 0
                      ? typedBlock.buttons
                      : [
                        { label: String(typedBlock.attendText || t('home.hero.attend')), href: '/discord/', variant: 'primary', external: false },
                        { label: String(typedBlock.volunteerText || t('home.hero.volunteer')), href: String(typedBlock.volunteerUrl || 'https://docs.google.com/forms/d/e/1FAIpQLSd7f-826J4-Ca9-QZ9GRjV9-HMOqhsM8yF1M65bfwb5ZfliwA/viewform?usp=header'), variant: 'accent', external: true },
                        { label: String(typedBlock.sponsorText || t('home.hero.sponsor')), href: String(typedBlock.sponsorUrl || 'https://docs.google.com/forms/d/e/1FAIpQLSd7f-826J4-Ca9-QZ9GRjV9-HMOqhsM8yF1M65bfwb5ZfliwA/viewform?usp=header'), variant: 'accent', external: true },
                      ],
                  };
                  const effectiveEventsRows = Array.isArray(typedBlock.rows) && typedBlock.rows.length > 0
                    ? typedBlock.rows
                    : buildDefaultEventsRows();
                  const effectiveFaqLeft = Array.isArray(typedBlock.leftItems) && typedBlock.leftItems.length > 0
                    ? typedBlock.leftItems
                    : defaultFaq.leftItems;
                  const effectiveFaqRight = Array.isArray(typedBlock.rightItems) && typedBlock.rightItems.length > 0
                    ? typedBlock.rightItems
                    : defaultFaq.rightItems;

                  return (
                    <div key={typedBlock?._cid || index}>
                      <SectionItemsDropZone
                        dropId={`canvas-insert:${index}`}
                        className="admin-canvas-insert-drop"
                      />
                    <div
                      className={`admin-canvas-section ${selectedBlockId === typedBlock?._cid ? 'active' : ''}`}
                    >
                      <div className="admin-canvas-section-head">
                        <button
                          type="button"
                          className="admin-canvas-section-title"
                          onClick={() => setSelectedBlockId(typedBlock?._cid || '')}
                        >
                          <span className="admin-canvas-section-main">
                            <i className={`fa-solid ${getBlockIcon(blockType)}`} aria-hidden="true" />
                            <strong>{getBlockLabel(blockType)}</strong>
                          </span>
                          <span>Block #{index + 1}</span>
                        </button>
                        <div className="admin-canvas-section-actions">
                          <button
                            type="button"
                            className="admin-icon-btn secondary"
                            title="Move up"
                            onClick={() => moveBlock(String(typedBlock._cid || ''), -1)}
                          >
                            <i className="fa-solid fa-arrow-up" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="admin-icon-btn secondary"
                            title="Move down"
                            onClick={() => moveBlock(String(typedBlock._cid || ''), 1)}
                          >
                            <i className="fa-solid fa-arrow-down" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="admin-icon-btn danger"
                            title="Delete block"
                            onClick={() => removeBlock(String(typedBlock._cid || ''))}
                          >
                            <i className="fa-solid fa-trash" aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      {typedBlock?.type === 'section' && (
                        <div className="admin-section-rows">
                          {sectionRows.map((row, rowIndex) => (
                            <SortDropTarget
                              key={row._rid || rowIndex}
                              id={`row-target:${String(typedBlock._cid || '')}:${rowIndex}`}
                              className="admin-subsection-row"
                            >
                              <div className="admin-subsection-row-head">
                                <div className="admin-subsection-row-main">
                                  <DragHandleButton
                                    id={`row:${String(typedBlock._cid || '')}:${rowIndex}`}
                                    data={{ source: 'row', blockCid: String(typedBlock._cid || ''), rowIndex }}
                                    icon="fa-grip-lines"
                                    title="Drag row"
                                  />
                                  <span className="admin-subsection-row-title">Row {rowIndex + 1}</span>
                                </div>
                                <div className="admin-subsection-item-actions">
                                  <button
                                    type="button"
                                    className="admin-icon-btn secondary"
                                    title="Move row up"
                                    onClick={() => moveSectionRow(String(typedBlock._cid || ''), rowIndex, -1)}
                                  >
                                    <i className="fa-solid fa-arrow-up" aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    className="admin-icon-btn secondary"
                                    title="Move row down"
                                    onClick={() => moveSectionRow(String(typedBlock._cid || ''), rowIndex, 1)}
                                  >
                                    <i className="fa-solid fa-arrow-down" aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    className="admin-icon-btn secondary"
                                    title="Add row"
                                    onClick={() => addSectionRow(String(typedBlock._cid || ''))}
                                  >
                                    <i className="fa-solid fa-plus" aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    className="admin-icon-btn secondary"
                                    title="Add column"
                                    onClick={() => addSectionColumn(String(typedBlock._cid || ''), rowIndex)}
                                  >
                                    <i className="fa-solid fa-table-columns" aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    className="admin-icon-btn danger"
                                    title="Remove row"
                                    onClick={() => removeSectionRow(String(typedBlock._cid || ''), rowIndex)}
                                  >
                                    <i className="fa-solid fa-trash" aria-hidden="true" />
                                  </button>
                                </div>
                              </div>
                              <div
                                className="admin-section-row-grid"
                                style={{ '--admin-columns': Math.max(1, row.columns?.length || 1) } as { [key: string]: string | number }}
                              >
                                {(row.columns || []).map((column, columnIndex) => (
                                  <SortDropTarget
                                    key={column._colid || columnIndex}
                                    id={`column-target:${String(typedBlock._cid || '')}:${rowIndex}:${columnIndex}`}
                                    className="admin-section-column"
                                  >
                                    <div className="admin-subsection-column-head">
                                      <div className="admin-subsection-column-main">
                                        <DragHandleButton
                                          id={`column:${String(typedBlock._cid || '')}:${rowIndex}:${columnIndex}`}
                                          data={{
                                            source: 'column',
                                            blockCid: String(typedBlock._cid || ''),
                                            rowIndex,
                                            columnIndex,
                                          }}
                                          icon="fa-grip-lines-vertical"
                                          title="Drag column"
                                        />
                                        <span className="admin-subsection-column-title">
                                          Column {columnIndex + 1} {column.width ? `(${column.width}/12)` : ''}
                                        </span>
                                        <input
                                          type="number"
                                          min={1}
                                          max={12}
                                          className="admin-input"
                                          style={{ width: 74 }}
                                          value={Number(column.width || 12)}
                                          onChange={(e) => setSectionColumnWidth(
                                            String(typedBlock._cid || ''),
                                            rowIndex,
                                            columnIndex,
                                            Number(e.target.value),
                                          )}
                                        />
                                      </div>
                                      <div className="admin-subsection-item-actions">
                                        <button
                                          type="button"
                                          className="admin-icon-btn secondary"
                                          title="Move column left"
                                          onClick={() => moveSectionColumn(String(typedBlock._cid || ''), rowIndex, columnIndex, -1)}
                                        >
                                          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                                        </button>
                                        <button
                                          type="button"
                                          className="admin-icon-btn secondary"
                                          title="Move column right"
                                          onClick={() => moveSectionColumn(String(typedBlock._cid || ''), rowIndex, columnIndex, 1)}
                                        >
                                          <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                                        </button>
                                        <button
                                          type="button"
                                          className="admin-icon-btn danger"
                                          title="Remove column"
                                          onClick={() => removeSectionColumn(String(typedBlock._cid || ''), rowIndex, columnIndex)}
                                        >
                                          <i className="fa-solid fa-trash" aria-hidden="true" />
                                        </button>
                                      </div>
                                    </div>
                                    <SectionItemsDropZone
                                      dropId={`section-drop:${String(typedBlock._cid || '')}:${rowIndex}:${columnIndex}`}
                                      emptyMessage={(column.items || []).length === 0 ? 'Drop components here.' : ''}
                                    >
                                      <SortableContext
                                        items={(column.items || []).map((item, idx) => `subitem:${String(item._iid || idx)}`)}
                                        strategy={verticalListSortingStrategy}
                                      >
                                      {(column.items || []).map((item, itemIndex) => (
                                        <div key={item._iid || itemIndex} className="admin-subsection-item">
                                          <SortableSectionItemRow
                                            item={item as { _iid: string; type?: string }}
                                            label={getBlockLabel(String(item.type || 'text'))}
                                            onRemove={() => removeSectionItem(String(typedBlock._cid || ''), rowIndex, columnIndex, itemIndex)}
                                          />

                                          {(item.type === 'heading' || item.type === 'text' || item.type === 'markdown') && (
                                            <div className="admin-field" style={{ marginTop: 8 }}>
                                              <label>{item.type === 'heading' ? 'Heading text' : 'Markdown'}</label>
                                              <textarea
                                                className="admin-textarea"
                                                style={{ minHeight: 90 }}
                                                value={String((item as { text?: string; markdown?: string }).text || (item as { markdown?: string }).markdown || '')}
                                                onChange={(e) => {
                                                  const field = item.type === 'heading' ? 'text' : 'markdown';
                                                  updateSectionItemField(
                                                    String(typedBlock._cid || ''),
                                                    rowIndex,
                                                    columnIndex,
                                                    itemIndex,
                                                    field,
                                                    e.target.value,
                                                  );
                                                }}
                                              />
                                            </div>
                                          )}

                                          {item.type === 'image' && (
                                            <>
                                              <div className="admin-field" style={{ marginTop: 8 }}>
                                                <label>Image URL</label>
                                                <input
                                                  className="admin-input"
                                                  value={String((item as { src?: string }).src || '')}
                                                  onChange={(e) => updateSectionItemField(String(typedBlock._cid || ''), rowIndex, columnIndex, itemIndex, 'src', e.target.value)}
                                                />
                                              </div>
                                              <div className="admin-field" style={{ marginTop: 8 }}>
                                                <label>Alt text</label>
                                                <input
                                                  className="admin-input"
                                                  value={String((item as { alt?: string }).alt || '')}
                                                  onChange={(e) => updateSectionItemField(String(typedBlock._cid || ''), rowIndex, columnIndex, itemIndex, 'alt', e.target.value)}
                                                />
                                              </div>
                                            </>
                                          )}

                                          {item.type === 'button' && (
                                            <>
                                              <div className="admin-field" style={{ marginTop: 8 }}>
                                                <label>Button label</label>
                                                <input
                                                  className="admin-input"
                                                  value={String((item as { label?: string }).label || '')}
                                                  onChange={(e) => updateSectionItemField(String(typedBlock._cid || ''), rowIndex, columnIndex, itemIndex, 'label', e.target.value)}
                                                />
                                              </div>
                                              <div className="admin-field" style={{ marginTop: 8 }}>
                                                <label>Button URL</label>
                                                <input
                                                  className="admin-input"
                                                  value={String((item as { href?: string }).href || '')}
                                                  onChange={(e) => updateSectionItemField(String(typedBlock._cid || ''), rowIndex, columnIndex, itemIndex, 'href', e.target.value)}
                                                />
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      ))}
                                      </SortableContext>
                                    </SectionItemsDropZone>
                                  </SortDropTarget>
                                ))}
                              </div>
                            </SortDropTarget>
                          ))}
                        </div>
                      )}

                      {selectedBlockId === typedBlock?._cid && typedBlock?.type !== 'section' && (
                        <div className="admin-block-editor" style={{ marginTop: 10 }}>
                          {typedBlock.type === 'hero' && (
                            <div className="admin-hero-editor">
                              <section className="admin-hero-panel">
                                <div className="admin-hero-panel-head">
                                  <strong>Content</strong>
                                </div>
                                <div className="admin-field">
                                  <label>Hero title</label>
                                  <input
                                    className="admin-input"
                                    value={effectiveHero.title}
                                    onChange={(e) => updateBlockField(String(typedBlock._cid || ''), 'title', e.target.value)}
                                  />
                                </div>
                                <div className="admin-field">
                                  <label>Hero subtitle</label>
                                  <textarea
                                    className="admin-textarea"
                                    style={{ minHeight: 90 }}
                                    value={effectiveHero.subtitle}
                                    onChange={(e) => updateBlockField(String(typedBlock._cid || ''), 'subtitle', e.target.value)}
                                  />
                                </div>
                                <div className="admin-hero-toggles">
                                  <label className="admin-hero-toggle">
                                    <input
                                      type="checkbox"
                                      checked={typedBlock.showVrchatBadge !== false}
                                      onChange={(e) => updateBlockField(String(typedBlock._cid || ''), 'showVrchatBadge', e.target.checked)}
                                    />
                                    <span>Show VRChat badge</span>
                                  </label>
                                  <label className="admin-hero-toggle">
                                    <input
                                      type="checkbox"
                                      checked={typedBlock.showSocial !== false}
                                      onChange={(e) => updateBlockField(String(typedBlock._cid || ''), 'showSocial', e.target.checked)}
                                    />
                                    <span>Show social icons</span>
                                  </label>
                                </div>
                              </section>

                              <section className="admin-hero-panel">
                                <div className="admin-hero-panel-head">
                                  <strong>Buttons</strong>
                                  <button
                                    type="button"
                                    className="admin-icon-btn secondary"
                                    title="Add hero button"
                                    onClick={() => {
                                      const nextButtons = [...(effectiveHero.buttons as HeroButtonItem[]), { label: 'New button', href: '/', variant: 'accent', external: false }];
                                      updateBlockField(String(typedBlock._cid || ''), 'buttons', nextButtons);
                                    }}
                                  >
                                    <i className="fa-solid fa-plus" aria-hidden="true" />
                                  </button>
                                </div>

                                <div className="admin-hero-buttons-list">
                                  {(effectiveHero.buttons as HeroButtonItem[]).map((button, buttonIndex) => (
                                    <article key={buttonIndex} className="admin-hero-button-card">
                                      <div className="admin-hero-button-head">
                                        <span className="admin-file-badge">#{buttonIndex + 1}</span>
                                        <div className="admin-actions">
                                          <button
                                            type="button"
                                            className="admin-icon-btn secondary"
                                            title="Move button up"
                                            onClick={() => {
                                              if (buttonIndex === 0) {
                                                return;
                                              }
                                              const nextButtons = [...(effectiveHero.buttons as HeroButtonItem[])];
                                              const [moved] = nextButtons.splice(buttonIndex, 1);
                                              nextButtons.splice(buttonIndex - 1, 0, moved);
                                              updateBlockField(String(typedBlock._cid || ''), 'buttons', nextButtons);
                                            }}
                                          >
                                            <i className="fa-solid fa-arrow-up" aria-hidden="true" />
                                          </button>
                                          <button
                                            type="button"
                                            className="admin-icon-btn secondary"
                                            title="Move button down"
                                            onClick={() => {
                                              const currentButtons = effectiveHero.buttons as HeroButtonItem[];
                                              if (buttonIndex >= currentButtons.length - 1) {
                                                return;
                                              }
                                              const nextButtons = [...currentButtons];
                                              const [moved] = nextButtons.splice(buttonIndex, 1);
                                              nextButtons.splice(buttonIndex + 1, 0, moved);
                                              updateBlockField(String(typedBlock._cid || ''), 'buttons', nextButtons);
                                            }}
                                          >
                                            <i className="fa-solid fa-arrow-down" aria-hidden="true" />
                                          </button>
                                          <button
                                            type="button"
                                            className="admin-icon-btn danger"
                                            title="Remove button"
                                            onClick={() => {
                                              const nextButtons = [...(effectiveHero.buttons as HeroButtonItem[])].filter((_, idx) => idx !== buttonIndex);
                                              updateBlockField(String(typedBlock._cid || ''), 'buttons', nextButtons);
                                            }}
                                          >
                                            <i className="fa-solid fa-trash" aria-hidden="true" />
                                          </button>
                                        </div>
                                      </div>

                                      <div className="admin-hero-button-fields">
                                        <input
                                          className="admin-input"
                                          placeholder="Button label"
                                          value={String(button.label || '')}
                                          onChange={(e) => {
                                            const nextButtons = [...(effectiveHero.buttons as HeroButtonItem[])];
                                            nextButtons[buttonIndex] = { ...button, label: e.target.value };
                                            updateBlockField(String(typedBlock._cid || ''), 'buttons', nextButtons);
                                          }}
                                        />
                                        <input
                                          className="admin-input"
                                          placeholder="Button URL"
                                          value={String(button.href || '')}
                                          onChange={(e) => {
                                            const nextButtons = [...(effectiveHero.buttons as HeroButtonItem[])];
                                            nextButtons[buttonIndex] = { ...button, href: e.target.value };
                                            updateBlockField(String(typedBlock._cid || ''), 'buttons', nextButtons);
                                          }}
                                        />
                                        <select
                                          className="admin-select"
                                          value={String(button.variant || 'accent')}
                                          onChange={(e) => {
                                            const nextButtons = [...(effectiveHero.buttons as HeroButtonItem[])];
                                            nextButtons[buttonIndex] = { ...button, variant: e.target.value as 'primary' | 'accent' };
                                            updateBlockField(String(typedBlock._cid || ''), 'buttons', nextButtons);
                                          }}
                                        >
                                          <option value="primary">Primary</option>
                                          <option value="accent">Accent</option>
                                        </select>
                                        <label className="admin-hero-toggle">
                                          <input
                                            type="checkbox"
                                            checked={Boolean(button.external)}
                                            onChange={(e) => {
                                              const nextButtons = [...(effectiveHero.buttons as HeroButtonItem[])];
                                              nextButtons[buttonIndex] = { ...button, external: e.target.checked };
                                              updateBlockField(String(typedBlock._cid || ''), 'buttons', nextButtons);
                                            }}
                                          />
                                          <span>External</span>
                                        </label>
                                      </div>
                                    </article>
                                  ))}
                                </div>
                              </section>
                            </div>
                          )}

                          {typedBlock.type === 'events' && (
                            <div className="admin-events-editor">
                              <section className="admin-hero-panel">
                                <div className="admin-hero-panel-head">
                                  <strong>Events content</strong>
                                  <button
                                    type="button"
                                    className="admin-icon-btn secondary"
                                    title="Add events row"
                                    onClick={() => updateBlockField(
                                      String(typedBlock._cid || ''),
                                      'rows',
                                      [...effectiveEventsRows, { year: String(new Date().getFullYear()), amount: '', events: [], collaboratorIds: [] }],
                                    )}
                                  >
                                    <i className="fa-solid fa-plus" aria-hidden="true" />
                                  </button>
                                </div>

                                <div className="admin-field">
                                  <label>Events title</label>
                                  <input
                                    className="admin-input"
                                    value={String(typedBlock.title || t('home.events.title'))}
                                    onChange={(e) => updateBlockField(String(typedBlock._cid || ''), 'title', e.target.value)}
                                  />
                                </div>
                              </section>

                              <section className="admin-events-rows-list">
                                {effectiveEventsRows.map((row, rowIndex) => {
                                  const eventRow = row as EventsRow;
                                  const slides = Array.isArray(eventRow.events) ? eventRow.events : [];
                                  const blockCatalog = Array.isArray(typedBlock.collaboratorsCatalog) && typedBlock.collaboratorsCatalog.length > 0
                                    ? typedBlock.collaboratorsCatalog as CollaboratorCatalogEntry[]
                                    : collaboratorsCatalog;
                                  const selectedCollaboratorIds = getSelectedCollaboratorIds(eventRow, blockCatalog);
                                  const uploadInputId = `events-row-upload-${rowIndex}`;

                                  return (
                                    <article key={rowIndex} className="admin-events-row-card">
                                      <div className="admin-events-row-card-head">
                                        <div className="admin-events-row-meta">
                                          <input
                                            className="admin-input"
                                            placeholder="Year"
                                            value={String(eventRow.year || '')}
                                            onChange={(e) => {
                                              const nextRows = [...effectiveEventsRows];
                                              nextRows[rowIndex] = { ...eventRow, year: e.target.value };
                                              updateBlockField(String(typedBlock._cid || ''), 'rows', nextRows);
                                            }}
                                          />
                                          <input
                                            className="admin-input"
                                            placeholder="Amount"
                                            value={String(eventRow.amount || '')}
                                            onChange={(e) => {
                                              const nextRows = [...effectiveEventsRows];
                                              nextRows[rowIndex] = { ...eventRow, amount: e.target.value };
                                              updateBlockField(String(typedBlock._cid || ''), 'rows', nextRows);
                                            }}
                                          />
                                        </div>
                                        <div className="admin-actions">
                                          <button
                                            type="button"
                                            className="admin-btn secondary"
                                            onClick={() => setCollaboratorsPicker({ blockCid: String(typedBlock._cid || ''), rowIndex })}
                                          >
                                            <i className="fa-solid fa-users" aria-hidden="true" />
                                            Collaborators
                                          </button>
                                          <label htmlFor={uploadInputId} className="admin-btn secondary" style={{ cursor: 'pointer' }}>
                                            <i className="fa-solid fa-images" aria-hidden="true" />
                                            Add images
                                          </label>
                                          <input
                                            id={uploadInputId}
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            style={{ display: 'none' }}
                                            onChange={async (e) => {
                                              const files = Array.from(e.target.files || []);
                                              if (!files.length) {
                                                return;
                                              }

                                              try {
                                                const uploadedSlides: Array<{ src: string; alt: string }> = [];
                                                for (const file of files) {
                                                  const optimizedFile = await optimizeImageForUpload(file);
                                                  const dataUrl = await fileToDataUrl(optimizedFile);
                                                  const safeExt = getImageExtensionFromMime(optimizedFile);
                                                  const fileName = `events-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
                                                  const uploadPath = `uploads/images/events/${fileName}`;

                                                  const response = await fetch('/__admin/api/assets/upload', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ path: uploadPath, dataUrl }),
                                                  });
                                                  const payload = await response.json();
                                                  if (!response.ok) {
                                                    throw new Error(payload?.error || 'Upload failed');
                                                  }

                                                  uploadedSlides.push({
                                                    src: String(payload.publicPath || `/${uploadPath}`),
                                                    alt: `VRTon ${String(eventRow.year || '')}`.trim(),
                                                  });
                                                }

                                                const nextRows = [...effectiveEventsRows];
                                                const currentEvents = Array.isArray(eventRow.events) ? eventRow.events : [];
                                                nextRows[rowIndex] = {
                                                  ...eventRow,
                                                  events: [...currentEvents, ...uploadedSlides],
                                                };
                                                updateBlockField(String(typedBlock._cid || ''), 'rows', nextRows);
                                                setStatus(`Uploaded ${uploadedSlides.length} image(s)`);
                                              } catch (error) {
                                                setStatus(error instanceof Error ? error.message : 'Upload failed');
                                              } finally {
                                                e.currentTarget.value = '';
                                              }
                                            }}
                                          />
                                          <button
                                            type="button"
                                            className="admin-icon-btn danger"
                                            title="Remove row"
                                            onClick={() => {
                                              const nextRows = [...effectiveEventsRows].filter((_, idx) => idx !== rowIndex);
                                              updateBlockField(String(typedBlock._cid || ''), 'rows', nextRows);
                                            }}
                                          >
                                            <i className="fa-solid fa-trash" aria-hidden="true" />
                                          </button>
                                        </div>
                                      </div>

                                      <div className="admin-events-row-stats">
                                        <span>{slides.length} slides</span>
                                        <span>{selectedCollaboratorIds.length} collaborators selected</span>
                                      </div>

                                      <div className="admin-events-thumb-strip">
                                        {slides.map((slide, slideIndex) => {
                                          const slideItem = slide as { src?: string; alt?: string };
                                          return (
                                            <div
                                              key={`event-slide-${rowIndex}-${slideIndex}`}
                                              className={`admin-events-thumb ${draggedEventSlide?.rowIndex === rowIndex && draggedEventSlide?.slideIndex === slideIndex ? 'is-dragging' : ''}`}
                                              draggable
                                              onDragStart={(event) => {
                                                setDraggedEventSlide({ rowIndex, slideIndex });
                                                event.dataTransfer.effectAllowed = 'move';
                                              }}
                                              onDragEnd={() => setDraggedEventSlide(null)}
                                              onDragOver={(event) => event.preventDefault()}
                                              onDrop={(event) => {
                                                event.preventDefault();
                                                if (!draggedEventSlide || draggedEventSlide.rowIndex !== rowIndex) {
                                                  return;
                                                }
                                                if (draggedEventSlide.slideIndex === slideIndex) {
                                                  return;
                                                }
                                                const nextRows = [...effectiveEventsRows];
                                                const rowEvents = Array.isArray(eventRow.events) ? [...eventRow.events] : [];
                                                const [moved] = rowEvents.splice(draggedEventSlide.slideIndex, 1);
                                                rowEvents.splice(slideIndex, 0, moved);
                                                nextRows[rowIndex] = { ...eventRow, events: rowEvents };
                                                updateBlockField(String(typedBlock._cid || ''), 'rows', nextRows);
                                                setDraggedEventSlide(null);
                                              }}
                                            >
                                              <img src={String(slideItem.src || '')} alt={String(slideItem.alt || '')} />
                                              <button
                                                type="button"
                                                className="admin-events-thumb-remove"
                                                title="Remove image"
                                                onClick={() => {
                                                  const rowEvents = Array.isArray(eventRow.events) ? eventRow.events : [];
                                                  const nextRows = [...effectiveEventsRows];
                                                  nextRows[rowIndex] = {
                                                    ...eventRow,
                                                    events: rowEvents.filter((_, idx) => idx !== slideIndex),
                                                  };
                                                  updateBlockField(String(typedBlock._cid || ''), 'rows', nextRows);
                                                }}
                                              >
                                                <i className="fa-solid fa-xmark" aria-hidden="true" />
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </article>
                                  );
                                })}
                              </section>
                            </div>
                          )}

                          {typedBlock.type === 'faq' && (
                            <div className="admin-faq-editor">
                              <section className="admin-hero-panel">
                                <div className="admin-hero-panel-head">
                                  <strong>FAQ content</strong>
                                </div>
                                <div className="admin-field">
                                  <label>FAQ title</label>
                                  <input
                                    className="admin-input"
                                    value={String(typedBlock.title || t('home.faq.title'))}
                                    onChange={(e) => updateBlockField(String(typedBlock._cid || ''), 'title', e.target.value)}
                                  />
                                </div>
                              </section>

                              <div className="admin-faq-columns">
                                <section className="admin-faq-column-panel">
                                  <div className="admin-hero-panel-head">
                                    <strong>Left column FAQs</strong>
                                    <button
                                      type="button"
                                      className="admin-icon-btn secondary"
                                      title="Add left FAQ"
                                      onClick={() => updateBlockField(
                                        String(typedBlock._cid || ''),
                                        'leftItems',
                                        [...effectiveFaqLeft, { question: 'New question', answer_html: '' }],
                                      )}
                                    >
                                      <i className="fa-solid fa-plus" aria-hidden="true" />
                                    </button>
                                  </div>

                                  <div
                                    className="admin-faq-items-list"
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={(event) => {
                                      event.preventDefault();
                                      if (!draggedFaqItem) {
                                        return;
                                      }
                                      const nextLeft = [...effectiveFaqLeft];
                                      const nextRight = [...effectiveFaqRight];
                                      const sourceList = draggedFaqItem.side === 'left' ? nextLeft : nextRight;
                                      const [moved] = sourceList.splice(draggedFaqItem.index, 1);
                                      nextLeft.push(moved);
                                      updateFaqColumns(String(typedBlock._cid || ''), nextLeft, nextRight);
                                      setDraggedFaqItem(null);
                                    }}
                                  >
                                    {effectiveFaqLeft.map((item, faqIndex) => {
                                      const faq = item as FAQConfigItem;
                                      return (
                                        <article
                                          key={`left-${faqIndex}`}
                                          className={`admin-faq-item-card ${draggedFaqItem?.side === 'left' && draggedFaqItem?.index === faqIndex ? 'is-dragging' : ''}`}
                                          draggable
                                          onDragStart={(event) => {
                                            setDraggedFaqItem({ side: 'left', index: faqIndex });
                                            event.dataTransfer.effectAllowed = 'move';
                                          }}
                                          onDragEnd={() => setDraggedFaqItem(null)}
                                          onDragOver={(event) => event.preventDefault()}
                                          onDrop={(event) => {
                                            event.preventDefault();
                                            if (!draggedFaqItem) {
                                              return;
                                            }

                                            const nextLeft = [...effectiveFaqLeft];
                                            const nextRight = [...effectiveFaqRight];

                                            const sourceList = draggedFaqItem.side === 'left' ? nextLeft : nextRight;
                                            const targetList = nextLeft;
                                            const [moved] = sourceList.splice(draggedFaqItem.index, 1);
                                            const insertAt = faqIndex;
                                            targetList.splice(insertAt, 0, moved);

                                            updateFaqColumns(String(typedBlock._cid || ''), nextLeft, nextRight);
                                            setDraggedFaqItem(null);
                                          }}
                                        >
                                          <div className="admin-faq-item-head">
                                            <span className="admin-file-badge">#{faqIndex + 1}</span>
                                            <i className="fa-solid fa-grip-vertical" aria-hidden="true" />
                                          </div>
                                          <input
                                            className="admin-input"
                                            placeholder="Question"
                                            value={String(faq.question || '')}
                                            onChange={(e) => {
                                              const nextItems = [...effectiveFaqLeft];
                                              nextItems[faqIndex] = { ...faq, question: e.target.value };
                                              updateBlockField(String(typedBlock._cid || ''), 'leftItems', nextItems);
                                            }}
                                          />
                                          <textarea
                                            className="admin-textarea"
                                            style={{ minHeight: 90 }}
                                            placeholder="Answer HTML"
                                            value={String(faq.answer_html || '')}
                                            onChange={(e) => {
                                              const nextItems = [...effectiveFaqLeft];
                                              nextItems[faqIndex] = { ...faq, answer_html: e.target.value };
                                              updateBlockField(String(typedBlock._cid || ''), 'leftItems', nextItems);
                                            }}
                                          />
                                          <div className="admin-actions">
                                            <button
                                              type="button"
                                              className="admin-icon-btn secondary"
                                              title="Move to right column"
                                              onClick={() => {
                                                const nextLeft = [...effectiveFaqLeft];
                                                const [moved] = nextLeft.splice(faqIndex, 1);
                                                const nextRight = [...effectiveFaqRight, moved];
                                                updateFaqColumns(String(typedBlock._cid || ''), nextLeft, nextRight);
                                              }}
                                            >
                                              <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                                            </button>
                                            <button
                                              type="button"
                                              className="admin-icon-btn danger"
                                              title="Remove FAQ"
                                              onClick={() => {
                                                const nextItems = [...effectiveFaqLeft].filter((_, idx) => idx !== faqIndex);
                                                updateBlockField(String(typedBlock._cid || ''), 'leftItems', nextItems);
                                              }}
                                            >
                                              <i className="fa-solid fa-trash" aria-hidden="true" />
                                            </button>
                                          </div>
                                        </article>
                                      );
                                    })}
                                  </div>
                                </section>

                                <section className="admin-faq-column-panel">
                                  <div className="admin-hero-panel-head">
                                    <strong>Right column FAQs</strong>
                                    <button
                                      type="button"
                                      className="admin-icon-btn secondary"
                                      title="Add right FAQ"
                                      onClick={() => updateBlockField(
                                        String(typedBlock._cid || ''),
                                        'rightItems',
                                        [...effectiveFaqRight, { question: 'New question', answer_html: '' }],
                                      )}
                                    >
                                      <i className="fa-solid fa-plus" aria-hidden="true" />
                                    </button>
                                  </div>

                                  <div
                                    className="admin-faq-items-list"
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={(event) => {
                                      event.preventDefault();
                                      if (!draggedFaqItem) {
                                        return;
                                      }
                                      const nextLeft = [...effectiveFaqLeft];
                                      const nextRight = [...effectiveFaqRight];
                                      const sourceList = draggedFaqItem.side === 'left' ? nextLeft : nextRight;
                                      const [moved] = sourceList.splice(draggedFaqItem.index, 1);
                                      nextRight.push(moved);
                                      updateFaqColumns(String(typedBlock._cid || ''), nextLeft, nextRight);
                                      setDraggedFaqItem(null);
                                    }}
                                  >
                                    {effectiveFaqRight.map((item, faqIndex) => {
                                      const faq = item as FAQConfigItem;
                                      return (
                                        <article
                                          key={`right-${faqIndex}`}
                                          className={`admin-faq-item-card ${draggedFaqItem?.side === 'right' && draggedFaqItem?.index === faqIndex ? 'is-dragging' : ''}`}
                                          draggable
                                          onDragStart={(event) => {
                                            setDraggedFaqItem({ side: 'right', index: faqIndex });
                                            event.dataTransfer.effectAllowed = 'move';
                                          }}
                                          onDragEnd={() => setDraggedFaqItem(null)}
                                          onDragOver={(event) => event.preventDefault()}
                                          onDrop={(event) => {
                                            event.preventDefault();
                                            if (!draggedFaqItem) {
                                              return;
                                            }

                                            const nextLeft = [...effectiveFaqLeft];
                                            const nextRight = [...effectiveFaqRight];

                                            const sourceList = draggedFaqItem.side === 'left' ? nextLeft : nextRight;
                                            const targetList = nextRight;
                                            const [moved] = sourceList.splice(draggedFaqItem.index, 1);
                                            const insertAt = faqIndex;
                                            targetList.splice(insertAt, 0, moved);

                                            updateFaqColumns(String(typedBlock._cid || ''), nextLeft, nextRight);
                                            setDraggedFaqItem(null);
                                          }}
                                        >
                                          <div className="admin-faq-item-head">
                                            <span className="admin-file-badge">#{faqIndex + 1}</span>
                                            <i className="fa-solid fa-grip-vertical" aria-hidden="true" />
                                          </div>
                                          <input
                                            className="admin-input"
                                            placeholder="Question"
                                            value={String(faq.question || '')}
                                            onChange={(e) => {
                                              const nextItems = [...effectiveFaqRight];
                                              nextItems[faqIndex] = { ...faq, question: e.target.value };
                                              updateBlockField(String(typedBlock._cid || ''), 'rightItems', nextItems);
                                            }}
                                          />
                                          <textarea
                                            className="admin-textarea"
                                            style={{ minHeight: 90 }}
                                            placeholder="Answer HTML"
                                            value={String(faq.answer_html || '')}
                                            onChange={(e) => {
                                              const nextItems = [...effectiveFaqRight];
                                              nextItems[faqIndex] = { ...faq, answer_html: e.target.value };
                                              updateBlockField(String(typedBlock._cid || ''), 'rightItems', nextItems);
                                            }}
                                          />
                                          <div className="admin-actions">
                                            <button
                                              type="button"
                                              className="admin-icon-btn secondary"
                                              title="Move to left column"
                                              onClick={() => {
                                                const nextRight = [...effectiveFaqRight];
                                                const [moved] = nextRight.splice(faqIndex, 1);
                                                const nextLeft = [...effectiveFaqLeft, moved];
                                                updateFaqColumns(String(typedBlock._cid || ''), nextLeft, nextRight);
                                              }}
                                            >
                                              <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                                            </button>
                                            <button
                                              type="button"
                                              className="admin-icon-btn danger"
                                              title="Remove FAQ"
                                              onClick={() => {
                                                const nextItems = [...effectiveFaqRight].filter((_, idx) => idx !== faqIndex);
                                                updateBlockField(String(typedBlock._cid || ''), 'rightItems', nextItems);
                                              }}
                                            >
                                              <i className="fa-solid fa-trash" aria-hidden="true" />
                                            </button>
                                          </div>
                                        </article>
                                      );
                                    })}
                                  </div>
                                </section>
                              </div>
                            </div>
                          )}

                          {typedBlock.type === 'heading' && (
                            <>
                              <div className="admin-field">
                                <label>Heading text</label>
                                <input
                                  className="admin-input"
                                  value={String(typedBlock.text || '')}
                                  onChange={(e) => updateBlockField(String(typedBlock._cid || ''), 'text', e.target.value)}
                                />
                              </div>
                              <div className="admin-field">
                                <label>Heading level</label>
                                <input
                                  className="admin-input"
                                  type="number"
                                  min={1}
                                  max={6}
                                  value={Number(typedBlock.level || 2)}
                                  onChange={(e) => updateBlockField(String(typedBlock._cid || ''), 'level', Math.min(6, Math.max(1, Number(e.target.value) || 2)))}
                                />
                              </div>
                            </>
                          )}

                          {(typedBlock.type === 'text' || typedBlock.type === 'markdown') && (
                            <div className="admin-field">
                              <label>Markdown content</label>
                              <textarea
                                className="admin-textarea"
                                value={String(typedBlock.markdown || '')}
                                onChange={(e) => updateBlockField(String(typedBlock._cid || ''), 'markdown', e.target.value)}
                              />
                            </div>
                          )}

                          {typedBlock.type === 'image' && (
                            <>
                              <div className="admin-field">
                                <label>Image URL</label>
                                <input
                                  className="admin-input"
                                  value={String(typedBlock.src || '')}
                                  onChange={(e) => updateBlockField(String(typedBlock._cid || ''), 'src', e.target.value)}
                                />
                              </div>
                              <div className="admin-field">
                                <label>Alt text</label>
                                <input
                                  className="admin-input"
                                  value={String(typedBlock.alt || '')}
                                  onChange={(e) => updateBlockField(String(typedBlock._cid || ''), 'alt', e.target.value)}
                                />
                              </div>
                              <div className="admin-field">
                                <label>Caption</label>
                                <input
                                  className="admin-input"
                                  value={String(typedBlock.caption || '')}
                                  onChange={(e) => updateBlockField(String(typedBlock._cid || ''), 'caption', e.target.value)}
                                />
                              </div>
                            </>
                          )}

                          {typedBlock.type === 'video' && (
                            <>
                              <div className="admin-field">
                                <label>Video URL</label>
                                <input
                                  className="admin-input"
                                  value={String(typedBlock.src || '')}
                                  onChange={(e) => updateBlockField(String(typedBlock._cid || ''), 'src', e.target.value)}
                                />
                              </div>
                              <div className="admin-field">
                                <label>Poster URL</label>
                                <input
                                  className="admin-input"
                                  value={String(typedBlock.poster || '')}
                                  onChange={(e) => updateBlockField(String(typedBlock._cid || ''), 'poster', e.target.value)}
                                />
                              </div>
                              <div className="admin-actions">
                                {[
                                  { key: 'controls', label: 'Controls' },
                                  { key: 'autoplay', label: 'Autoplay' },
                                  { key: 'muted', label: 'Muted' },
                                  { key: 'loop', label: 'Loop' },
                                ].map((opt) => (
                                  <label key={opt.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <input
                                      type="checkbox"
                                      checked={Boolean(typedBlock[opt.key])}
                                      onChange={(e) => updateBlockField(String(typedBlock._cid || ''), opt.key, e.target.checked)}
                                    />
                                    {opt.label}
                                  </label>
                                ))}
                              </div>
                            </>
                          )}

                          {typedBlock.type === 'youtube' && (
                            <>
                              <div className="admin-field">
                                <label>YouTube URL</label>
                                <input
                                  className="admin-input"
                                  value={String(typedBlock.url || '')}
                                  onChange={(e) => updateBlockField(String(typedBlock._cid || ''), 'url', e.target.value)}
                                />
                              </div>
                              <div className="admin-field">
                                <label>Video title</label>
                                <input
                                  className="admin-input"
                                  value={String(typedBlock.title || '')}
                                  onChange={(e) => updateBlockField(String(typedBlock._cid || ''), 'title', e.target.value)}
                                />
                              </div>
                            </>
                          )}

                          {typedBlock.type === 'button' && (
                            <>
                              <div className="admin-field">
                                <label>Button label</label>
                                <input
                                  className="admin-input"
                                  value={String(typedBlock.label || '')}
                                  onChange={(e) => updateBlockField(String(typedBlock._cid || ''), 'label', e.target.value)}
                                />
                              </div>
                              <div className="admin-field">
                                <label>Button URL</label>
                                <input
                                  className="admin-input"
                                  value={String(typedBlock.href || '')}
                                  onChange={(e) => updateBlockField(String(typedBlock._cid || ''), 'href', e.target.value)}
                                />
                              </div>
                            </>
                          )}

                          {typedBlock.type === 'links' && (
                            <div className="admin-field">
                              <label>Links</label>
                              <div className="admin-actions" style={{ marginBottom: 8 }}>
                                <button
                                  type="button"
                                  className="admin-icon-btn secondary"
                                  title="Add link"
                                  onClick={() => addBlockItem(String(typedBlock._cid || ''), () => ({ label: 'New link', href: '/' }))}
                                >
                                  <i className="fa-solid fa-plus" aria-hidden="true" />
                                </button>
                              </div>
                              {(Array.isArray(typedBlock.items) ? typedBlock.items : []).map((item, linkIndex) => {
                                const linkItem = item as { label?: string; href?: string };
                                return (
                                  <div key={linkIndex} style={{ marginBottom: 8, padding: 8, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                                    <input
                                      className="admin-input"
                                      placeholder="Label"
                                      value={String(linkItem.label || '')}
                                      onChange={(e) => {
                                        updateBlockItems(String(typedBlock._cid || ''), (items) => {
                                          const nextItems = [...items];
                                          nextItems[linkIndex] = { ...(nextItems[linkIndex] as { label?: string; href?: string }), label: e.target.value };
                                          return nextItems;
                                        });
                                      }}
                                    />
                                    <input
                                      className="admin-input"
                                      style={{ marginTop: 6 }}
                                      placeholder="URL"
                                      value={String(linkItem.href || '')}
                                      onChange={(e) => {
                                        updateBlockItems(String(typedBlock._cid || ''), (items) => {
                                          const nextItems = [...items];
                                          nextItems[linkIndex] = { ...(nextItems[linkIndex] as { label?: string; href?: string }), href: e.target.value };
                                          return nextItems;
                                        });
                                      }}
                                    />
                                    <button
                                      type="button"
                                      className="admin-icon-btn danger"
                                      style={{ marginTop: 6 }}
                                      onClick={() => removeBlockItem(String(typedBlock._cid || ''), linkIndex)}
                                    >
                                      <i className="fa-solid fa-trash" aria-hidden="true" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {typedBlock.type === 'spacer' && (
                            <div className="admin-field">
                              <label>Spacer height</label>
                              <input
                                className="admin-input"
                                type="number"
                                min={8}
                                value={Number(typedBlock.height || 40)}
                                onChange={(e) => updateBlockField(String(typedBlock._cid || ''), 'height', Math.max(8, Number(e.target.value) || 40))}
                              />
                            </div>
                          )}

                          {typedBlock.type === 'divider' && (
                            <div className="admin-field">
                              <label>Divider style</label>
                              <select
                                className="admin-select"
                                value={String(typedBlock.style || 'line')}
                                onChange={(e) => updateBlockField(String(typedBlock._cid || ''), 'style', e.target.value)}
                              >
                                <option value="line">Line</option>
                                <option value="dashed">Dashed</option>
                                <option value="dots">Dots</option>
                              </select>
                            </div>
                          )}

                          {typedBlock.type === 'gallery' && (
                            <div className="admin-field">
                              <label>Gallery items</label>
                              <div className="admin-actions" style={{ marginBottom: 8 }}>
                                <button
                                  type="button"
                                  className="admin-icon-btn secondary"
                                  title="Add gallery image"
                                  onClick={() => addBlockItem(String(typedBlock._cid || ''), () => ({ src: '', alt: '', caption: '' }))}
                                >
                                  <i className="fa-solid fa-plus" aria-hidden="true" />
                                </button>
                              </div>
                              {(Array.isArray(typedBlock.items) ? typedBlock.items : []).map((item, galleryIndex) => {
                                const galleryItem = item as GalleryItem;
                                return (
                                  <div key={galleryIndex} style={{ marginBottom: 8, padding: 8, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                                    <input
                                      className="admin-input"
                                      placeholder="Image URL"
                                      value={String(galleryItem.src || '')}
                                      onChange={(e) => {
                                        const nextItems = [...(Array.isArray(typedBlock.items) ? typedBlock.items : [])];
                                        nextItems[galleryIndex] = { ...galleryItem, src: e.target.value };
                                        updateBlockField(String(typedBlock._cid || ''), 'items', nextItems);
                                      }}
                                    />
                                    <input
                                      className="admin-input"
                                      style={{ marginTop: 6 }}
                                      placeholder="Alt"
                                      value={String(galleryItem.alt || '')}
                                      onChange={(e) => {
                                        const nextItems = [...(Array.isArray(typedBlock.items) ? typedBlock.items : [])];
                                        nextItems[galleryIndex] = { ...galleryItem, alt: e.target.value };
                                        updateBlockField(String(typedBlock._cid || ''), 'items', nextItems);
                                      }}
                                    />
                                    <button
                                      type="button"
                                      className="admin-icon-btn danger"
                                      style={{ marginTop: 6 }}
                                      onClick={() => removeBlockItem(String(typedBlock._cid || ''), galleryIndex)}
                                    >
                                      <i className="fa-solid fa-trash" aria-hidden="true" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {typedBlock.type === 'accordion' && (
                            <div className="admin-field">
                              <label>Accordion items</label>
                              <div className="admin-actions" style={{ marginBottom: 8 }}>
                                <button
                                  type="button"
                                  className="admin-icon-btn secondary"
                                  title="Add accordion item"
                                  onClick={() => addBlockItem(String(typedBlock._cid || ''), () => ({ title: 'New item', markdown: '' }))}
                                >
                                  <i className="fa-solid fa-plus" aria-hidden="true" />
                                </button>
                              </div>
                              {(Array.isArray(typedBlock.items) ? typedBlock.items : []).map((item, accordionIndex) => {
                                const accordionItem = item as AccordionItem;
                                return (
                                  <div key={accordionIndex} style={{ marginBottom: 8, padding: 8, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                                    <input
                                      className="admin-input"
                                      placeholder="Title"
                                      value={String(accordionItem.title || '')}
                                      onChange={(e) => {
                                        const nextItems = [...(Array.isArray(typedBlock.items) ? typedBlock.items : [])];
                                        nextItems[accordionIndex] = { ...accordionItem, title: e.target.value };
                                        updateBlockField(String(typedBlock._cid || ''), 'items', nextItems);
                                      }}
                                    />
                                    <textarea
                                      className="admin-textarea"
                                      style={{ minHeight: 70, marginTop: 6 }}
                                      placeholder="Markdown"
                                      value={String(accordionItem.markdown || '')}
                                      onChange={(e) => {
                                        const nextItems = [...(Array.isArray(typedBlock.items) ? typedBlock.items : [])];
                                        nextItems[accordionIndex] = { ...accordionItem, markdown: e.target.value };
                                        updateBlockField(String(typedBlock._cid || ''), 'items', nextItems);
                                      }}
                                    />
                                    <button
                                      type="button"
                                      className="admin-icon-btn danger"
                                      style={{ marginTop: 6 }}
                                      onClick={() => removeBlockItem(String(typedBlock._cid || ''), accordionIndex)}
                                    >
                                      <i className="fa-solid fa-trash" aria-hidden="true" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {typedBlock.type === 'schedule' && (
                            <>
                              <div className="admin-field">
                                <label>Schedule title</label>
                                <input
                                  className="admin-input"
                                  value={String(typedBlock.title || '')}
                                  onChange={(e) => updateBlockField(String(typedBlock._cid || ''), 'title', e.target.value)}
                                />
                              </div>
                              <div className="admin-field">
                                <label>Schedule items</label>
                                <div className="admin-actions" style={{ marginBottom: 8 }}>
                                  <button
                                    type="button"
                                    className="admin-icon-btn secondary"
                                    title="Add schedule item"
                                    onClick={() => addBlockItem(String(typedBlock._cid || ''), () => ({ time: '', title: '', details: '' }))}
                                  >
                                    <i className="fa-solid fa-plus" aria-hidden="true" />
                                  </button>
                                </div>
                                {(Array.isArray(typedBlock.items) ? typedBlock.items : []).map((item, scheduleIndex) => {
                                  const scheduleItem = item as ScheduleItem;
                                  return (
                                    <div key={scheduleIndex} style={{ marginBottom: 8, padding: 8, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                                      <input
                                        className="admin-input"
                                        placeholder="Time"
                                        value={String(scheduleItem.time || '')}
                                        onChange={(e) => {
                                          const nextItems = [...(Array.isArray(typedBlock.items) ? typedBlock.items : [])];
                                          nextItems[scheduleIndex] = { ...scheduleItem, time: e.target.value };
                                          updateBlockField(String(typedBlock._cid || ''), 'items', nextItems);
                                        }}
                                      />
                                      <input
                                        className="admin-input"
                                        style={{ marginTop: 6 }}
                                        placeholder="Title"
                                        value={String(scheduleItem.title || '')}
                                        onChange={(e) => {
                                          const nextItems = [...(Array.isArray(typedBlock.items) ? typedBlock.items : [])];
                                          nextItems[scheduleIndex] = { ...scheduleItem, title: e.target.value };
                                          updateBlockField(String(typedBlock._cid || ''), 'items', nextItems);
                                        }}
                                      />
                                      <textarea
                                        className="admin-textarea"
                                        style={{ minHeight: 60, marginTop: 6 }}
                                        placeholder="Details"
                                        value={String(scheduleItem.details || '')}
                                        onChange={(e) => {
                                          const nextItems = [...(Array.isArray(typedBlock.items) ? typedBlock.items : [])];
                                          nextItems[scheduleIndex] = { ...scheduleItem, details: e.target.value };
                                          updateBlockField(String(typedBlock._cid || ''), 'items', nextItems);
                                        }}
                                      />
                                      <button
                                        type="button"
                                        className="admin-icon-btn danger"
                                        style={{ marginTop: 6 }}
                                        onClick={() => removeBlockItem(String(typedBlock._cid || ''), scheduleIndex)}
                                      >
                                        <i className="fa-solid fa-trash" aria-hidden="true" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    </div>
                  );
                })}
                <SectionItemsDropZone
                  dropId={`canvas-insert:${Array.isArray(blocksData) ? blocksData.length : 0}`}
                  className="admin-canvas-insert-drop"
                />
              </div>
              </SectionItemsDropZone>
            </div>
          )}

          {isI18nFile && contentMode === 'pages' && (
            <div className="admin-i18n-editor">
              <div className="admin-i18n-header">
                <h3>Translation Editor</h3>
                {i18nError && <span className="admin-error">{i18nError}</span>}
              </div>
              <textarea
                className="admin-textarea"
                value={rawMarkdown}
                onChange={(e) => setRawMarkdown(e.target.value)}
              />
            </div>
          )}
        </div>
      </main>
      <DragOverlay>
        {activeLibraryType
          ? <LibraryDragGhost entry={{ icon: getBlockIcon(activeLibraryType), label: getBlockLabel(activeLibraryType) }} />
          : null}
        {!activeLibraryType && activeSubitemType
          ? <SubitemDragGhost active={{ type: activeSubitemType }} />
          : null}
        {!activeLibraryType && !activeSubitemType && isRowDragging
          ? <RowDragGhost />
          : null}
        {!activeLibraryType && !activeSubitemType && isColumnDragging
          ? <ColumnDragGhost />
          : null}
      </DragOverlay>
      </DndContext>

      {activeCollaboratorsPicker && (
        <div className="admin-modal-overlay" onClick={() => setCollaboratorsPicker(null)}>
          <div className="admin-modal admin-collaborators-picker-modal" onClick={(event) => event.stopPropagation()}>
            <h2>
              Collaborators for VRTon {activeCollaboratorsPicker.rowYear || `#${activeCollaboratorsPicker.rowIndex + 1}`}
            </h2>
            <p className="admin-note">Pick collaborators for this event row.</p>

            <div className="admin-events-collaborator-buttons-grid">
              {activeCollaboratorsPicker.catalog.map((entry, entryIndex) => {
                const collab = entry as { id?: string; name?: string; src?: string };
                const catalogId = String(collab.id || '').trim();
                if (!catalogId) {
                  return null;
                }
                const isSelected = activeCollaboratorsPicker.selectedIds.includes(catalogId);
                return (
                  <button
                    key={`collaborator-picker-${entryIndex}`}
                    type="button"
                    className={`admin-events-collaborator-button ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => toggleCollaboratorIdForEventRow(activeCollaboratorsPicker.blockCid, activeCollaboratorsPicker.rowIndex, catalogId)}
                  >
                    <div className="admin-events-collaborator-button-media">
                      {String(collab.src || '').trim()
                        ? <img src={String(collab.src)} alt={String(collab.name || catalogId)} loading="lazy" />
                        : <span className="admin-note">No image</span>}
                    </div>
                    <strong>{String(collab.name || catalogId)}</strong>
                  </button>
                );
              })}
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-btn"
                onClick={() => setCollaboratorsPicker(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <h2>Create New Page</h2>
            <input
              className="admin-input"
              placeholder="Page title"
              value={newPageTitle}
              onChange={(e) => setNewPageTitle(e.target.value)}
            />
            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-btn"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn primary"
                onClick={onCreatePage}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
