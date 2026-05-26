import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { usePageState } from './components/page/usePageState';
import { AdminPage } from './components/page/PageUI';
import { API_PREFIX } from './components/page/constants';
import { slugify } from './components/page/utils';
import './i18n';
import './styles/index.css';
import './styles/admin.css';

const ADMIN_STATE_STORAGE_KEY = 'vrton:admin-state';

type ContentMode = 'pages' | 'links' | 'collaborators';
type AdminLanguage = 'es' | 'en';

const readStoredAdminState = (): { contentMode?: ContentMode; activePath?: string; preferredLang?: AdminLanguage } => {
  try {
    const raw = window.localStorage.getItem(ADMIN_STATE_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as { contentMode?: string; activePath?: string; preferredLang?: string };
    const contentMode = parsed.contentMode === 'links' || parsed.contentMode === 'collaborators' || parsed.contentMode === 'pages'
      ? parsed.contentMode
      : undefined;
    const activePath = typeof parsed.activePath === 'string' ? parsed.activePath : undefined;
    const preferredLang = parsed.preferredLang === 'es' || parsed.preferredLang === 'en'
      ? parsed.preferredLang
      : undefined;
    return { contentMode, activePath, preferredLang };
  } catch {
    return {};
  }
};

const writeStoredAdminState = (
  state: { contentMode: ContentMode; activePath: string; preferredLang: AdminLanguage },
) => {
  try {
    window.localStorage.setItem(ADMIN_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage write failures
  }
};

export default function AdminApp() {
  const storedState = readStoredAdminState();

  /* UI state that lives outside usePageState */
  const [contentMode, setContentMode] = useState<ContentMode>(storedState.contentMode || 'pages');
  const [preferredLang, setPreferredLang] = useState<AdminLanguage>(storedState.preferredLang || 'es');

  // Pull every field from usePageState explicitly so there is no accidental
  // overlap with local UI state
  const {
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
  } = usePageState(contentMode === 'links' ? 'links' : 'pages');

  useEffect(() => { loadFiles(); }, []);

  useEffect(() => {
    if (!activePath) {
      return;
    }
    loadActiveFile(activePath);
  }, [activePath]);

  useEffect(() => {
    const activeFile = normalizedFiles.find((file) => file.path === activePath);
    if (activeFile?.lang === 'es' || activeFile?.lang === 'en') {
      setPreferredLang(activeFile.lang);
    }
  }, [activePath, normalizedFiles]);

  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [previewPath] = useState('/');
  const [previewVersion, setPreviewVersion] = useState(0);
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [previewHostWidth, setPreviewHostWidth] = useState(1280);

  useEffect(() => {
    const targetSection = contentMode === 'links' ? 'i18n' : 'pages';
    const candidates = normalizedFiles.filter((file) => file.section === targetSection);

    if (!candidates.length) {
      loadFiles();
      return;
    }

    if (candidates.some((file) => file.path === activePath)) {
      return;
    }

    const persistedPath = readStoredAdminState().activePath;
    if (persistedPath && candidates.some((file) => file.path === persistedPath)) {
      setActivePath(persistedPath);
      return;
    }

    const preferredPersistedLanguage = candidates.find((file) => file.lang === preferredLang);
    const preferredHomeSpanish = candidates.find((file) => file.page === 'home' && file.lang === 'es');
    const preferredSpanish = candidates.find((file) => file.lang === 'es');
    const preferredHome = candidates.find((file) => file.page === 'home');
    const nextPath = preferredPersistedLanguage?.path || preferredHomeSpanish?.path || preferredSpanish?.path || preferredHome?.path || candidates[0]?.path || '';

    if (nextPath && nextPath !== activePath) {
      setActivePath(nextPath);
    }
  }, [contentMode, normalizedFiles, activePath, loadFiles, preferredLang, setActivePath]);

  useEffect(() => {
    writeStoredAdminState({ contentMode, activePath, preferredLang });
  }, [contentMode, activePath, preferredLang]);

  /* API helpers */
  const saveFile = useCallback(async (path: string, content: string) => {
    const r = await fetch(`${API_PREFIX}/file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    });
    const p = await r.json();
    if (!r.ok) throw new Error(p.error || 'Save failed');
  }, []);

  const createFile = useCallback(async (path: string, content: string) => {
    const r = await fetch(`${API_PREFIX}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    });
    const p = await r.json();
    if (!r.ok) throw new Error(p.error || 'Create failed');
  }, []);

  const deleteFile = useCallback(async (path: string) => {
    const r = await fetch(`${API_PREFIX}/file`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    const p = await r.json();
    if (!r.ok) throw new Error(p.error || 'Delete failed');
  }, []);

  /* Derived helpers */
  const hasUnsavedChanges = useMemo(
    () => rawMarkdown !== lastSavedMarkdown,
    [rawMarkdown, lastSavedMarkdown],
  );

  const onPathChange = useCallback(
    (pathValue: string, force?: boolean) => {
      if (hasUnsavedChanges && !force) {
        if (!window.confirm('Discard unsaved changes?')) return false;
      }
      setActivePath(pathValue);
      return true;
    },
    [hasUnsavedChanges, setActivePath],
  );

  const selectPageSlug = useCallback(
    (slug: string) => {
      const entries = normalizedFiles.filter(
        (f: { page: string }) => f.page === slug,
      );
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const preferred =
        entries.find((e: any) => e.lang === preferredLang)
        || entries.find((e: any) => e.lang === 'es')
        || entries[0];
      /* eslint-enable @typescript-eslint/no-explicit-any */
      if (preferred) onPathChange(preferred.path);
    },
    [normalizedFiles, onPathChange, preferredLang],
  );

  const onUndo = useCallback(() => {
    setHistoryCursor((c: number) => Math.max(0, c - 1));
  }, [setHistoryCursor]);

  const onRedo = useCallback(() => {
    setHistoryCursor((c: number) =>
      Math.min(blocksHistory.length - 1, c + 1),
    );
  }, [setHistoryCursor, blocksHistory.length]);

  const onCreatePage = useCallback(() => {
    if (!newPageTitle.trim()) return;
    const s = slugify(newPageTitle);
    if (!s) return;
    const now = new Date().toISOString();
    const path = `content/pages/${s}/es.md`;
    const template = `---\\ntitle: "${newPageTitle}"\\nslug: "${s}"\\nlang: "es"\\nstatus: "draft"\\nupdatedAt: "${now}"\\n---\\n\\n# ${newPageTitle}\\n\\n`;
    createFile(path, template)
      .then(async () => {
        await fetch('/__admin/api/content/regenerate', { method: 'POST' });
        await fetch('http://localhost:5173/__admin/api/hot-reload', {
          method: 'POST',
          mode: 'cors',
        });
        await loadFiles();
        setActivePath(path);
        setStatus(`Created: ${s} (es)`);
        setIsCreateModalOpen(false);
        setNewPageTitle('');
      })
      .catch((err: Error) => setStatus(`Error: ${err.message}`));
  }, [newPageTitle, createFile, loadFiles, setActivePath, setStatus]);

  return (
    <AdminPage
      files={files}
      activePath={activePath}
      setActivePath={setActivePath}
      rawMarkdown={rawMarkdown}
      setRawMarkdown={setRawMarkdown}
      lastSavedMarkdown={lastSavedMarkdown}
      setLastSavedMarkdown={setLastSavedMarkdown}
      status={status}
      setStatus={setStatus}
      busy={busy}
      setBusy={setBusy}
      blocksData={blocksData}
      setBlocksData={setBlocksData}
      blocksHistory={blocksHistory}
      setBlocksHistory={setBlocksHistory}
      historyCursor={historyCursor}
      setHistoryCursor={setHistoryCursor}
      blocksError={blocksError}
      setBlocksError={setBlocksError}
      i18nData={i18nData}
      setI18nData={setI18nData}
      i18nError={i18nError}
      setI18nError={setI18nError}
      selectedBlockId={selectedBlockId}
      setSelectedBlockId={setSelectedBlockId}
      canUndo={canUndo}
      canRedo={canRedo}
      pushBlocksHistory={pushBlocksHistory}
      mutateBlocks={mutateBlocks}
      normalizedFiles={normalizedFiles}
      pages={pages}
      loadFiles={loadFiles}
      loadActiveFile={loadActiveFile}
      sensors={sensors}
      historyCursorRef={historyCursorRef}
      blocksHistoryRef={blocksHistoryRef}
      contentMode={contentMode}
      setContentMode={setContentMode}
      isModeMenuOpen={isModeMenuOpen}
      setIsModeMenuOpen={setIsModeMenuOpen}
      isCreateModalOpen={isCreateModalOpen}
      setIsCreateModalOpen={setIsCreateModalOpen}
      isPreviewModalOpen={isPreviewModalOpen}
      setIsPreviewModalOpen={setIsPreviewModalOpen}
      newPageTitle={newPageTitle}
      setNewPageTitle={setNewPageTitle}
      onCreatePage={onCreatePage}
      previewPath={previewPath}
      previewVersion={previewVersion}
      setPreviewVersion={setPreviewVersion}
      previewDevice={previewDevice}
      setPreviewDevice={setPreviewDevice}
      previewHostWidth={previewHostWidth}
      setPreviewHostWidth={setPreviewHostWidth}
      saveFile={saveFile}
      createFile={createFile}
      deleteFile={deleteFile}
      onPathChange={onPathChange}
      selectPageSlug={selectPageSlug}
      hasUnsavedChanges={hasUnsavedChanges}
      onUndo={onUndo}
      onRedo={onRedo}
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <AdminApp />
  </BrowserRouter>,
);
