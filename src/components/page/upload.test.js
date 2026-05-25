import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  isImageFile,
  isVideoFile,
  isAudioFile,
  isPdfFile,
  getFileExtension,
  buildVideoAttributes,
  buildImageAttributes,
  buildPictureSrcset,
} from './upload.js';

describe('upload', () => {
  describe('isImageFile', () => {
    it('returns true for image/jpeg', () => {
      assert.strictEqual(isImageFile({ type: 'image/jpeg' }), true);
    });

    it('returns true for image/png', () => {
      assert.strictEqual(isImageFile({ type: 'image/png' }), true);
    });

    it('returns true for image/webp', () => {
      assert.strictEqual(isImageFile({ type: 'image/webp' }), true);
    });

    it('returns false for video/mp4', () => {
      assert.strictEqual(isImageFile({ type: 'video/mp4' }), false);
    });

    it('returns false for text/plain', () => {
      assert.strictEqual(isImageFile({ type: 'text/plain' }), false);
    });
  });

  describe('isVideoFile', () => {
    it('returns true for video/mp4', () => {
      assert.strictEqual(isVideoFile({ type: 'video/mp4' }), true);
    });

    it('returns true for video/webm', () => {
      assert.strictEqual(isVideoFile({ type: 'video/webm' }), true);
    });

    it('returns false for image/png', () => {
      assert.strictEqual(isVideoFile({ type: 'image/png' }), false);
    });
  });

  describe('isAudioFile', () => {
    it('returns true for audio/mpeg', () => {
      assert.strictEqual(isAudioFile({ type: 'audio/mpeg' }), true);
    });

    it('returns true for audio/ogg', () => {
      assert.strictEqual(isAudioFile({ type: 'audio/ogg' }), true);
    });

    it('returns false for image/png', () => {
      assert.strictEqual(isAudioFile({ type: 'image/png' }), false);
    });
  });

  describe('isPdfFile', () => {
    it('returns true for application/pdf', () => {
      assert.strictEqual(isPdfFile({ type: 'application/pdf' }), true);
    });

    it('returns false for image/png', () => {
      assert.strictEqual(isPdfFile({ type: 'image/png' }), false);
    });
  });

  describe('getFileExtension', () => {
    it('extracts jpg', () => {
      assert.strictEqual(getFileExtension('photo.jpg'), 'jpg');
    });

    it('extracts png', () => {
      assert.strictEqual(getFileExtension('image.PNG'), 'png');
    });

    it('extracts extension after last dot', () => {
      assert.strictEqual(getFileExtension('file.name.png'), 'png');
    });

    it('returns empty string for no extension', () => {
      assert.strictEqual(getFileExtension('filename'), '');
    });

    it('returns empty string for dot-only filename', () => {
      assert.strictEqual(getFileExtension('filename.'), '');
    });
  });

  describe('buildVideoAttributes', () => {
    it('includes src attribute', () => {
      const result = buildVideoAttributes('video.mp4', {});
      assert.ok(result.includes('src="video.mp4"'));
    });

    it('includes autoplay when specified', () => {
      const result = buildVideoAttributes('video.mp4', { autoplay: true });
      assert.ok(result.includes('autoplay'));
    });

    it('includes muted when specified', () => {
      const result = buildVideoAttributes('video.mp4', { muted: true });
      assert.ok(result.includes('muted'));
    });

    it('includes loop when specified', () => {
      const result = buildVideoAttributes('video.mp4', { loop: true });
      assert.ok(result.includes('loop'));
    });

    it('includes controls when specified', () => {
      const result = buildVideoAttributes('video.mp4', { controls: true });
      assert.ok(result.includes('controls'));
    });

    it('includes poster when specified', () => {
      const result = buildVideoAttributes('video.mp4', { poster: 'poster.jpg' });
      assert.ok(result.includes('poster="poster.jpg"'));
    });
  });

  describe('buildImageAttributes', () => {
    it('includes src attribute', () => {
      const result = buildImageAttributes('image.jpg', {});
      assert.ok(result.includes('src="image.jpg"'));
    });

    it('includes alt attribute when specified', () => {
      const result = buildImageAttributes('image.jpg', { alt: 'A photo' });
      assert.ok(result.includes('alt="A photo"'));
    });

    it('includes width when specified', () => {
      const result = buildImageAttributes('image.jpg', { width: 800 });
      assert.ok(result.includes('width="800"'));
    });

    it('includes height when specified', () => {
      const result = buildImageAttributes('image.jpg', { height: 600 });
      assert.ok(result.includes('height="600"'));
    });

    it('includes loading when specified', () => {
      const result = buildImageAttributes('image.jpg', { loading: 'lazy' });
      assert.ok(result.includes('loading="lazy"'));
    });
  });

  describe('buildPictureSrcset', () => {
    it('builds srcset for multiple widths', () => {
      const result = buildPictureSrcset('image.jpg', [640, 1280, 1920]);
      assert.ok(result.includes('image-640.jpg 640w'));
      assert.ok(result.includes('image-1280.jpg 1280w'));
      assert.ok(result.includes('image-1920.jpg 1920w'));
    });

    it('handles png extension', () => {
      const result = buildPictureSrcset('photo.png', [800]);
      assert.ok(result.includes('photo-800.png 800w'));
    });

    it('handles webp extension', () => {
      const result = buildPictureSrcset('image.webp', [1024]);
      assert.ok(result.includes('image-1024.webp 1024w'));
    });

    it('comma-separates entries', () => {
      const result = buildPictureSrcset('image.jpg', [640, 1280]);
      const parts = result.split(', ');
      assert.strictEqual(parts.length, 2);
    });
  });
});