import type { AuthStrategy } from 'payload';
import { cookies } from 'next/headers';
import { getEnv } from './env';
import { getWorkOS, SESSION_COOKIE_NAME } from './workos';

/**
 * Custom Payload auth strategy that reads our WorkOS sealed-session cookie
 * and resolves the matching user in Payload's `users` collection by workosUserId.
 *
 * Payload calls this on every authenticated request. We do NOT manage password
 * auth here — invites, role assignment, and disabling happen via Payload's admin.
 */
export const workosAuthStrategy: AuthStrategy = {
  name: 'workos-authkit',
  authenticate: async ({ payload }) => {
    const env = getEnv();
    const cookieStore = await cookies();
    const sealed = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!sealed) {
      return { user: null };
    }
    let auth: { authenticated: false } | { authenticated: true; user: { id: string; email: string; firstName?: string | null; lastName?: string | null } };
    try {
      auth = await getWorkOS()
        .userManagement.loadSealedSession({ sessionData: sealed, cookiePassword: env.WORKOS_COOKIE_PASSWORD })
        .authenticate();
    } catch {
      return { user: null };
    }
    if (!auth.authenticated) {
      return { user: null };
    }
    // Look up by workosUserId
    const result = await payload.find({
      collection: 'users',
      where: { workosUserId: { equals: auth.user.id } },
      limit: 1,
      overrideAccess: true,
    });
    const record = result.docs[0];
    if (!record) {
      return { user: null };
    }
    const status = (record as { status?: string }).status;
    if (status !== 'active') {
      return { user: null };
    }
    return {
      user: {
        ...(record as Record<string, unknown>),
        collection: 'users',
      } as unknown as Awaited<ReturnType<AuthStrategy['authenticate']>>['user'],
    };
  },
};
