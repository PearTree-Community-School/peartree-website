import { NextResponse, type NextRequest } from 'next/server';

/**
 * Payload ships its own email/password login, but this app authenticates
 * through WorkOS. Anyone landing on Payload's form is stuck — it cannot log
 * them in and offers no way forward. Send them to the real sign-in instead.
 */
export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  if (url.pathname === '/admin/logout') {
    url.pathname = '/auth/sign-out';
    return NextResponse.redirect(url);
  }
  url.pathname = '/auth/sign-in';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/login', '/admin/logout', '/admin/create-first-user', '/admin/forgot'],
};
