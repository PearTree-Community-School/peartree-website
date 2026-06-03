import { getPayload } from 'payload';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import config from '@payload-config';
import { getEnv } from '@/lib/env';
import { getWorkOS, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/workos';
import { provisionFromCallback } from '@/lib/provision';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  if (!code) {
    return new NextResponse('Missing WorkOS authorization code', { status: 400 });
  }
  const env = getEnv();
  let result;
  try {
    result = await getWorkOS().userManagement.authenticateWithCode({
      code,
      clientId: env.WORKOS_CLIENT_ID,
      session: { sealSession: true, cookiePassword: env.WORKOS_COOKIE_PASSWORD },
    });
  } catch (err) {
    console.error('[auth/callback] authenticateWithCode failed:', err);
    return new NextResponse(
      `Authentication failed: ${err instanceof Error ? err.message : String(err)}`,
      { status: 401 },
    );
  }
  const payload = await getPayload({ config });
  await provisionFromCallback(payload, {
    id: result.user.id,
    email: result.user.email,
    firstName: result.user.firstName ?? null,
    lastName: result.user.lastName ?? null,
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, result.sealedSession ?? '', {
    httpOnly: true,
    secure: env.ADMIN_BASE_URL.startsWith('https://'),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return NextResponse.redirect(new URL('/admin', env.ADMIN_BASE_URL));
}
