import type { UploadKind } from '../types';

export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_UPLOAD_BYTES = 120 * 1024 * 1024;

export function sanitizeAssetBaseName(name: string): string {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function toMegabytesText(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

export function assertUploadFileOrThrow(file: File | null | undefined, kind: UploadKind): void {
  if (!file) {
    throw new Error('Missing file');
  }

  const type = String(file.type || '');
  const size = Number(file.size || 0);

  if (kind === 'images') {
    if (!type.startsWith('image/')) {
      throw new Error('Only image files are allowed for image block');
    }
    if (size > MAX_IMAGE_UPLOAD_BYTES) {
      throw new Error(`Image exceeds limit (${toMegabytesText(MAX_IMAGE_UPLOAD_BYTES)})`);
    }
    return;
  }

  if (kind === 'videos') {
    if (!type.startsWith('video/')) {
      throw new Error('Only video files are allowed for video block');
    }
    if (size > MAX_VIDEO_UPLOAD_BYTES) {
      throw new Error(`Video exceeds limit (${toMegabytesText(MAX_VIDEO_UPLOAD_BYTES)})`);
    }
    return;
  }

  throw new Error('Unsupported upload kind');
}