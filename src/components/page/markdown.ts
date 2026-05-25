import { createDefaultBlock } from './blocks';

export const BLOCKS_PATTERN = /```json blocks\s*([\s\S]*?)```/m;
export const FRONTMATTER_PATTERN = /^---\s*\n[\s\S]*?\n---\s*/;
export const FRONTMATTER_BLOCK_PATTERN = /^---\n([\s\S]*?)\n---/;

export interface ExtractBlocksResult {
  blocks: unknown[] | null
  error: string
}

export function extractBlocks(markdown: string): ExtractBlocksResult {
  const match = markdown.match(BLOCKS_PATTERN);
  if (!match) {
    return { blocks: null, error: '' };
  }

  try {
    return { blocks: JSON.parse(match[1].trim()), error: '' };
  } catch (error) {
    return { blocks: [], error: `Invalid blocks JSON: ${(error as Error).message}` };
  }
}

export function injectBlocks(markdown: string, blocks: unknown[]): string {
  const serialized = `\`\`\`json blocks\n${JSON.stringify(blocks, null, 2)}\n\`\`\``;
  if (BLOCKS_PATTERN.test(markdown)) {
    return markdown.replace(BLOCKS_PATTERN, serialized);
  }
  return `${markdown.trimEnd()}\n\n${serialized}\n`;
}

export function stripFrontmatter(markdown: string): string {
  return String(markdown || '').replace(FRONTMATTER_PATTERN, '').trim();
}

export function unquoteYamlValue(value: string): string {
  const trimmed = String(value || '').trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function extractFrontmatterFields(markdown: string): { title: string; description: string } {
  const match = String(markdown || '').match(FRONTMATTER_BLOCK_PATTERN);
  if (!match) {
    return { title: '', description: '' };
  }

  const lines = match[1].split('\n');
  let title = '';
  let description = '';

  for (const line of lines) {
    const keyValue = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!keyValue) {
      continue;
    }
    const key = keyValue[1];
    const value = unquoteYamlValue(keyValue[2]);
    if (key === 'title') {
      title = value;
    }
    if (key === 'description') {
      description = value;
    }
  }

  return { title, description };
}

export function injectFrontmatterField(markdown: string, key: string, value: string): string {
  const source = String(markdown || '');
  const serializedValue = JSON.stringify(String(value || ''));
  const match = source.match(FRONTMATTER_BLOCK_PATTERN);

  if (!match) {
    return `---\n${key}: ${serializedValue}\n---\n\n${source.trimStart()}`;
  }

  const frontmatter = match[1];
  const body = source.slice(match[0].length);
  const lines = frontmatter.split('\n');
  let replaced = false;

  const nextLines = lines.map((line) => {
    if (line.match(new RegExp(`^${key}:\\s*`))) {
      replaced = true;
      return `${key}: ${serializedValue}`;
    }
    return line;
  });

  if (!replaced) {
    nextLines.push(`${key}: ${serializedValue}`);
  }

  return `---\n${nextLines.join('\n')}\n---\n\n${body}`;
}

export function deriveBlocksFromMarkdown(markdown: string): unknown[] {
  const content = stripFrontmatter(markdown).replace(BLOCKS_PATTERN, '').trim();
  if (!content) {
    return [];
  }

  const lines = content.split('\n');
  const blocks: unknown[] = [];
  let buffer: string[] = [];

  const flushText = () => {
    const text = buffer.join('\n').trim();
    if (text) {
      const textBlock = createDefaultBlock('text');
      textBlock.markdown = text;
      blocks.push(textBlock);
    }
    buffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushText();
      const level = heading[1].length;
      const text = heading[2].trim();
      const headingBlock = createDefaultBlock('heading');
      (headingBlock as { level?: number }).level = level;
      (headingBlock as { text?: string }).text = text;
      blocks.push(headingBlock);
      continue;
    }

    buffer.push(rawLine);
  }

  flushText();
  return blocks;
}

export function extractI18nObject(markdown: string): { data: unknown; error: string } {
  const I18N_JSON_PATTERN = /```json\s*([\s\S]*?)```/m;
  const match = markdown.match(I18N_JSON_PATTERN);
  if (!match) {
    return { data: null, error: 'Missing i18n JSON block' };
  }

  try {
    return { data: JSON.parse(match[1].trim()), error: '' };
  } catch (error) {
    return { data: null, error: `Invalid i18n JSON: ${(error as Error).message}` };
  }
}

export function injectI18nObject(markdown: string, obj: unknown): string {
  const I18N_JSON_PATTERN = /```json\s*([\s\S]*?)```/m;
  const serialized = `\`\`\`json\n${JSON.stringify(obj, null, 2)}\n\`\`\``;
  if (I18N_JSON_PATTERN.test(markdown)) {
    return markdown.replace(I18N_JSON_PATTERN, serialized);
  }
  return `${markdown.trimEnd()}\n\n${serialized}\n`;
}