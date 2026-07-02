import { describe, expect, it } from 'vitest';
import { createAdminApp, type WorkOSAdminClient } from '../src/server.js';
import type { AdminEnv } from '../src/config.js';
import { SESSION_COOKIE_NAME } from '../src/session.js';
import { createUsersRepo, openDatabase, type UsersRepo } from '../src/users.js';
import { createAuditRepo, type AuditRepo } from '../src/audit.js';
import { createContentRepo, type ContentRepo } from '../src/content.js';
import type { Role } from '../src/policy.js';

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

type FakeUser = { readonly id: string; readonly email: string; readonly firstName: null; readonly lastName: null };

function makeFakeWorkOS(sessionMap: Record<string, FakeUser>): WorkOSAdminClient {
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
    webhooks: {
      constructEvent: () => {
        throw new Error('webhooks not stubbed');
      },
    },
  };
}

type Ctx = {
  readonly app: ReturnType<typeof createAdminApp>;
  readonly users: UsersRepo;
  readonly audit: AuditRepo;
  readonly content: ContentRepo;
  readonly cookie: string;
};

function appAs(role: Role): Ctx {
  const db = openDatabase(':memory:');
  const users = createUsersRepo(db);
  const audit = createAuditRepo(db);
  const content = createContentRepo(db);
  const user: FakeUser = { id: `workos_${role}`, email: `${role}@peartree.org`, firstName: null, lastName: null };
  users.create({ workosUserId: user.id, email: user.email, role });
  const sealed = `sealed_${role}`;
  const app = createAdminApp({
    env: baseEnv,
    users,
    audit,
    content,
    workos: makeFakeWorkOS({ [sealed]: user }),
  });
  return { app, users, audit, content, cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sealed)}` };
}

function formPost(path: string, cookie: string, fields: Record<string, string>) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
  });
}

describe('content admin routes', () => {
  it('overview_lists_all_collections', async () => {
    const ctx = appAs('editor');
    const res = await ctx.app.request('/admin/content', { headers: { cookie: ctx.cookie } });
    expect(res.status).toBe(200);
    const html = await res.text();
    for (const label of ['Testimonials', 'Parent FAQ', 'Classrooms', 'Stats list', 'School stats', 'Mission statement']) {
      expect(html).toContain(label);
    }
  });

  it('requires_sign_in', async () => {
    const ctx = appAs('editor');
    const res = await ctx.app.request('/admin/content');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/auth/sign-in');
  });

  it('editor_creates_published_item', async () => {
    const ctx = appAs('editor');
    const res = await ctx.app.fetch(
      formPost('/admin/content/testimonials', ctx.cookie, { quote: 'Wonderful school', source: 'Parent' }),
    );
    expect(res.status).toBe(303);
    const items = ctx.content.listAll('testimonials');
    expect(items).toHaveLength(1);
    expect(items[0]?.published).toBe(true);
    expect(ctx.audit.list().some((e) => e.action === 'content.created')).toBe(true);
  });

  it('author_creates_draft_item', async () => {
    const ctx = appAs('author');
    const res = await ctx.app.fetch(
      formPost('/admin/content/testimonials', ctx.cookie, { quote: 'Draft quote', source: 'Parent' }),
    );
    expect(res.status).toBe(303);
    const items = ctx.content.listAll('testimonials');
    expect(items[0]?.published).toBe(false);
  });

  it('author_cannot_publish', async () => {
    const ctx = appAs('author');
    const item = ctx.content.create('testimonials', { quote: 'X', source: 'Y' }, false);
    const res = await ctx.app.fetch(
      formPost(`/admin/content/testimonials/${item.id}/publish`, ctx.cookie, { published: '1' }),
    );
    expect(res.status).toBe(403);
    expect(ctx.content.findById(item.id)?.published).toBe(false);
  });

  it('viewer_can_read_but_not_write', async () => {
    const ctx = appAs('viewer');
    const readRes = await ctx.app.request('/admin/content/testimonials', { headers: { cookie: ctx.cookie } });
    expect(readRes.status).toBe(200);
    const writeRes = await ctx.app.fetch(
      formPost('/admin/content/testimonials', ctx.cookie, { quote: 'Nope', source: 'Nope' }),
    );
    expect(writeRes.status).toBe(403);
    expect(ctx.content.counts('testimonials').total).toBe(0);
  });

  it('rejects_invalid_submission_with_flash', async () => {
    const ctx = appAs('editor');
    const res = await ctx.app.fetch(formPost('/admin/content/testimonials', ctx.cookie, { source: 'No quote' }));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/admin/content/testimonials/new');
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('pt_flash');
    expect(ctx.content.counts('testimonials').total).toBe(0);
  });

  it('updates_item', async () => {
    const ctx = appAs('editor');
    const item = ctx.content.create('parent-faq', { question: 'Old?', answer: 'Old.' });
    const res = await ctx.app.fetch(
      formPost(`/admin/content/parent-faq/${item.id}`, ctx.cookie, { question: 'New?', answer: 'New.' }),
    );
    expect(res.status).toBe(303);
    expect(ctx.content.findById(item.id)?.data['question']).toBe('New?');
    expect(ctx.audit.list().some((e) => e.action === 'content.updated')).toBe(true);
  });

  it('deletes_item', async () => {
    const ctx = appAs('editor');
    const item = ctx.content.create('classrooms', { name: 'Dragonfly', level: 'TK', campus: 'preschool' });
    const res = await ctx.app.fetch(formPost(`/admin/content/classrooms/${item.id}/delete`, ctx.cookie, {}));
    expect(res.status).toBe(303);
    expect(ctx.content.findById(item.id)).toBeNull();
    expect(ctx.audit.list().some((e) => e.action === 'content.deleted')).toBe(true);
  });

  it('moves_item_up', async () => {
    const ctx = appAs('editor');
    ctx.content.create('classrooms', { name: 'First', level: 'x', campus: 'preschool' });
    const second = ctx.content.create('classrooms', { name: 'Second', level: 'x', campus: 'preschool' });
    const res = await ctx.app.fetch(
      formPost(`/admin/content/classrooms/${second.id}/move`, ctx.cookie, { direction: 'up' }),
    );
    expect(res.status).toBe(303);
    expect(ctx.content.listAll('classrooms').map((i) => i.data['name'])).toEqual(['Second', 'First']);
  });

  it('saves_singleton', async () => {
    const ctx = appAs('editor');
    const res = await ctx.app.fetch(
      formPost('/admin/content/mission-statement', ctx.cookie, {
        tagline: 'Rooted in Oakland.',
        shortMission: 'Short.',
        fullMission: 'Full.',
        missionContext: 'Context.',
        baldwinQuote: 'The children are always ours.',
        baldwinQuoteSource: 'James Baldwin',
      }),
    );
    expect(res.status).toBe(303);
    expect(ctx.content.getSingleton('mission-statement')?.data['tagline']).toBe('Rooted in Oakland.');
  });

  it('unknown_collection_404s', async () => {
    const ctx = appAs('editor');
    const res = await ctx.app.request('/admin/content/nonsense', { headers: { cookie: ctx.cookie } });
    expect(res.status).toBe(404);
  });
});

describe('public content API', () => {
  it('serves_published_list_items_without_auth', async () => {
    const ctx = appAs('editor');
    ctx.content.create('testimonials', { quote: 'Live', source: 'Parent' }, true);
    ctx.content.create('testimonials', { quote: 'Hidden draft', source: 'Parent' }, false);
    const res = await ctx.app.request('/api/content/testimonials');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { kind: string; items: Array<{ quote: string }> };
    expect(body.kind).toBe('list');
    expect(body.items.map((i) => i.quote)).toEqual(['Live']);
  });

  it('serves_singleton_data', async () => {
    const ctx = appAs('editor');
    ctx.content.upsertSingleton('school-stats', { founded: 2012, staffCount: 20 });
    const res = await ctx.app.request('/api/content/school-stats');
    const body = (await res.json()) as { kind: string; data: { founded: number } };
    expect(body.kind).toBe('singleton');
    expect(body.data.founded).toBe(2012);
  });

  it('lists_collections_index', async () => {
    const ctx = appAs('editor');
    const res = await ctx.app.request('/api/content');
    const body = (await res.json()) as { collections: Array<{ slug: string }> };
    expect(body.collections.map((c) => c.slug)).toContain('testimonials');
  });

  it('unknown_collection_is_404', async () => {
    const ctx = appAs('editor');
    const res = await ctx.app.request('/api/content/secrets');
    expect(res.status).toBe(404);
  });
});
