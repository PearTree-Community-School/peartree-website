import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { Context } from 'hono';

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

function resolveFile(rootDir: string, urlPath: string): string | null {
  const decoded = decodeURIComponent(urlPath);
  const safe = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const base = path.resolve(rootDir);
  const candidates = safe.endsWith('/')
    ? [path.join(base, safe, 'index.html')]
    : [path.join(base, safe), path.join(base, safe, 'index.html')];
  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (!resolved.startsWith(base + path.sep) && resolved !== base) continue;
    if (existsSync(resolved) && statSync(resolved).isFile()) return resolved;
  }
  return null;
}

/**
 * Serves the built Astro site (dist-app) from the admin process.
 * HTML is never cached (content edits should show up on refresh);
 * hashed assets under /_astro get long-lived immutable caching.
 */
export function serveSiteFile(c: Context, rootDir: string): Response | null {
  const urlPath = new URL(c.req.url).pathname;
  const filePath = resolveFile(rootDir, urlPath === '/' ? '/index.html' : urlPath);
  if (!filePath) return null;
  const ext = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream';
  const cacheControl =
    ext === '.html'
      ? 'no-cache'
      : urlPath.startsWith('/_astro/')
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=300';
  const size = statSync(filePath).size;
  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  return new Response(stream, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(size),
      'Cache-Control': cacheControl,
    },
  });
}
