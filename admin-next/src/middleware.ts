import { NextResponse, type NextRequest } from 'next/server';

/**
 * Redirect bare /admin → /admin/collections/testimonials.
 *
 * Payload's default dashboard renders blank without CollectionCards registered
 * in the importMap, and our hand-maintained importMap is empty (see STATUS.md).
 * Until generate:importmap CLI is resolved, redirect to a working list view.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/admin' || pathname === '/admin/') {
    const url = req.nextUrl.clone();
    url.pathname = '/admin/collections/testimonials';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/'],
};
