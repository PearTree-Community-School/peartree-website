import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { OVERLAY_JS } from '@/lib/editor-overlay';

export const dynamic = 'force-dynamic';

const SITE = 'https://peartreecs.com';

/**
 * Same-origin proxy of the public site for the visual editor.
 *
 * A cross-origin iframe cannot be scripted, so the editor cannot annotate the
 * real site directly. Fetching it here and serving it from the admin's own
 * origin makes the document scriptable, which is what lets the overlay attach
 * to `data-cms-*` markers.
 *
 * Only signed-in staff can proxy — this must not become an open relay.
 */
export async function GET(req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  const user = await getSessionUser();
  if (!user) return new NextResponse('Not signed in', { status: 401 });

  const { path } = await ctx.params;
  const rel = (path ?? []).join('/');
  const upstream = `${SITE}/${rel}`;

  let res: Response;
  try {
    res = await fetch(upstream, { headers: { 'User-Agent': 'PearTree-Editor' }, redirect: 'follow' });
  } catch {
    return new NextResponse('Could not reach the site', { status: 502 });
  }

  const type = res.headers.get('content-type') ?? '';

  // Assets stream through untouched.
  if (!type.includes('text/html')) {
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: res.status,
      headers: { 'content-type': type, 'cache-control': 'public, max-age=300' },
    });
  }

  let html = await res.text();

  // Rewrite root-absolute URLs so navigation and assets stay inside the proxy.
  html = html
    .replace(/(href|src)="\/(?!\/)/g, '$1="/editor/view/')
    .replace(/url\(\/(?!\/)/g, 'url(/editor/view/');

  // <base> would otherwise fight the rewrite above.
  html = html.replace(/<base[^>]*>/gi, '');

  const inject = `<script>${OVERLAY_JS}</script>`;
  html = html.includes('</body>') ? html.replace('</body>', `${inject}</body>`) : html + inject;

  return new NextResponse(html, {
    status: res.status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}
