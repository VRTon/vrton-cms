import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  BLOCKS_PATTERN,
  FRONTMATTER_PATTERN,
  FRONTMATTER_BLOCK_PATTERN,
  extractBlocks,
  injectBlocks,
  stripFrontmatter,
  unquoteYamlValue,
  extractFrontmatterFields,
  injectFrontmatterField,
  deriveBlocksFromMarkdown,
} from './markdown.js';

describe('markdown', () => {
  describe('BLOCKS_PATTERN', () => {
    it('matches json blocks code fence', () => {
      const content = '```json blocks\n[{"type":"text"}]\n```';
      const match = content.match(BLOCKS_PATTERN);
      assert.ok(match);
    });

    it('does not match plain json', () => {
      const content = '{"type":"text"}';
      const match = content.match(BLOCKS_PATTERN);
      assert.strictEqual(match, null);
    });
  });

  describe('FRONTMATTER_PATTERN', () => {
    it('matches standard frontmatter', () => {
      const content = '---\ntitle: Hello\n---\n\nContent';
      const match = content.match(FRONTMATTER_PATTERN);
      assert.ok(match);
    });

    it('does not match content without frontmatter', () => {
      const content = 'Just content';
      const match = content.match(FRONTMATTER_PATTERN);
      assert.strictEqual(match, null);
    });
  });

  describe('extractBlocks', () => {
    it('extracts blocks from markdown with blocks', () => {
      const markdown = 'Some content\n```json blocks\n[{"type":"text","markdown":"hello"}]\n```';
      const result = extractBlocks(markdown);
      assert.deepStrictEqual(result.blocks, [{ type: 'text', markdown: 'hello' }]);
      assert.strictEqual(result.error, '');
    });

    it('returns null blocks when no blocks found', () => {
      const markdown = 'Just plain content';
      const result = extractBlocks(markdown);
      assert.strictEqual(result.blocks, null);
      assert.strictEqual(result.error, '');
    });

    it('returns error for invalid JSON', () => {
      const markdown = '```json blocks\nnot valid json\n```';
      const result = extractBlocks(markdown);
      assert.deepStrictEqual(result.blocks, []);
      assert.ok(result.error.includes('Invalid blocks JSON'));
    });
  });

  describe('injectBlocks', () => {
    it('replaces existing blocks', () => {
      const markdown = '```json blocks\n[{"type":"old"}]\n```';
      const result = injectBlocks(markdown, [{ type: 'new' }]);
      assert.ok(result.includes('"type":"new"'));
      assert.ok(!result.includes('"type":"old"'));
    });

    it('appends blocks to content without blocks', () => {
      const markdown = 'Some content';
      const result = injectBlocks(markdown, [{ type: 'block' }]);
      assert.ok(result.includes('```json blocks'));
      assert.ok(result.includes('"type":"block"'));
    });

    it('preserves content before blocks', () => {
      const markdown = 'Header\n```json blocks\n[]\n```';
      const result = injectBlocks(markdown, [{ type: 'block' }]);
      assert.ok(result.startsWith('Header'));
    });
  });

  describe('stripFrontmatter', () => {
    it('removes frontmatter', () => {
      const markdown = '---\ntitle: Hello\n---\n\nContent';
      const result = stripFrontmatter(markdown);
      assert.strictEqual(result, 'Content');
    });

    it('trims result', () => {
      const markdown = '---\ntitle: Hello\n---\n\n\nContent';
      const result = stripFrontmatter(markdown);
      assert.strictEqual(result, 'Content');
    });

    it('returns original when no frontmatter', () => {
      const markdown = 'Just content';
      const result = stripFrontmatter(markdown);
      assert.strictEqual(result, 'Just content');
    });
  });

  describe('unquoteYamlValue', () => {
    it('removes double quotes', () => {
      assert.strictEqual(unquoteYamlValue('"Hello World"'), 'Hello World');
    });

    it('removes single quotes', () => {
      assert.strictEqual(unquoteYamlValue("'Hello World'"), 'Hello World');
    });

    it('returns unchanged string without quotes', () => {
      assert.strictEqual(unquoteYamlValue('Hello World'), 'Hello World');
    });

    it('trims whitespace', () => {
      assert.strictEqual(unquoteYamlValue('  Hello  '), 'Hello');
    });
  });

  describe('extractFrontmatterFields', () => {
    it('extracts title', () => {
      const markdown = '---\ntitle: My Title\ndescription: Desc\n---\n\nContent';
      const result = extractFrontmatterFields(markdown);
      assert.strictEqual(result.title, 'My Title');
    });

    it('extracts description', () => {
      const markdown = '---\ntitle: My Title\ndescription: My Description\n---\n\nContent';
      const result = extractFrontmatterFields(markdown);
      assert.strictEqual(result.description, 'My Description');
    });

    it('unquotes values', () => {
      const markdown = '---\ntitle: "My Title"\n---\n\nContent';
      const result = extractFrontmatterFields(markdown);
      assert.strictEqual(result.title, 'My Title');
    });

    it('returns empty strings when no frontmatter', () => {
      const markdown = 'Just content';
      const result = extractFrontmatterFields(markdown);
      assert.strictEqual(result.title, '');
      assert.strictEqual(result.description, '');
    });
  });

  describe('injectFrontmatterField', () => {
    it('adds field when no frontmatter exists', () => {
      const markdown = 'Content';
      const result = injectFrontmatterField(markdown, 'title', 'My Title');
      assert.ok(result.includes('title: "My Title"'));
      assert.ok(result.includes('---'));
    });

    it('updates existing field', () => {
      const markdown = '---\ntitle: Old\n---\n\nContent';
      const result = injectFrontmatterField(markdown, 'title', 'New');
      assert.ok(result.includes('title: "New"'));
      assert.ok(!result.includes('Old'));
    });

    it('adds new field to existing frontmatter', () => {
      const markdown = '---\ntitle: My Title\n---\n\nContent';
      const result = injectFrontmatterField(markdown, 'description', 'New Desc');
      assert.ok(result.includes('description: "New Desc"'));
    });
  });

  describe('deriveBlocksFromMarkdown', () => {
    it('creates text block from plain paragraphs', () => {
      const markdown = 'Some plain text content';
      const result = deriveBlocksFromMarkdown(markdown);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].type, 'text');
      assert.ok(result[0].markdown.includes('Some plain text'));
    });

    it('creates heading blocks for headings', () => {
      const markdown = '# Heading One\n\n## Heading Two';
      const result = deriveBlocksFromMarkdown(markdown);
      const headings = result.filter((b) => b.type === 'heading');
      assert.strictEqual(headings.length, 2);
      assert.strictEqual(headings[0].level, 1);
      assert.strictEqual(headings[1].level, 2);
    });

    it('returns empty array for empty content', () => {
      const markdown = '';
      const result = deriveBlocksFromMarkdown(markdown);
      assert.deepStrictEqual(result, []);
    });

    it('strips frontmatter before processing', () => {
      const markdown = '---\ntitle: Hello\n---\n\nParagraph text';
      const result = deriveBlocksFromMarkdown(markdown);
      assert.strictEqual(result[0].type, 'text');
    });

    it('removes blocks JSON before processing', () => {
      const markdown = 'Paragraph\n```json blocks\n[{"type":"text"}]\n```';
      const result = deriveBlocksFromMarkdown(markdown);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].type, 'text');
    });

    it('groups consecutive text lines', () => {
      const markdown = 'Line one\nLine two\nLine three';
      const result = deriveBlocksFromMarkdown(markdown);
      const texts = result.filter((b) => b.type === 'text');
      assert.ok(texts[0].markdown.includes('Line one'));
      assert.ok(texts[0].markdown.includes('Line three'));
    });
  });
});