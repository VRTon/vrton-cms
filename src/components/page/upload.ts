export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function uploadAssetWithProgress(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ src: string; filename: string; filesize: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
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

    xhr.onerror = () => reject(new Error('Network error'));

    xhr.open('POST', '/__admin/api/assets');
    xhr.send(formData);
  });
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

export function isAudioFile(file: File): boolean {
  return file.type.startsWith('audio/');
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf';
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

export function buildVideoAttributes(
  src: string,
  options: { autoplay?: boolean; muted?: boolean; loop?: boolean; controls?: boolean; poster?: string },
): string {
  const attrs: string[] = [];
  if (options.autoplay) attrs.push('autoplay');
  if (options.muted) attrs.push('muted');
  if (options.loop) attrs.push('loop');
  if (options.controls) attrs.push('controls');
  attrs.push(`src="${src}"`);
  if (options.poster) attrs.push(`poster="${options.poster}"`);
  return attrs.join(' ');
}

export function buildImageAttributes(
  src: string,
  options: { alt?: string; width?: number; height?: number; loading?: string },
): string {
  const attrs: string[] = [];
  attrs.push(`src="${src}"`);
  if (options.alt) attrs.push(`alt="${options.alt}"`);
  if (options.width) attrs.push(`width="${options.width}"`);
  if (options.height) attrs.push(`height="${options.height}"`);
  if (options.loading) attrs.push(`loading="${options.loading}"`);
  return attrs.join(' ');
}

export function buildPictureSrcset(src: string, widths: number[]): string {
  return widths.map((w) => {
    const ext = getFileExtension(src);
    const base = src.replace(`.${ext}`, '');
    return `${base}-${w}.${ext} ${w}w`;
  }).join(', ');
}

export async function optimizeImageForUpload(file: File): Promise<File> {
  const type = String(file.type || '').toLowerCase();
  if (!type.startsWith('image/') || type === 'image/svg+xml' || type === 'image/gif') {
    return file;
  }

  const dataUrl = await fileToDataUrl(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Unable to process image'));
    img.src = dataUrl;
  });

  const maxSide = 1920;
  const scale = Math.min(1, maxSide / Math.max(image.width || 1, image.height || 1));
  const targetWidth = Math.max(1, Math.round((image.width || 1) * scale));
  const targetHeight = Math.max(1, Math.round((image.height || 1) * scale));
  if (scale >= 1 && type === 'image/webp' && file.size <= 2 * 1024 * 1024) {
    return file;
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext('2d');
  if (!context) {
    return file;
  }
  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const requestedMime = 'image/webp';
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, requestedMime, 0.84));
  if (!blob) {
    return file;
  }

  const actualMime = String(blob.type || '').toLowerCase();
  if (!actualMime.startsWith('image/')) {
    return file;
  }

  if (scale >= 1 && blob.size >= file.size) {
    return file;
  }

  const extension = actualMime === 'image/webp' ? 'webp' : (actualMime === 'image/png' ? 'png' : 'jpg');
  const fileName = file.name.replace(/\.[^/.]+$/, `.${extension}`);
  return new File([blob], fileName, { type: actualMime });
}
