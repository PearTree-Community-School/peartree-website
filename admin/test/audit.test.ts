import { describe, expect, it } from 'vitest';
import { createAdminApp, type WorkOSAdminClient } from '../src/server.js';
import type { AdminEnv } from '../src/config.js';
import { SESSION_COOKIE_NAME } from '../src/session.js';
import { createUsersRepo, openDatabase } from '../src/users.js';
import { createAuditRepo } from '../src/audit.js';

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

const actorUser = {
  id: 'workos_actor',
  email: 'admin@peartree.org',
  firstName: null,
  lastName: null,
} as const;

const visitorUser = {
  id: 'workos_visitor',
  email: 'no-account@example.com',
  firstName: null,
  lastName: null,
} as const;

function freshContext() {
  const db = openDatabase(':memory:');
  return { users: createUsersRepo(db), audit: createAuditRepo(db) };
}

type SessionUserLike = {
  readonly id: string;
  readonly email: string;
  readonly firstName: string | null;
  readonly lastName: string | null;
};

function fakeWorkOSForCallback(user: SessionUserLike): WorkOSAdminClient {
  return {
    userManagement: {
      getAuthorizationUrl: () => 'https://api.workos.com/user_management/authorize?',
      authenticateWithCode: async () => ({ user, sealedSession: `sealed_${user.email}` }),
      loadSealedSession: ({ sessionData }) => ({
        authenticate: async () =>
          sessionData === `sealed_${user.email}`
            ? { authenticated: true, user }
            : { authenticated: false },
      }),
    },
    webhooks: { constructEvent: () => { throw new Error('webhooks not stubbed'); } },
  };
}

describe('audit repo', () => {
  it('records_and_lists_newest_first', () => {
    const { audit } = freshContext();
    audit.record({ action: 'user.invited', actorEmail: 'a@a.co', targetEmail: 'b@b.co', summary: 'first' });
    audit.record({ action: 'user.role_changed', actorEmail: 'a@a.co', targetEmail: 'b@b.co', summary: 'second' });
    const entries = audit.list();
    expect(entries).toHaveLength(2);
    expect(entries[0]?.summary).toBe('second');
    expect(entries[1]?.summary).toBe('first');
  });

  it('respects_limit', () => {
    const { audit } = freshContext();
    for (let i = 0; i < 5; i++) {
      audit.record({ action: 'user.invited', summary: `e${i}` });
    }
    expect(audit.list(3)).toHaveLength(3);
  });
});

describe('audit entries produced by the app', () => {
  it('records_bootstrap_and_sign_in_on_first_callback', async () => {
    const ctx = freshContext();
    const app = createAdminApp({
      env: baseEnv,
      users: ctx.users,
      audit: ctx.audit,
      workos: fakeWorkOSForCallback(actorUser),
    });
    const res = await app.request('/auth/callback?code=any');
    expect(res.status).toBe(302);
    const actions = ctx.audit.list().map((e) => e.action);
    expect(actions).toContain('user.bootstrapped');
    expect(actions).toContain('session.signed_in');
  });

  it('records_refusal_for_unprovisioned_email', async () => {
    const ctx = freshContext();
    ctx.users.create({ workosUserId: 'other', email: 'other@peartree.org', role: 'super_admin' });
    const app = createAdminApp({
      env: baseEnv,
      users: ctx.users,
      audit: ctx.audit,
      workos: fakeWorkOSForCallback(visitorUser),
    });
    await app.request('/auth/callback?code=any');
    const actions = ctx.audit.list().map((e) => e.action);
    expect(actions).toContain('session.refused_unprovisioned');
  });

  it('records_user_invited_via_admin_route', async () => {
    const ctx = freshContext();
    ctx.users.create({ workosUserId: actorUser.id, email: actorUser.email, role: 'super_admin' });
    const sealed = `sealed_${actorUser.email}`;
    const app = createAdminApp({
      env: baseEnv,
      users: ctx.users,
      audit: ctx.audit,
      workos: fakeWorkOSForCallback(actorUser),
    });
    await app.request('/admin/users', {
      method: 'POST',
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sealed)}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ email: 'invitee@peartree.org', role: 'editor' }).toString(),
    });
    const entries = ctx.audit.list();
    const invited = entries.find((e) => e.action === 'user.invited');
    expect(invited).toBeDefined();
    expect(invited?.actorEmail).toBe(actorUser.email);
    expect(invited?.targetEmail).toBe('invitee@peartree.org');
    expect(invited?.summary).toContain('editor');
  });

  it('records_role_and_status_changes', async () => {
    const ctx = freshContext();
    ctx.users.create({ workosUserId: actorUser.id, email: actorUser.email, role: 'super_admin' });
    const target = ctx.users.create({ email: 'staff@peartree.org', role: 'editor' });
    const sealed = `sealed_${actorUser.email}`;
    const app = createAdminApp({
      env: baseEnv,
      users: ctx.users,
      audit: ctx.audit,
      workos: fakeWorkOSForCallback(actorUser),
    });
    await app.request(`/admin/users/${target.id}/role`, {
      method: 'POST',
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sealed)}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ role: 'admin' }).toString(),
    });
    await app.request(`/admin/users/${target.id}/status`, {
      method: 'POST',
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sealed)}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ status: 'disabled' }).toString(),
    });
    const actions = ctx.audit.list().map((e) => e.action);
    expect(actions).toContain('user.role_changed');
    expect(actions).toContain('user.status_changed');
    const roleEntry = ctx.audit.list().find((e) => e.action === 'user.role_changed');
    expect(roleEntry?.summary).toBe('Role: editor → admin.');
  });

  it('renders_audit_page_with_recent_entries', async () => {
    const ctx = freshContext();
    ctx.users.create({ workosUserId: actorUser.id, email: actorUser.email, role: 'super_admin' });
    ctx.audit.record({ action: 'user.invited', actorEmail: actorUser.email, targetEmail: 'x@x.co', summary: 'Hello audit world' });
    const sealed = `sealed_${actorUser.email}`;
    const app = createAdminApp({
      env: baseEnv,
      users: ctx.users,
      audit: ctx.audit,
      workos: fakeWorkOSForCallback(actorUser),
    });
    const res = await app.request('/admin/audit', {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sealed)}` },
    });
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('Audit log');
    expect(body).toContain('Hello audit world');
    expect(body).toContain('user.invited');
  });

  it('forbids_audit_page_for_role_without_audit_view_permission', async () => {
    const ctx = freshContext();
    const author = { id: 'workos_author', email: 'author@peartree.org', firstName: null, lastName: null } as const;
    ctx.users.create({ workosUserId: author.id, email: author.email, role: 'author' });
    const sealed = `sealed_${author.email}`;
    const app = createAdminApp({
      env: baseEnv,
      users: ctx.users,
      audit: ctx.audit,
      workos: fakeWorkOSForCallback(author),
    });
    const res = await app.request('/admin/audit', {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sealed)}` },
    });
    expect(res.status).toBe(403);
  });
});
