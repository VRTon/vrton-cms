import { useState, useCallback, useRef } from 'react';
import { API_PREFIX } from './constants';
import { parsePageAndLang } from './parsing';

export interface UploadProgressByItem {
  [key: string]: number
}

export function useAdminFileOperations(activePath: string, onStatusChange: (s: string) => void) {
  const [uploadProgressByItem, setUploadProgressByItem] = useState<UploadProgressByItem>({});
  const uploadRequestByItemRef = useRef<Record<string, XMLHttpRequest | null>>({});

  const requestUploadAsset = useCallback(async (
    file: File,
    blockIndex: number,
    rowIndex: number,
    columnIndex: number,
    itemIndex: number,
  ): Promise<{ src: string; filename: string; filesize: number }> => {
    const stateKey = `${blockIndex}:${rowIndex}:${columnIndex}:${itemIndex}`;
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setUploadProgressByItem((prev) => ({ ...prev, [stateKey]: percent }));
        }
      };

      xhr.onload = () => {
        setUploadProgressByItem((prev) => {
          const next = { ...prev };
          delete next[stateKey];
          return next;
        });
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve({ src: data.src, filename: file.name, filesize: file.size });
          } catch {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        setUploadProgressByItem((prev) => {
          const next = { ...prev };
          delete next[stateKey];
          return next;
        });
        reject(new Error('Network error'));
      };

      xhr.open('POST', `${API_PREFIX}/upload`);
      xhr.send(formData);
      uploadRequestByItemRef.current[stateKey] = xhr;
    });
  }, []);

  const cancelUpload = useCallback((blockIndex: number, rowIndex: number, columnIndex: number, itemIndex: number) => {
    const stateKey = `${blockIndex}:${rowIndex}:${columnIndex}:${itemIndex}`;
    const request = uploadRequestByItemRef.current[stateKey];
    if (request) {
      request.abort();
      delete uploadRequestByItemRef.current[stateKey];
      setUploadProgressByItem((prev) => {
        const next = { ...prev };
        delete next[stateKey];
        return next;
      });
    }
  }, []);

  return {
    uploadProgressByItem,
    requestUploadAsset,
    cancelUpload,
  };
}

export interface AdminFileItem {
  path: string
  updatedAt?: string
}

export function useAdminFileList() {
  const [files, setFiles] = useState<AdminFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_PREFIX}/list`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to load files');
      }
      setFiles(payload.files || []);
      return payload.files || [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFile = useCallback(async (path: string): Promise<{ content: string }> => {
    const response = await fetch(`${API_PREFIX}/file?path=${encodeURIComponent(path)}`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Unable to load file');
    }
    return { content: payload.content };
  }, []);

  const saveFile = useCallback(async (path: string, content: string): Promise<void> => {
    const response = await fetch(`${API_PREFIX}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Unable to save file');
    }
  }, []);

  const createFile = useCallback(async (path: string, content: string): Promise<void> => {
    const response = await fetch(`${API_PREFIX}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Unable to create file');
    }
  }, []);

  const deleteFile = useCallback(async (path: string): Promise<void> => {
    const response = await fetch(`${API_PREFIX}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Unable to delete file');
    }
  }, []);

  return {
    files,
    loading,
    error,
    loadFiles,
    loadFile,
    saveFile,
    createFile,
    deleteFile,
  };
}

export function parsePageGroup(files: AdminFileItem[]) {
  const normalized = files
    .map((file) => ({ ...file, ...parsePageAndLang(file.path) }))
    .filter((file) => file.section === 'pages' || file.section === 'i18n');

  const source = normalized.filter((entry) => entry.section === 'pages');
  const groups = new Map<string, typeof normalized>();

  for (const file of source) {
    if (!groups.has(file.page)) {
      groups.set(file.page, []);
    }
    groups.get(file.page)!.push(file);
  }

  return Array.from(groups.entries())
    .filter(([page]) => page !== 'not-found')
    .map(([page, entries]) => ({
      page,
      entries: entries.sort((a, b) => a.lang.localeCompare(b.lang)),
    }))
    .sort((a, b) => a.page.localeCompare(b.page));
}