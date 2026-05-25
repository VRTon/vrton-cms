import type { AssetParseResult } from '../types';

interface ParseAssetUploadPayloadParams {
  body: { path?: string; dataUrl?: string }
  maxImageBytes: number
  maxVideoBytes: number
}

export function parseAssetUploadPayload({
  body,
  maxImageBytes,
  maxVideoBytes,
}: ParseAssetUploadPayloadParams): AssetParseResult {
  const relativePath = String(body?.path || '').trim().replace(/^\/+/, '');
  const dataUrl = String(body?.dataUrl || '');
  if (!relativePath || !dataUrl.startsWith('data:')) {
    return { error: 'Missing asset path or invalid dataUrl', status: 400 };
  }

  const base64Index = dataUrl.indexOf('base64,');
  if (base64Index < 0) {
    return { error: 'Only base64 dataUrl is supported', status: 400 };
  }

  const dataHeader = dataUrl.slice(0, base64Index);
  const mimeMatch = dataHeader.match(/^data:([^;]+);$/);
  const mimeType = (mimeMatch?.[1] || '').toLowerCase();
  const normalizedPath = relativePath.replace(/\\/g, '/').toLowerCase();
  const isImageTarget = normalizedPath.startsWith('uploads/images/');
  const isVideoTarget = normalizedPath.startsWith('uploads/videos/');

  if (isImageTarget && !mimeType.startsWith('image/')) {
    return { error: 'Invalid image mime type', status: 400 };
  }

  if (isVideoTarget && !mimeType.startsWith('video/')) {
    return { error: 'Invalid video mime type', status: 400 };
  }

  const encoded = dataUrl.slice(base64Index + 'base64,'.length);
  const buffer = Buffer.from(encoded, 'base64');

  if (isImageTarget && buffer.byteLength > maxImageBytes) {
    return {
      error: `Image exceeds limit (${Math.round(maxImageBytes / (1024 * 1024))}MB)`,
      status: 400,
    };
  }

  if (isVideoTarget && buffer.byteLength > maxVideoBytes) {
    return {
      error: `Video exceeds limit (${Math.round(maxVideoBytes / (1024 * 1024))}MB)`,
      status: 400,
    };
  }

  return {
    relativePath,
    mimeType,
    buffer,
    isImageTarget,
    isVideoTarget,
  };
}