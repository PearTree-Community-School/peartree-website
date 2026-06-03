import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { provisionFromCallback } from '../src/lib/provision';
import { clearEnvCache } from '../src/lib/env';

type Row = Record<string, unknown> & { id: number };

/**
 * Minimal in-memory fake that satisfies the subset of the Payload Local API
 * used by provisionFromCallback. Two collections: users, audit-log.
 */
function makeFakePayload() {
  let nextId = 1;
  const tables = new Map<string, Row[]>();
  tables.set('users', []);
  tables.set('audit-log', []);

  function tableOf(slug: string): Row[] {
    const rows = tables.get(slug);
    if (!rows) throw new Error(`No such collection: ${slug}`);
    return rows;
  }

  function matchWhere(row: Row, where: Record<string, { equals?: unknown }>): boolean {
    for (const [field, cond] of Object.entries(where)) {
      if (cond.equals !== undefined && row[field] !== cond.equals) return false;
    }
    return true;
  }

  return {
    tables, // exposed for assertions
    async find({ collection, where }: { collection: string; where?: Record<string, { equals?: unknown }> }) {
      const rows = tableOf(collection);
      const filtered = where ? rows.filter((r) => matchWhere(r, where)) : rows.slice();
      return { docs: filtered, totalDocs: filtered.length };
    },
    async count({ collection }: { collection: string }) {
      return { totalDocs: tableOf(collection).length };
    },
    async create({ collection, data }: { collection: string; data: Record<string, unknown> }) {
      const id = nextId++;
      const row: Row = { id, ...data };
      tableOf(collection).push(row);
      return row;
    },
    async update({ collection, id, data }: { collection: string; id: number | string; data: Record<string, unknown> }) {
      const rows = tableOf(collection);
      const idx = rows.findIndex((r) => r.id === Number(id));
      if (idx === -1) throw new Error(`No row with id ${id} in ${collection}`);
      const current = rows[idx];
      if (!current) throw new Error(`Row at index ${idx} unexpectedly undefined`);
      const next: Row = { ...current, ...data, id: current.id };
      rows[idx] = next;
      return next;
    },
  };
}

const baseEnv = {
  PAYLOAD_SECRET: 'a'.repeat(32),
  WORKOS_API_KEY: 'sk_test',
  WORKOS_CLIENT_ID: 'client_test',
  WORKOS_COOKIE_PASSWORD: 'b'.repeat(32),
  WORKOS_REDIRECT_URI: 'http://127.0.0.1:3000/auth/callback',
  PUBLIC_SITE_BASE_URL: 'https://example.com',
  ADMIN_BASE_URL: 'http://127.0.0.1:3000',
  ADMIN_BOOTSTRAP_EMAILS: 'admin@peartree.org',
};

let originalEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  originalEnv = { ...process.env };
  process.env = { ...baseEnv } as unknown as NodeJS.ProcessEnv;
  clearEnvCache();
});

afterEach(() => {
  process.env = originalEnv;
  clearEnvCache();
});

const adminUser = {
  id: 'workos_admin',
  email: 'admin@peartree.org',
  firstName: 'Mich',
  lastName: 'P',
} as const;

const strangerUser = {
  id: 'workos_stranger',
  email: 'stranger@example.com',
  firstName: null,
  lastName: null,
} as const;

describe('provisionFromCallback', () => {
  it('bootstraps_first_super_admin_when_table_is_empty_and_email_matches', async () => {
    const payload = makeFakePayload();
    const outcome = await provisionFromCallback(payload as never, adminUser);
    expect(outcome.status).toBe('provisioned');
    expect(payload.tables.get('users')).toHaveLength(1);
    const created = payload.tables.get('users')?.[0];
    expect(created?.['role']).toBe('super_admin');
    expect(created?.['workosUserId']).toBe('workos_admin');
    const auditActions = payload.tables.get('audit-log')?.map((r) => r['action']);
    expect(auditActions).toContain('user.bootstrapped');
    expect(auditActions).toContain('session.signed_in');
  });

  it('refuses_when_email_is_not_in_bootstrap_list_and_table_is_empty', async () => {
    const payload = makeFakePayload();
    const outcome = await provisionFromCallback(payload as never, strangerUser);
    expect(outcome.status).toBe('unprovisioned');
    expect(payload.tables.get('users')).toHaveLength(0);
    expect(payload.tables.get('audit-log')?.map((r) => r['action'])).toContain('session.refused_unprovisioned');
  });

  it('links_workos_id_to_pre_provisioned_pending_user', async () => {
    const payload = makeFakePayload();
    await payload.create({
      collection: 'users',
      data: { email: 'someone@peartree.org', role: 'super_admin', status: 'active', workosUserId: 'workos_existing' },
    });
    await payload.create({
      collection: 'users',
      data: { email: adminUser.email, role: 'editor', status: 'active', workosUserId: null },
    });
    const outcome = await provisionFromCallback(payload as never, adminUser);
    expect(outcome.status).toBe('provisioned');
    const linked = payload.tables.get('users')?.find((r) => r['email'] === adminUser.email);
    expect(linked?.['workosUserId']).toBe('workos_admin');
    expect(linked?.['role']).toBe('editor');
    const actions = payload.tables.get('audit-log')?.map((r) => r['action']);
    expect(actions).toContain('user.linked');
    expect(actions).toContain('session.signed_in');
  });

  it('records_login_for_returning_user', async () => {
    const payload = makeFakePayload();
    await payload.create({
      collection: 'users',
      data: { email: adminUser.email, workosUserId: adminUser.id, role: 'editor', status: 'active' },
    });
    const outcome = await provisionFromCallback(payload as never, adminUser);
    expect(outcome.status).toBe('provisioned');
    const user = payload.tables.get('users')?.[0];
    expect(user?.['lastLoginAt']).toBeDefined();
    const actions = payload.tables.get('audit-log')?.map((r) => r['action']);
    expect(actions).toContain('session.signed_in');
    expect(actions).not.toContain('user.linked');
  });

  it('refuses_disabled_users', async () => {
    const payload = makeFakePayload();
    await payload.create({
      collection: 'users',
      data: { email: adminUser.email, workosUserId: adminUser.id, role: 'editor', status: 'disabled' },
    });
    const outcome = await provisionFromCallback(payload as never, adminUser);
    expect(outcome.status).toBe('unprovisioned');
    expect(payload.tables.get('audit-log')?.map((r) => r['action'])).toContain('session.refused_unprovisioned');
  });

  it('refuses_email_conflict_with_a_different_workos_id', async () => {
    const payload = makeFakePayload();
    await payload.create({
      collection: 'users',
      data: { email: adminUser.email, workosUserId: 'workos_other_account', role: 'editor', status: 'active' },
    });
    const outcome = await provisionFromCallback(payload as never, adminUser);
    expect(outcome.status).toBe('unprovisioned');
    const audit = payload.tables.get('audit-log')?.[0];
    expect(audit?.['summary']).toContain('already linked');
  });

  it('does_not_bootstrap_when_table_already_has_users_even_if_email_matches', async () => {
    const payload = makeFakePayload();
    await payload.create({
      collection: 'users',
      data: { email: 'first@example.com', workosUserId: 'workos_first', role: 'super_admin', status: 'active' },
    });
    const outcome = await provisionFromCallback(payload as never, adminUser);
    expect(outcome.status).toBe('unprovisioned');
    expect(payload.tables.get('users')).toHaveLength(1);
  });
});
