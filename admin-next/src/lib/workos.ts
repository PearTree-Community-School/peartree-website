import { WorkOS } from '@workos-inc/node';
import { getEnv } from './env';

let cached: WorkOS | undefined;

export function getWorkOS(): WorkOS {
  if (cached) return cached;
  const env = getEnv();
  cached = new WorkOS(env.WORKOS_API_KEY, { clientId: env.WORKOS_CLIENT_ID });
  return cached;
}

export const SESSION_COOKIE_NAME = 'pt_admin_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export type WorkOSAuthUser = {
  readonly id: string;
  readonly email: string;
  readonly firstName: string | null;
  readonly lastName: string | null;
};

export function getSignInUrl(): string {
  const env = getEnv();
  const w = getWorkOS();
  const params: Parameters<typeof w.userManagement.getAuthorizationUrl>[0] = {
    provider: 'authkit',
    clientId: env.WORKOS_CLIENT_ID,
    redirectUri: env.WORKOS_REDIRECT_URI,
  };
  if (env.WORKOS_ORGANIZATION_ID) {
    return w.userManagement.getAuthorizationUrl({ ...params, organizationId: env.WORKOS_ORGANIZATION_ID });
  }
  return w.userManagement.getAuthorizationUrl(params);
}
