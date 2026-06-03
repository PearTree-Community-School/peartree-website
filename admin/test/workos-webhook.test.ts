import { describe, expect, it } from 'vitest';
import { createAdminApp, type WorkOSAdminClient } from '../src/server.js';
import type { AdminEnv } from '../src/config.js';
import { createUsersRepo, openDatabase } from '../src/users.js';
import { createAuditRepo } from '../src/audit.js';
import { eventToAuditEntry, type WorkOSEvent } from '../src/workos-webhooks.js';

const baseEnv: AdminEnv = {
  WORKOS_API_KEY: 'sk_test_not_secret',
  WORKOS_CLIENT_ID: 'client_test_123',
  WORKOS_COOKIE_PASSWORD: '0123456789abcdef0123456789abcdef',
  ADMIN_BASE_URL: 'http://127.0.0.1:4177',
  PUBLIC_SITE_BASE_URL: 'https://peartree-community-school.github.io/peartree-website',
  WORKOS_REDIRECT_URI: 'http://127.0.0.1:4177/auth/callback',
  WORKOS_ORGANIZATION_ID: undefined,
  WORKOS_WEBHOOK_SECRET: 'whsec_test_abc',
  ADMIN_BOOTSTRAP_EMAILS: [],
  ADMIN_DB_PATH: ':memory:',
  PORT: 4177,
};

function freshContext() {
  const db = openDatabase(':memory:');
  return { users: createUsersRepo(db), audit: createAuditRepo(db) };
}

type FakeOpts = {
  readonly expectedSignature?: string;
  readonly event?: WorkOSEvent;
};

function fakeWorkOS(opts: FakeOpts = {}): WorkOSAdminClient {
  return {
    userManagement: {
      getAuthorizationUrl: () => '',
      authenticateWithCode: async () => {
        throw new Error('not used');
      },
      loadSealedSession: () => ({ authenticate: async () => ({ authenticated: false }) }),
    },
    webhooks: {
      constructEvent: ({ sigHeader, secret }) => {
        if (secret !== 'whsec_test_abc') throw new Error('bad secret');
        if (opts.expectedSignature && sigHeader !== opts.expectedSignature) {
          throw new Error('bad signature');
        }
        if (!opts.event) throw new Error('no event configured');
        return opts.event;
      },
    },
  };
}

const sampleEvent: WorkOSEvent = {
  id: 'wh_evt_01',
  event: 'user.updated',
  data: { id: 'user_x', email: 'changed@peartree.org' },
  createdAt: '2026-06-03T08:00:00Z',
};

describe('WorkOS webhook endpoint', () => {
  it('returns_503_when_webhook_secret_is_not_configured', async () => {
    const ctx = freshContext();
    const app = createAdminApp({
      env: { ...baseEnv, WORKOS_WEBHOOK_SECRET: undefined },
      users: ctx.users,
      audit: ctx.audit,
      workos: fakeWorkOS(),
    });
    const res = await app.request('/webhooks/workos', {
      method: 'POST',
      headers: { 'workos-signature': 'whatever' },
      body: '{}',
    });
    expect(res.status).toBe(503);
    expect(ctx.audit.list()).toHaveLength(0);
  });

  it('returns_401_when_signature_header_is_missing', async () => {
    const ctx = freshContext();
    const app = createAdminApp({ env: baseEnv, users: ctx.users, audit: ctx.audit, workos: fakeWorkOS() });
    const res = await app.request('/webhooks/workos', { method: 'POST', body: '{}' });
    expect(res.status).toBe(401);
    expect(ctx.audit.list()).toHaveLength(0);
  });

  it('returns_401_when_signature_is_invalid', async () => {
    const ctx = freshContext();
    const app = createAdminApp({
      env: baseEnv,
      users: ctx.users,
      audit: ctx.audit,
      workos: fakeWorkOS({ expectedSignature: 't=1,v1=good', event: sampleEvent }),
    });
    const res = await app.request('/webhooks/workos', {
      method: 'POST',
      headers: { 'workos-signature': 't=1,v1=bad' },
      body: JSON.stringify(sampleEvent),
    });
    expect(res.status).toBe(401);
    expect(ctx.audit.list()).toHaveLength(0);
  });

  it('records_a_valid_event_into_audit_log', async () => {
    const ctx = freshContext();
    const app = createAdminApp({
      env: baseEnv,
      users: ctx.users,
      audit: ctx.audit,
      workos: fakeWorkOS({ event: sampleEvent }),
    });
    const res = await app.request('/webhooks/workos', {
      method: 'POST',
      headers: { 'workos-signature': 't=1,v1=good' },
      body: JSON.stringify(sampleEvent),
    });
    expect(res.status).toBe(200);
    const entries = ctx.audit.list();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.action).toBe('workos.user_updated');
    expect(entries[0]?.actorEmail).toBe('changed@peartree.org');
    expect(entries[0]?.externalId).toBe('wh_evt_01');
    expect(entries[0]?.summary).toContain('changed@peartree.org');
  });

  it('deduplicates_when_workos_retries_the_same_event_id', async () => {
    const ctx = freshContext();
    const app = createAdminApp({
      env: baseEnv,
      users: ctx.users,
      audit: ctx.audit,
      workos: fakeWorkOS({ event: sampleEvent }),
    });
    for (let i = 0; i < 3; i++) {
      const res = await app.request('/webhooks/workos', {
        method: 'POST',
        headers: { 'workos-signature': 't=1,v1=good' },
        body: JSON.stringify(sampleEvent),
      });
      expect(res.status).toBe(200);
    }
    expect(ctx.audit.list()).toHaveLength(1);
  });
});

describe('eventToAuditEntry', () => {
  it('formats_known_event_types_with_human_summary', () => {
    const entry = eventToAuditEntry({
      id: 'evt_x',
      event: 'authentication.password_failed',
      data: { email: 'attacker@example.com' },
    });
    expect(entry.action).toBe('workos.authentication_password_failed');
    expect(entry.summary).toContain('failed');
    expect(entry.summary).toContain('attacker@example.com');
    expect(entry.externalId).toBe('evt_x');
  });

  it('falls_back_for_unknown_event_types', () => {
    const entry = eventToAuditEntry({
      id: 'evt_y',
      event: 'something.brand_new',
      data: {},
    });
    expect(entry.action).toBe('workos.something_brand_new');
    expect(entry.summary).toContain('something.brand_new');
  });

  it('extracts_email_from_nested_user_object', () => {
    const entry = eventToAuditEntry({
      id: 'evt_z',
      event: 'session.created',
      data: { user: { email: 'staff@peartree.org' } },
    });
    expect(entry.actorEmail).toBe('staff@peartree.org');
  });
});
