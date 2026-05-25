import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAssetUploadPayload } from './adminAssetApiValidation.js';

const LIMITS = {
  maxImageBytes: 10 * 1024 * 1024,
  maxVideoBytes: 120 * 1024 * 1024,
};

function makeDataUrl(mime, text) {
  return `data:${mime};base64,${Buffer.from(text, 'utf8').toString('base64')}`;
}

test('rejects missing path or invalid data url', () => {
  const one = parseAssetUploadPayload({ body: { path: '', dataUrl: '' }, ...LIMITS });
  assert.equal(one.status, 400);
  assert.match(one.error, /Missing asset path/);

  const two = parseAssetUploadPayload({ body: { path: 'uploads/images/a.png', dataUrl: 'abc' }, ...LIMITS });
  assert.equal(two.status, 400);
  assert.match(two.error, /Missing asset path/);
});

test('rejects non-base64 payloads', () => {
  const result = parseAssetUploadPayload({
    body: { path: 'uploads/images/a.png', dataUrl: 'data:image/png;utf8,abc' },
    ...LIMITS,
  });
  assert.equal(result.status, 400);
  assert.match(result.error, /Only base64 dataUrl/);
});

test('validates mime type by uploads folder', () => {
  const imageWrong = parseAssetUploadPayload({
    body: { path: 'uploads/images/a.png', dataUrl: makeDataUrl('video/mp4', '123') },
    ...LIMITS,
  });
  assert.equal(imageWrong.status, 400);
  assert.match(imageWrong.error, /Invalid image mime type/);

  const videoWrong = parseAssetUploadPayload({
    body: { path: 'uploads/videos/a.mp4', dataUrl: makeDataUrl('image/png', '123') },
    ...LIMITS,
  });
  assert.equal(videoWrong.status, 400);
  assert.match(videoWrong.error, /Invalid video mime type/);
});

test('accepts valid image payload and normalizes path', () => {
  const result = parseAssetUploadPayload({
    body: { path: '/uploads/images/a.png', dataUrl: makeDataUrl('image/png', 'hello') },
    ...LIMITS,
  });
  assert.ok(!result.error);
  assert.equal(result.relativePath, 'uploads/images/a.png');
  assert.equal(result.isImageTarget, true);
  assert.equal(result.isVideoTarget, false);
  assert.equal(result.mimeType, 'image/png');
  assert.equal(Buffer.isBuffer(result.buffer), true);
});

test('enforces upload size limits', () => {
  const imageLimit = parseAssetUploadPayload({
    body: { path: 'uploads/images/a.png', dataUrl: `data:image/png;base64,${Buffer.alloc(LIMITS.maxImageBytes + 1).toString('base64')}` },
    ...LIMITS,
  });
  assert.equal(imageLimit.status, 400);
  assert.match(imageLimit.error, /Image exceeds limit/);

  const videoLimit = parseAssetUploadPayload({
    body: { path: 'uploads/videos/a.mp4', dataUrl: `data:video/mp4;base64,${Buffer.alloc(LIMITS.maxVideoBytes + 1).toString('base64')}` },
    ...LIMITS,
  });
  assert.equal(videoLimit.status, 400);
  assert.match(videoLimit.error, /Video exceeds limit/);
});
