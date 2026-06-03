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

const adminUser = {
  id: 'workos_user_admin',
  email: 'admin@peartree.org',
  firstName: null,
  lastName: null,
} as const;

const editorUser = {
  id: 'workos_user_editor',
  email: 'editor@peartree.org',
  firstName: null,
  lastName: null,
} as const;

function makeFakeWorkOS(sessionMap: Record<string, typeof adminUser | typeof editorUser>): WorkOSAdminClient {
  return {
    userManagement: {
      getAuthorizationUrl: () => 'https://api.workos.com/user_management/authorize?',
      authenticateWithCode: async () => {
        throw new Error('not used in these tests');
      },
      loadSealedSession: ({ sessionData }) => ({
        authenticate: async () => {
          const u = sessionMap[sessionData];
          if (!u) return { authenticated: false };
          return { authenticated: true, user: u };
        },
      }),
    },
    webhooks: { constructEvent: () => { throw new Error('webhooks not stubbed'); } },
  };
}

function seededAsSuperAdmin(): {
  readonly users: UsersRepo;
  readonly audit: AuditRepo;
  readonly cookie: string;
  readonly workos: WorkOSAdminClient;
} {
  const db = openDatabase(':memory:');
  const users = createUsersRepo(db);
  const audit = createAuditRepo(db);
  users.create({ workosUserId: adminUser.id, email: adminUser.email, role: 'super_admin' });
  const sealed = 'sealed_admin';
  return {
    users,
    audit,
    cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sealed)}`,
    workos: makeFakeWorkOS({ [sealed]: adminUser }),
  };
}

describe('users management routes', () => {
  it('lists_users_for_super_admin', async () => {
    const ctx = seededAsSuperAdmin();
    ctx.users.create({ email: 'pending@peartree.org', role: 'editor' });
    const app = createAdminApp({ env: baseEnv, users: ctx.users, audit: ctx.audit, workos: ctx.workos });
    const res = await app.request('/admin/users', { headers: { cookie: ctx.cookie } });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('admin@peartree.org');
    expect(html).toContain('pending@peartree.org');
    expect(html).toContain('Pending');
    expect(html).toContain('(you)');
  });

  it('invites_a_new_user_as_pending', async () => {
    const ctx = seededAsSuperAdmin();
    const app = createAdminApp({ env: baseEnv, users: ctx.users, audit: ctx.audit, workos: ctx.workos });
    const form = new URLSearchParams({ email: 'new@peartree.org', role: 'editor' });
    const res = await app.request('/admin/users', {
      method: 'POST',
      headers: { cookie: ctx.cookie, 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/admin/users');
    const created = ctx.users.findByEmail('new@peartree.org');
    expect(created).not.toBeNull();
    expect(created?.workosUserId).toBeNull();
    expect(created?.role).toBe('editor');
  });

  it('rejects_invite_for_duplicate_email', async () => {
    const ctx = seededAsSuperAdmin();
    const app = createAdminApp({ env: baseEnv, users: ctx.users, audit: ctx.audit, workos: ctx.workos });
    const form = new URLSearchParams({ email: 'admin@peartree.org', role: 'editor' });
    const res = await app.request('/admin/users', {
      method: 'POST',
      headers: { cookie: ctx.cookie, 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    expect(res.status).toBe(303);
    expect(ctx.users.count()).toBe(1);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('pt_flash=');
  });

  it('changes_role_for_another_user', async () => {
    const ctx = seededAsSuperAdmin();
    const target = ctx.users.create({ email: 'other@peartree.org', role: 'editor' });
    const app = createAdminApp({ env: baseEnv, users: ctx.users, audit: ctx.audit, workos: ctx.workos });
    const res = await app.request(`/admin/users/${target.id}/role`, {
      method: 'POST',
      headers: { cookie: ctx.cookie, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ role: 'admin' }).toString(),
    });
    expect(res.status).toBe(303);
    expect(ctx.users.findById(target.id)?.role).toBe('admin');
  });

  it('refuses_to_change_own_role', async () => {
    const ctx = seededAsSuperAdmin();
    const me = ctx.users.findByEmail(adminUser.email)!;
    const app = createAdminApp({ env: baseEnv, users: ctx.users, audit: ctx.audit, workos: ctx.workos });
    const res = await app.request(`/admin/users/${me.id}/role`, {
      method: 'POST',
      headers: { cookie: ctx.cookie, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ role: 'editor' }).toString(),
    });
    expect(res.status).toBe(303);
    expect(ctx.users.findById(me.id)?.role).toBe('super_admin');
  });

  it('refuses_to_demote_the_last_active_super_admin', async () => {
    // Signed-in actor: admin role (has users:manage). Target: the only super_admin.
    const users = createUsersRepo(openDatabase(':memory:'));
    const actor = { id: 'workos_actor', email: 'mgr@peartree.org', firstName: null, lastName: null } as const;
    users.create({ workosUserId: actor.id, email: actor.email, role: 'admin' });
    const target = users.create({
      workosUserId: 'workos_target',
      email: 'lone-sa@peartree.org',
      role: 'super_admin',
    });
    const sealed = 'sealed_actor';
    const workos: WorkOSAdminClient = {
      userManagement: {
        getAuthorizationUrl: () => 'https://api.workos.com/user_management/authorize?',
        authenticateWithCode: async () => {
          throw new Error('unused');
        },
        loadSealedSession: ({ sessionData }) => ({
          authenticate: async () => (sessionData === sealed ? { authenticated: true, user: actor } : { authenticated: false }),
        }),
      },
      webhooks: { constructEvent: () => { throw new Error('webhooks not stubbed'); } },
    };
    const app = createAdminApp({ env: baseEnv, users, audit: createAuditRepo(openDatabase(':memory:')), workos });
    const res = await app.request(`/admin/users/${target.id}/role`, {
      method: 'POST',
      headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sealed)}`, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ role: 'editor' }).toString(),
    });
    expect(res.status).toBe(303);
    expect(users.findById(target.id)?.role).toBe('super_admin');
  });

  it('disables_and_re_enables_a_user', async () => {
    const ctx = seededAsSuperAdmin();
    const target = ctx.users.create({ email: 'other@peartree.org', role: 'editor' });
    const app = createAdminApp({ env: baseEnv, users: ctx.users, audit: ctx.audit, workos: ctx.workos });
    await app.request(`/admin/users/${target.id}/status`, {
      method: 'POST',
      headers: { cookie: ctx.cookie, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ status: 'disabled' }).toString(),
    });
    expect(ctx.users.findById(target.id)?.status).toBe('disabled');
    await app.request(`/admin/users/${target.id}/status`, {
      method: 'POST',
      headers: { cookie: ctx.cookie, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ status: 'active' }).toString(),
    });
    expect(ctx.users.findById(target.id)?.status).toBe('active');
  });

  it('blocks_non_users_manage_roles_from_users_page', async () => {
    const users = createUsersRepo(openDatabase(':memory:'));
    users.create({ workosUserId: editorUser.id, email: editorUser.email, role: 'editor' });
    const sealed = 'sealed_editor';
    const app = createAdminApp({
      env: baseEnv,
      users,
      audit: createAuditRepo(openDatabase(':memory:')),
      workos: makeFakeWorkOS({ [sealed]: editorUser }),
    });
    const res = await app.request('/admin/users', {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sealed)}` },
    });
    expect(res.status).toBe(403);
    const body = await res.text();
    expect(body).toContain('users:manage');
  });

  it('redirects_unauthenticated_users_from_users_page_to_sign_in', async () => {
    const users = createUsersRepo(openDatabase(':memory:'));
    const app = createAdminApp({ env: baseEnv, users, audit: createAuditRepo(openDatabase(':memory:')), workos: makeFakeWorkOS({}) });
    const res = await app.request('/admin/users');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/auth/sign-in');
  });
});
