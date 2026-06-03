import { describe, expect, it } from 'vitest';
import { createAdminApp, type WorkOSAdminClient } from '../src/server.js';
import type { AdminEnv } from '../src/config.js';
import { SESSION_COOKIE_NAME } from '../src/session.js';
import { createUsersRepo, openDatabase, type UsersRepo } from '../src/users.js';
import { createAuditRepo, type AuditRepo } from '../src/audit.js';

const baseEnv: AdminEnv = {
  WORKOS_API_KEY: 'sk_test_not_secret',
  WORKOS_CLIENT_ID: 'client_test_123',
  WORKOS_COOKIE_PASSWORD: '0123456789abcdef0123456789abcdef',
  ADMIN_BASE_URL: 'http://127.0.0.1:4177',
  PUBLIC_SITE_BASE_URL: 'https://peartree-community-school.github.io/peartree-website',
  WORKOS_REDIRECT_URI: 'http://127.0.0.1:4177/auth/callback',
  WORKOS_ORGANIZATION_ID: undefined,
  WORKOS_WEBHOOK_SECRET: undefined,
  ADMIN_BOOTSTRAP_EMAILS: ['admin@peartree.org'],
  ADMIN_DB_PATH: ':memory:',
  PORT: 4177,
};

const bootstrapUser = {
  id: 'workos_user_01',
  email: 'admin@peartree.org',
  firstName: 'Mich',
  lastName: 'P',
} as const;

const strangerUser = {
  id: 'workos_user_02',
  email: 'someone-else@example.com',
  firstName: null,
  lastName: null,
} as const;

type AnyUser = typeof bootstrapUser | typeof strangerUser;

function makeFakeWorkOS(opts: {
  readonly userByCode?: Record<string, AnyUser>;
  readonly userBySession?: Record<string, AnyUser>;
}): WorkOSAdminClient {
  return {
    userManagement: {
      getAuthorizationUrl: ({ clientId, redirectUri }) =>
        `https://api.workos.com/user_management/authorize?provider=authkit&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`,
      authenticateWithCode: async ({ code }) => {
        const user = opts.userByCode?.[code];
        if (!user) throw new Error('invalid code');
        return { user, sealedSession: `sealed_for_${user.email}` };
      },
      loadSealedSession: ({ sessionData }) => ({
        authenticate: async () => {
          const user = opts.userBySession?.[sessionData];
          if (!user) return { authenticated: false };
          return { authenticated: true, user };
        },
      }),
    },
    webhooks: { constructEvent: () => { throw new Error('webhooks not stubbed'); } },
  };
}

function freshUsers(): UsersRepo {
  return createUsersRepo(openDatabase(':memory:'));
}

function freshAudit(): AuditRepo {
  return createAuditRepo(openDatabase(':memory:'));
}

function freshCtx(): { readonly users: UsersRepo; readonly audit: AuditRepo } {
  const db = openDatabase(':memory:');
  return { users: createUsersRepo(db), audit: createAuditRepo(db) };
}

describe('WorkOS AuthKit routes', () => {
  it('redirects_to_workos_authkit_when_signing_in', async () => {
    const app = createAdminApp({ env: baseEnv, users: freshUsers(), audit: freshAudit() });
    const response = await app.request('/auth/sign-in');
    expect(response.status).toBe(302);
    const location = response.headers.get('location');
    const redirectUrl = new URL(location ?? '');
    expect(redirectUrl.hostname).toContain('workos');
    expect(redirectUrl.searchParams.get('provider')).toBe('authkit');
    expect(redirectUrl.searchParams.get('client_id')).toBe('client_test_123');
  });

  it('returns_400_when_callback_is_missing_code', async () => {
    const app = createAdminApp({ env: baseEnv, users: freshUsers(), audit: freshAudit(), workos: makeFakeWorkOS({}) });
    const response = await app.request('/auth/callback');
    expect(response.status).toBe(400);
  });

  it('returns_401_when_callback_code_is_invalid', async () => {
    const app = createAdminApp({ env: baseEnv, users: freshUsers(), audit: freshAudit(), workos: makeFakeWorkOS({}) });
    const response = await app.request('/auth/callback?code=bad');
    expect(response.status).toBe(401);
  });

  it('bootstraps_first_super_admin_when_table_is_empty_and_email_matches', async () => {
    const users = freshUsers();
    const app = createAdminApp({
      env: baseEnv,
      users,
      audit: freshAudit(),
      workos: makeFakeWorkOS({ userByCode: { good: bootstrapUser } }),
    });
    const response = await app.request('/auth/callback?code=good');
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/admin');
    expect(users.count()).toBe(1);
    const created = users.findByWorkOSId('workos_user_01');
    expect(created?.role).toBe('super_admin');
    expect(created?.lastLoginAt).not.toBeNull();
  });

  it('does_not_bootstrap_when_email_is_not_in_bootstrap_list', async () => {
    const users = freshUsers();
    const app = createAdminApp({
      env: baseEnv,
      users,
      audit: freshAudit(),
      workos: makeFakeWorkOS({ userByCode: { good: strangerUser } }),
    });
    await app.request('/auth/callback?code=good');
    expect(users.count()).toBe(0);
  });

  it('links_workos_id_to_pre_provisioned_pending_user_on_first_sign_in', async () => {
    const users = freshUsers();
    users.create({ workosUserId: 'workos_user_99', email: 'first@example.com', role: 'super_admin' });
    const invited = users.create({ email: 'admin@peartree.org', role: 'editor' });
    expect(invited.workosUserId).toBeNull();
    const app = createAdminApp({
      env: baseEnv,
      users,
      audit: freshAudit(),
      workos: makeFakeWorkOS({ userByCode: { good: bootstrapUser } }),
    });
    const res = await app.request('/auth/callback?code=good');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/admin');
    const linked = users.findById(invited.id);
    expect(linked?.workosUserId).toBe('workos_user_01');
    expect(linked?.role).toBe('editor');
    expect(linked?.lastLoginAt).not.toBeNull();
  });

  it('does_not_bootstrap_when_table_already_has_users_even_if_email_matches', async () => {
    const users = freshUsers();
    users.create({ workosUserId: 'workos_user_99', email: 'first@example.com', role: 'super_admin' });
    const app = createAdminApp({
      env: baseEnv,
      users,
      audit: freshAudit(),
      workos: makeFakeWorkOS({ userByCode: { good: bootstrapUser } }),
    });
    await app.request('/auth/callback?code=good');
    expect(users.count()).toBe(1);
    expect(users.findByWorkOSId('workos_user_01')).toBeNull();
  });

  it('redirects_to_sign_in_when_admin_is_accessed_without_session', async () => {
    const app = createAdminApp({ env: baseEnv, users: freshUsers(), audit: freshAudit(), workos: makeFakeWorkOS({}) });
    const response = await app.request('/admin');
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/auth/sign-in');
  });

  it('renders_admin_home_for_provisioned_user', async () => {
    const users = freshUsers();
    users.create({ workosUserId: 'workos_user_01', email: 'admin@peartree.org', role: 'editor' });
    const sealed = 'sealed_for_admin@peartree.org';
    const app = createAdminApp({
      env: baseEnv,
      users,
      audit: freshAudit(),
      workos: makeFakeWorkOS({ userBySession: { [sealed]: bootstrapUser } }),
    });
    const response = await app.request('/admin', {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sealed)}` },
    });
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('admin@peartree.org');
    expect(body).toContain('editor');
    expect(body).toContain('Sign out');
  });

  it('returns_403_when_authenticated_user_is_not_in_users_table', async () => {
    const users = freshUsers();
    const sealed = 'sealed_for_someone-else@example.com';
    const app = createAdminApp({
      env: baseEnv,
      users,
      audit: freshAudit(),
      workos: makeFakeWorkOS({ userBySession: { [sealed]: strangerUser } }),
    });
    const response = await app.request('/admin', {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sealed)}` },
    });
    expect(response.status).toBe(403);
    const body = await response.text();
    expect(body).toContain('not yet provisioned');
  });

  it('returns_403_when_user_is_disabled', async () => {
    const db = openDatabase(':memory:');
    const users = createUsersRepo(db);
    const created = users.create({
      workosUserId: 'workos_user_01',
      email: 'admin@peartree.org',
      role: 'admin',
    });
    db.prepare("UPDATE users SET status = 'disabled' WHERE id = ?").run(created.id);
    const sealed = 'sealed_for_admin@peartree.org';
    const app = createAdminApp({
      env: baseEnv,
      users,
      audit: freshAudit(),
      workos: makeFakeWorkOS({ userBySession: { [sealed]: bootstrapUser } }),
    });
    const response = await app.request('/admin', {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sealed)}` },
    });
    expect(response.status).toBe(403);
  });

  it('clears_session_cookie_and_redirects_to_public_site_on_sign_out', async () => {
    const app = createAdminApp({ env: baseEnv, users: freshUsers(), audit: freshAudit(), workos: makeFakeWorkOS({}) });
    const response = await app.request('/auth/sign-out', { method: 'POST' });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(baseEnv.PUBLIC_SITE_BASE_URL);
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie.toLowerCase()).toMatch(/max-age=0|expires=/);
  });
});

