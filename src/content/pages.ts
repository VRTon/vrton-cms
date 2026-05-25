import { DEFAULT_LANGUAGE } from '../i18n/languages';
import type { PageContent, LanguageCode } from '../types';

const pageModules = import.meta.glob<PageContent>('../generated/pages/*.json', { eager: true });

const pageMap = new Map<string, PageContent>();
const slugSet = new Set<string>();
const FRONTMATTER_BLOCK_PATTERN = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
const BLOCKS_PATTERN = /```json blocks\s*([\s\S]*?)```/m;

Object.values(pageModules).forEach((moduleData) => {
  if (!moduleData || !moduleData.slug || !moduleData.lang) {
    return;
  }

  const key = `${moduleData.slug}::${moduleData.lang}`;
  pageMap.set(key, moduleData);
  slugSet.add(moduleData.slug);
});

function unquoteYamlValue(value: string): string {
  const trimmed = String(value || '').trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFrontmatter(markdown: string): { fields: Record<string, string>; body: string } {
  const source = String(markdown || '');
  const match = source.match(FRONTMATTER_BLOCK_PATTERN);
  const fields: Record<string, string> = {};
  let body = source;

  if (match) {
    body = source.slice(match[0].length);
    const lines = match[1].split('\n');
    for (const line of lines) {
      const keyValue = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
      if (!keyValue) {
        continue;
      }
      fields[keyValue[1]] = unquoteYamlValue(keyValue[2]);
    }
  }

  return { fields, body };
}

interface PreviewPayload {
  slug: string
  lang: LanguageCode
  meta: {
    title: string
    description: string
    status: string
    updatedAt: string
    kind: string
    seo: Record<string, string>
  }
  markdown: string
  blocks: unknown | null
}

// eslint-disable-next-line max-len
function parseAdminPreviewPayload(rawMarkdown: string, fallbackSlug: string, fallbackLang: LanguageCode): PreviewPayload {
  const { fields, body } = parseFrontmatter(rawMarkdown);
  const blocksMatch = String(body || '').match(BLOCKS_PATTERN);
  let blocks = null;
  let cleanedMarkdown = String(body || '').trim();

  if (blocksMatch) {
    try {
      blocks = JSON.parse(blocksMatch[1].trim());
      cleanedMarkdown = String(body || '').replace(BLOCKS_PATTERN, '').trim();
    } catch {
      blocks = null;
    }
  }

  return {
    slug: fields.slug || fallbackSlug,
    lang: fields.lang as LanguageCode || fallbackLang,
    meta: {
      title: fields.title || fallbackSlug,
      description: fields.description || '',
      status: fields.status || 'draft',
      updatedAt: fields.updatedAt || new Date().toISOString(),
      kind: fields.kind || 'page',
      seo: {},
    },
    markdown: cleanedMarkdown,
    blocks,
  };
}

function getAdminPreviewPageContent(slug: string, lang: LanguageCode): PageContent | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  if (!params.get('adminPreview')) {
    return null;
  }

  const previewFile = params.get('previewFile');
  if (!previewFile) {
    return null;
  }

  const storageKey = `vrton:admin-preview:${previewFile}`;
  const rawPayload = window.localStorage.getItem(storageKey);
  if (!rawPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawPayload) as { rawMarkdown?: string };
    const content = parseAdminPreviewPayload(parsed.rawMarkdown || '', slug, lang);
    if (content.slug !== slug || content.lang !== lang) {
      return null;
    }
    return content as PageContent;
  } catch {
    return null;
  }
}

export function getPageContent(slug: string, lang: LanguageCode): PageContent | null {
  const normalizedSlug = String(slug || '').trim();
  const normalizedLang = String(lang || DEFAULT_LANGUAGE).trim() as LanguageCode;
  if (!normalizedSlug) {
    return null;
  }

  const preview = getAdminPreviewPageContent(normalizedSlug, normalizedLang);
  if (preview) {
    return preview;
  }

  const direct = pageMap.get(`${normalizedSlug}::${normalizedLang}`);
  if (direct) {
    return direct;
  }

  const fallback = pageMap.get(`${normalizedSlug}::${DEFAULT_LANGUAGE}`);
  return fallback || null;
}

export function hasPageSlug(slug: string): boolean {
  return slugSet.has(String(slug || '').trim());
}