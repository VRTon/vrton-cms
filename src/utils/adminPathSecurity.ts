import path from 'node:path';

export function isMarkdownPathAllowed(absolutePath: string, rootPath: string): boolean {
  const normalizedRoot = path.resolve(rootPath);
  const normalizedTarget = path.resolve(absolutePath);
  return normalizedTarget.startsWith(normalizedRoot) && normalizedTarget.endsWith('.md');
}

export function isAssetPathAllowed(absolutePath: string, rootPath: string): boolean {
  const normalizedRoot = path.resolve(rootPath);
  const normalizedTarget = path.resolve(absolutePath);
  return normalizedTarget.startsWith(normalizedRoot);
}