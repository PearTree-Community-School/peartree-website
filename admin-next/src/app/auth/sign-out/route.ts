import { cookies } from 'next/headers';
import { getPayload } from 'payload';
import { NextResponse } from 'next/server';
import config from '@payload-config';
import { getEnv } from '@/lib/env';
import { getWorkOS, SESSION_COOKIE_NAME } from '@/lib/workos';

export const dynamic = 'force-dynamic';

export async function POST() {
  const env = getEnv();
  const cookieStore = await cookies();
  const sealed = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (sealed) {
    try {
      const auth = await getWorkOS()
        .userManagement.loadSealedSession({ sessionData: sealed, cookiePassword: env.WORKOS_COOKIE_PASSWORD })
        .authenticate();
      if (auth.authenticated) {
        const payload = await getPayload({ config });
        await payload.create({
          collection: 'audit-log',
          data: {
            action: 'session.signed_out',
            actorEmail: auth.user.email,
            targetEmail: auth.user.email,
            summary: 'Signed out.',
          },
          overrideAccess: true,
        });
      }
    } catch {
      // ignore — sign-out should never fail
    }
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
  return NextResponse.redirect(new URL(env.PUBLIC_SITE_BASE_URL));
}
