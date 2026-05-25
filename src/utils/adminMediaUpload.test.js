import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_VIDEO_UPLOAD_BYTES,
  sanitizeAssetBaseName,
  toMegabytesText,
  assertUploadFileOrThrow,
} from './adminMediaUpload.js';

function fakeFile({ type, size }) {
  return { type, size };
}

test('sanitizeAssetBaseName normalizes accents and symbols', () => {
  assert.equal(sanitizeAssetBaseName('Mi Foto Ñ 2026!!.PNG'), 'mi-foto-n-2026-.png');
  assert.equal(sanitizeAssetBaseName('  ----hello___world---- '), 'hello___world');
});

test('toMegabytesText rounds as expected', () => {
  assert.equal(toMegabytesText(10 * 1024 * 1024), '10MB');
  assert.equal(toMegabytesText(119.6 * 1024 * 1024), '120MB');
});

test('assertUploadFileOrThrow validates image rules', () => {
  assert.doesNotThrow(() => assertUploadFileOrThrow(fakeFile({ type: 'image/jpeg', size: MAX_IMAGE_UPLOAD_BYTES }), 'images'));
  assert.throws(
    () => assertUploadFileOrThrow(fakeFile({ type: 'video/mp4', size: 1000 }), 'images'),
    /Only image files are allowed/,
  );
  assert.throws(
    () => assertUploadFileOrThrow(fakeFile({ type: 'image/png', size: MAX_IMAGE_UPLOAD_BYTES + 1 }), 'images'),
    /Image exceeds limit/,
  );
});

test('assertUploadFileOrThrow validates video rules', () => {
  assert.doesNotThrow(() => assertUploadFileOrThrow(fakeFile({ type: 'video/mp4', size: MAX_VIDEO_UPLOAD_BYTES }), 'videos'));
  assert.throws(
    () => assertUploadFileOrThrow(fakeFile({ type: 'image/png', size: 1000 }), 'videos'),
    /Only video files are allowed/,
  );
  assert.throws(
    () => assertUploadFileOrThrow(fakeFile({ type: 'video/webm', size: MAX_VIDEO_UPLOAD_BYTES + 1 }), 'videos'),
    /Video exceeds limit/,
  );
});

test('assertUploadFileOrThrow rejects unknown kind and missing file', () => {
  assert.throws(() => assertUploadFileOrThrow(null, 'images'), /Missing file/);
  assert.throws(() => assertUploadFileOrThrow(fakeFile({ type: 'text/plain', size: 10 }), 'docs'), /Unsupported upload kind/);
});
