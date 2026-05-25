import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { isMarkdownPathAllowed, isAssetPathAllowed } from './adminPathSecurity.js';

test('isMarkdownPathAllowed accepts .md inside root', () => {
  const root = '/repo/content';
  const file = '/repo/content/pages/home/es.md';
  assert.equal(isMarkdownPathAllowed(file, root), true);
});

test('isMarkdownPathAllowed rejects non-md and traversal/outside root', () => {
  const root = '/repo/content';
  assert.equal(isMarkdownPathAllowed('/repo/content/pages/home/es.txt', root), false);
  assert.equal(isMarkdownPathAllowed('/repo/content/../secrets.md', root), false);
  assert.equal(isMarkdownPathAllowed('/repo/other/file.md', root), false);
});

test('isAssetPathAllowed accepts files inside public root', () => {
  const root = '/repo/public';
  assert.equal(isAssetPathAllowed('/repo/public/uploads/images/a.png', root), true);
  assert.equal(isAssetPathAllowed('/repo/public/uploads/videos/a.mp4', root), true);
});

test('isAssetPathAllowed rejects traversal/outside root', () => {
  const root = '/repo/public';
  const escaped = path.resolve('/repo/public', '../secret.txt');
  assert.equal(isAssetPathAllowed(escaped, root), false);
  assert.equal(isAssetPathAllowed('/repo/content/pages/home/es.md', root), false);
});
