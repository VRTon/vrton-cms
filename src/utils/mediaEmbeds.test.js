import test from 'node:test';
import assert from 'node:assert/strict';
import { getYouTubeEmbedUrl } from './mediaEmbeds.js';

test('returns empty for empty and invalid values', () => {
  assert.equal(getYouTubeEmbedUrl(''), '');
  assert.equal(getYouTubeEmbedUrl('not-an-url'), '');
  assert.equal(getYouTubeEmbedUrl('https://example.com/watch?v=abc123xyz89'), '');
});

test('supports raw YouTube video id', () => {
  assert.equal(getYouTubeEmbedUrl('dQw4w9WgXcQ'), 'https://www.youtube.com/embed/dQw4w9WgXcQ');
});

test('supports youtube watch url', () => {
  assert.equal(getYouTubeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'https://www.youtube.com/embed/dQw4w9WgXcQ');
  assert.equal(getYouTubeEmbedUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ'), 'https://www.youtube.com/embed/dQw4w9WgXcQ');
});

test('supports youtu.be, embed and shorts urls', () => {
  assert.equal(getYouTubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ'), 'https://www.youtube.com/embed/dQw4w9WgXcQ');
  assert.equal(getYouTubeEmbedUrl('https://www.youtube.com/embed/dQw4w9WgXcQ'), 'https://www.youtube.com/embed/dQw4w9WgXcQ');
  assert.equal(getYouTubeEmbedUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'https://www.youtube.com/embed/dQw4w9WgXcQ');
});
