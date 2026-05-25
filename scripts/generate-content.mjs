import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'

const rootDir = process.cwd()
const i18nContentDir = path.join(rootDir, 'content', 'i18n')
const pagesContentDir = path.join(rootDir, 'content', 'pages')

const srcI18nOutDir = path.join(rootDir, 'src', 'generated', 'i18n')
const srcPagesOutDir = path.join(rootDir, 'src', 'generated', 'pages')

const apiI18nOutDir = path.join(rootDir, 'public', 'api', 'i18n')
const apiPagesOutDir = path.join(rootDir, 'public', 'api', 'pages')
const enabledLanguages = new Set(['en', 'es'])

const jsonBlockPattern = /```json\s*([\s\S]*?)```/i
const blocksJsonPattern = /```json\s+blocks\s*([\s\S]*?)```/i

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true })
}

async function emptyDirectory(dirPath) {
  await ensureDir(dirPath)
  const entries = await fs.readdir(dirPath)
  await Promise.all(entries.map((entry) => fs.rm(path.join(dirPath, entry), { recursive: true, force: true })))
}

function parseTranslationFromMarkdown(markdownText, filePath) {
  const parsed = matter(markdownText)
  const match = parsed.content.match(jsonBlockPattern)

  if (!match) {
    throw new Error(`Missing JSON block in markdown: ${filePath}`)
  }

  let translation
  try {
    translation = JSON.parse(match[1].trim())
  } catch (error) {
    throw new Error(`Invalid JSON block in ${filePath}: ${error.message}`)
  }

  const lang = parsed.data.lang
  if (!lang || typeof lang !== 'string') {
    throw new Error(`Missing frontmatter 'lang' in: ${filePath}`)
  }

  return {
    lang,
    meta: {
      title: parsed.data.title || `I18N ${lang.toUpperCase()}`,
      slug: parsed.data.slug || 'i18n',
      status: parsed.data.status || 'published',
      updatedAt: parsed.data.updatedAt || new Date().toISOString(),
    },
    translation,
  }
}

function parsePageFromMarkdown(markdownText, filePath) {
  const parsed = matter(markdownText)
  const lang = parsed.data.lang
  const slug = parsed.data.slug

  if (!lang || typeof lang !== 'string') {
    throw new Error(`Missing frontmatter 'lang' in: ${filePath}`)
  }

  if (!slug || typeof slug !== 'string') {
    throw new Error(`Missing frontmatter 'slug' in: ${filePath}`)
  }

  const blocksMatch = parsed.content.match(blocksJsonPattern)
  let blocks = null
  let cleanedMarkdown = parsed.content.trim()

  if (blocksMatch) {
    try {
      blocks = JSON.parse(blocksMatch[1].trim())
    } catch (error) {
      throw new Error(`Invalid blocks JSON in ${filePath}: ${error.message}`)
    }
    cleanedMarkdown = parsed.content.replace(blocksJsonPattern, '').trim()
  }

  return {
    slug,
    lang,
    meta: {
      title: parsed.data.title || slug,
      description: parsed.data.description || '',
      status: parsed.data.status || 'published',
      updatedAt: parsed.data.updatedAt || new Date().toISOString(),
      kind: parsed.data.kind || 'page',
      seo: parsed.data.seo || {},
    },
    markdown: cleanedMarkdown,
    blocks,
  }
}

async function listMarkdownFilesRecursive(rootDirPath, relative = '') {
  const currentPath = path.join(rootDirPath, relative)
  const entries = await fs.readdir(currentPath, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const nextRelative = relative ? path.join(relative, entry.name) : entry.name
    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFilesRecursive(rootDirPath, nextRelative)))
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(nextRelative)
    }
  }

  return files
}

async function generateI18n() {
  await emptyDirectory(srcI18nOutDir)
  await emptyDirectory(apiI18nOutDir)

  const files = (await fs.readdir(i18nContentDir)).filter((entry) => entry.endsWith('.md'))
  const index = []

  for (const fileName of files) {
    const filePath = path.join(i18nContentDir, fileName)
    const markdownText = await fs.readFile(filePath, 'utf8')
    const parsed = parseTranslationFromMarkdown(markdownText, filePath)
    if (!enabledLanguages.has(parsed.lang)) {
      continue
    }

    const outputPayload = {
      lang: parsed.lang,
      meta: parsed.meta,
      translation: parsed.translation,
    }

    const outputJson = `${JSON.stringify(outputPayload, null, 2)}\n`

    await fs.writeFile(path.join(srcI18nOutDir, `${parsed.lang}.json`), outputJson, 'utf8')
    await fs.writeFile(path.join(apiI18nOutDir, `${parsed.lang}.json`), outputJson, 'utf8')

    index.push({
      lang: parsed.lang,
      title: parsed.meta.title,
      status: parsed.meta.status,
      updatedAt: parsed.meta.updatedAt,
      url: `/api/i18n/${parsed.lang}.json`,
    })
  }

  index.sort((a, b) => a.lang.localeCompare(b.lang))
  const indexJson = `${JSON.stringify({ languages: index }, null, 2)}\n`
  await fs.writeFile(path.join(srcI18nOutDir, 'index.json'), indexJson, 'utf8')
  await fs.writeFile(path.join(apiI18nOutDir, 'index.json'), indexJson, 'utf8')

  return index.length
}

async function generatePages() {
  await emptyDirectory(srcPagesOutDir)
  await emptyDirectory(apiPagesOutDir)

  const pageFiles = await listMarkdownFilesRecursive(pagesContentDir)
  const pages = []

  for (const relativeFile of pageFiles) {
    const filePath = path.join(pagesContentDir, relativeFile)
    const markdownText = await fs.readFile(filePath, 'utf8')
    const parsed = parsePageFromMarkdown(markdownText, filePath)
    if (!enabledLanguages.has(parsed.lang)) {
      continue
    }

    if (parsed.slug === 'not-found') {
      continue
    }

    const payload = {
      slug: parsed.slug,
      lang: parsed.lang,
      meta: parsed.meta,
      markdown: parsed.markdown,
      blocks: parsed.blocks,
    }

    const fileName = `${parsed.slug}.${parsed.lang}.json`
    const json = `${JSON.stringify(payload, null, 2)}\n`

    await fs.writeFile(path.join(srcPagesOutDir, fileName), json, 'utf8')
    await fs.writeFile(path.join(apiPagesOutDir, fileName), json, 'utf8')

    pages.push({
      slug: parsed.slug,
      lang: parsed.lang,
      title: parsed.meta.title,
      status: parsed.meta.status,
      updatedAt: parsed.meta.updatedAt,
      url: `/api/pages/${fileName}`,
    })
  }

  pages.sort((a, b) => `${a.slug}.${a.lang}`.localeCompare(`${b.slug}.${b.lang}`))
  const groupedBySlug = pages.reduce((acc, page) => {
    if (!acc[page.slug]) {
      acc[page.slug] = []
    }
    acc[page.slug].push(page)
    return acc
  }, {})

  const indexPayload = {
    pages,
    slugs: groupedBySlug,
  }

  const indexJson = `${JSON.stringify(indexPayload, null, 2)}\n`
  await fs.writeFile(path.join(srcPagesOutDir, 'index.json'), indexJson, 'utf8')
  await fs.writeFile(path.join(apiPagesOutDir, 'index.json'), indexJson, 'utf8')

  return pages.length
}

async function generate() {
  const i18nCount = await generateI18n()
  const pageCount = await generatePages()
  console.log(`Generated ${i18nCount} i18n payloads and ${pageCount} page payloads`) 
}

generate().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
