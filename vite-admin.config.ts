import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseAssetUploadPayload } from './src/utils/adminAssetApiValidation';
import { isMarkdownPathAllowed, isAssetPathAllowed } from './src/utils/adminPathSecurity';

const CONTENT_ROOT = resolve(__dirname, 'content');
const PUBLIC_ROOT = 'public';
const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_UPLOAD_BYTES = 120 * 1024 * 1024;
const execFileAsync = promisify(execFile);

const regenerateContent = async () => {
  await execFileAsync(process.execPath, ['scripts/generate-content.mjs'], {
    cwd: process.cwd(),
  });
};

const sendJson = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
};

const readBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
};

const listMarkdownFilesRecursive = async (root, relative = '') => {
  const current = path.resolve(root, relative);
  const entries = await fs.readdir(current, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const nextRelative = relative ? path.join(relative, entry.name) : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFilesRecursive(root, nextRelative)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(nextRelative.replace(/\\/g, '/'));
    }
  }

  return files;
};

const buildTemplate = (targetPath) => {
  const normalized = targetPath.replace(/\\/g, '/').replace(/^content\//, '');
  const parts = normalized.split('/');

  const now = new Date().toISOString();
  const lang = parts.at(-1)?.replace(/\.md$/, '') || 'es';

  if (parts[0] === 'i18n') {
    return `---\ntitle: "I18N ${lang.toUpperCase()}"\nslug: "i18n"\nlang: "${lang}"\nstatus: "draft"\nupdatedAt: "${now}"\n---\n\n\`\`\`json\n{}\n\`\`\`\n`;
  }

  const slug = parts[1] || 'new-page';
  return `---\ntitle: "${slug}"\nslug: "${slug}"\nlang: "${lang}"\nstatus: "draft"\nupdatedAt: "${now}"\nkind: "page"\n---\n\n# ${slug}\n\nWrite your markdown content here.\n`;
};

const createAdminApiPlugin = () => ({
  name: 'admin-local-api',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__admin/api/content/list', async (_req, res) => {
      try {
        const root = path.resolve(process.cwd(), CONTENT_ROOT);
        const files = (await listMarkdownFilesRecursive(root))
          .sort()
          .map((relativePath) => ({
            fileName: path.basename(relativePath),
            path: `${CONTENT_ROOT}/${relativePath}`,
            section: relativePath.split('/')[0],
          }));

        sendJson(res, 200, { files });
      } catch (error) {
        sendJson(res, 500, { error: error.message });
      }
    });

    server.middlewares.use('/__admin/api/content/file', async (req, res) => {
      try {
        const root = path.resolve(process.cwd(), CONTENT_ROOT);

        if (req.method === 'GET') {
          const queryUrl = new URL(req.url || '', 'http://localhost');
          const relativePath = queryUrl.searchParams.get('path');
          if (!relativePath) {
            sendJson(res, 400, { error: 'Missing query param: path' });
            return;
          }

          const absolutePath = path.resolve(process.cwd(), relativePath);
          if (!isMarkdownPathAllowed(absolutePath, root)) {
            sendJson(res, 403, { error: 'Invalid markdown path' });
            return;
          }

          const content = await fs.readFile(absolutePath, 'utf8');
          sendJson(res, 200, { content });
          return;
        }

        if (req.method === 'POST') {
          const body = await readBody(req);
          const absolutePath = path.resolve(process.cwd(), body.path || '');
          if (!isMarkdownPathAllowed(absolutePath, root)) {
            sendJson(res, 403, { error: 'Invalid markdown path' });
            return;
          }

          await fs.writeFile(absolutePath, body.content || '', 'utf8');
          sendJson(res, 200, { ok: true });
          return;
        }

        if (req.method === 'DELETE') {
          const body = await readBody(req);
          const absolutePath = path.resolve(process.cwd(), body.path || '');
          if (!isMarkdownPathAllowed(absolutePath, root)) {
            sendJson(res, 403, { error: 'Invalid markdown path' });
            return;
          }

          await fs.unlink(absolutePath);
          sendJson(res, 200, { ok: true });
          return;
        }

        sendJson(res, 405, { error: 'Method not allowed' });
      } catch (error) {
        sendJson(res, 500, { error: error.message });
      }
    });

    server.middlewares.use('/__admin/api/content/create', async (req, res) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed' });
        return;
      }

      try {
        const body = await readBody(req);
        const relativePath = String(body.path || '').trim().replace(/^\/+/, '');
        if (!relativePath) {
          sendJson(res, 400, { error: 'Missing path' });
          return;
        }

        const root = path.resolve(process.cwd(), CONTENT_ROOT);
        const absolutePath = path.resolve(process.cwd(), relativePath);
        if (!isMarkdownPathAllowed(absolutePath, root)) {
          sendJson(res, 403, { error: 'Invalid markdown path' });
          return;
        }

        await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        await fs.writeFile(absolutePath, buildTemplate(relativePath), { encoding: 'utf8', flag: 'wx' });

        sendJson(res, 201, { ok: true, path: relativePath });
      } catch (error) {
        if (error.code === 'EEXIST') {
          sendJson(res, 409, { error: 'File already exists' });
          return;
        }

        sendJson(res, 500, { error: error.message });
      }
    });

    server.middlewares.use('/__admin/api/assets/upload', async (req, res) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed' });
        return;
      }

      try {
        const body = await readBody(req);
        const parsed = parseAssetUploadPayload({
          body,
          maxImageBytes: MAX_IMAGE_UPLOAD_BYTES,
          maxVideoBytes: MAX_VIDEO_UPLOAD_BYTES,
        });
        if (parsed.error) {
          sendJson(res, parsed.status || 400, { error: parsed.error });
          return;
        }

        const { relativePath, buffer } = parsed;

        const publicRoot = path.resolve(process.cwd(), PUBLIC_ROOT);
        const absolutePath = path.resolve(publicRoot, relativePath);
        if (!isAssetPathAllowed(absolutePath, publicRoot)) {
          sendJson(res, 403, { error: 'Invalid asset path' });
          return;
        }

        await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        await fs.writeFile(absolutePath, buffer);

        sendJson(res, 201, { ok: true, publicPath: `/${relativePath.replace(/\\/g, '/')}` });
      } catch (error) {
        sendJson(res, 500, { error: error.message });
      }
    });

    server.middlewares.use('/__admin/api/content/regenerate', async (req, res) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed' });
        return;
      }

      try {
        await regenerateContent();
        sendJson(res, 200, { ok: true });
      } catch (error) {
        sendJson(res, 500, { error: error.message || 'Failed to regenerate content' });
      }
    });
  },
});

export default defineConfig({
  plugins: [
    react(),
    createAdminApiPlugin(),
  ],
  root: 'src',
  cacheDir: '../node_modules/.vite-admin',
  base: '/',
  publicDir: '../public',
  server: {
    port: 5174,
    strictPort: true,
  },
});
