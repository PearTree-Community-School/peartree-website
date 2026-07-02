import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createAdminApp, type WorkOSAdminClient } from '../src/server.js';
import type { AdminEnv } from '../src/config.js';
import { createUsersRepo, openDatabase } from '../src/users.js';
import { createAuditRepo } from '../src/audit.js';
import { createContentRepo } from '../src/content.js';
import { createSiteBuilder } from '../src/site-build.js';

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

const stubWorkOS: WorkOSAdminClient = {
  userManagement: {
    getAuthorizationUrl: () => 'https://api.workos.com/user_management/authorize?',
    authenticateWithCode: async () => {
      throw new Error('not used');
    },
    loadSealedSession: () => ({
      authenticate: async () => ({ authenticated: false }),
    }),
  },
  webhooks: {
    constructEvent: () => {
      throw new Error('not stubbed');
    },
  },
};

function makeSiteDist(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'pt-site-'));
  writeFileSync(path.join(dir, 'index.html'), '<html>HOME</html>');
  mkdirSync(path.join(dir, 'about'), { recursive: true });
  writeFileSync(path.join(dir, 'about', 'index.html'), '<html>ABOUT</html>');
  mkdirSync(path.join(dir, '_astro'), { recursive: true });
  writeFileSync(path.join(dir, '_astro', 'x.css'), 'body{}');
  return dir;
}

function makeDeps(env: AdminEnv, opts?: { readonly distDir?: string; readonly onBuild?: () => void }) {
  const db = openDatabase(':memory:');
  const users = createUsersRepo(db);
  const audit = createAuditRepo(db);
  const content = createContentRepo(db);
  users.create({ workosUserId: 'workos_dev', email: 'dev@peartree.org', role: 'super_admin' });
  const builder = createSiteBuilder({
    siteDir: '/nonexistent',
    adminApiUrl: env.ADMIN_BASE_URL,
    runBuild: async () => {
      opts?.onBuild?.();
    },
  });
  const app = createAdminApp({
    env,
    users,
    audit,
    content,
    workos: stubWorkOS,
    ...(opts?.distDir ? { site: { distDir: opts.distDir, builder } } : {}),
  });
  return { app, users, content, builder };
}

const bypassEnv: AdminEnv = { ...baseEnv, ADMIN_DEV_BYPASS_EMAIL: 'dev@peartree.org' };

describe('dev auth bypass', () => {
  it('grants_session_without_cookie_on_loopback', async () => {
    const { app } = makeDeps(bypassEnv);
    const res = await app.request('/admin');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('dev@peartree.org');
  });

  it('is_ignored_when_base_url_is_not_loopback', async () => {
    const { app } = makeDeps({ ...bypassEnv, ADMIN_BASE_URL: 'https://admin.peartreecs.com' });
    const res = await app.request('/admin');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/auth/sign-in');
  });

  it('is_ignored_for_unknown_or_disabled_users', async () => {
    const { app } = makeDeps({ ...bypassEnv, ADMIN_DEV_BYPASS_EMAIL: 'nobody@peartree.org' });
    const res = await app.request('/admin');
    expect(res.status).toBe(302);
  });
});

describe('edit-mode probe', () => {
  it('anonymous_visitor_is_not_editor', async () => {
    const { app } = makeDeps(baseEnv);
    const res = await app.request('/api/edit-mode');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ editor: false });
  });

  it('bypass_editor_is_editor', async () => {
    const { app } = makeDeps(bypassEnv);
    const res = await app.request('/api/edit-mode');
    expect(await res.json()).toEqual({ editor: true });
  });

  it('overlay_script_is_served', async () => {
    const { app } = makeDeps(baseEnv);
    const res = await app.request('/overlay.js');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('javascript');
    expect(await res.text()).toContain('data-cms-item');
  });
});

describe('static site serving', () => {
  it('serves_index_about_and_assets_with_cache_headers', async () => {
    const dist = makeSiteDist();
    const { app } = makeDeps(baseEnv, { distDir: dist });
    const home = await app.request('/');
    expect(home.status).toBe(200);
    expect(await home.text()).toContain('HOME');
    expect(home.headers.get('cache-control')).toBe('no-cache');
    const about = await app.request('/about');
    expect(await about.text()).toContain('ABOUT');
    const css = await app.request('/_astro/x.css');
    expect(css.status).toBe(200);
    expect(css.headers.get('cache-control')).toContain('immutable');
  });

  it('unknown_paths_404_and_traversal_is_blocked', async () => {
    const dist = makeSiteDist();
    const { app } = makeDeps(baseEnv, { distDir: dist });
    expect((await app.request('/nope')).status).toBe(404);
    expect((await app.request('/..%2f..%2fetc%2fpasswd')).status).toBe(404);
  });

  it('admin_routes_still_win_over_site', async () => {
    const dist = makeSiteDist();
    const { app } = makeDeps({ ...bypassEnv }, { distDir: dist });
    const res = await app.request('/admin');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('PearTree Admin');
  });
});

describe('rebuild-on-change', () => {
  it('content_save_triggers_site_rebuild', async () => {
    const dist = makeSiteDist();
    let builds = 0;
    const { app } = makeDeps(bypassEnv, { distDir: dist, onBuild: () => (builds += 1) });
    const res = await app.fetch(
      new Request('http://localhost/admin/content/testimonials', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ quote: 'New quote', source: 'Parent' }).toString(),
      }),
    );
    expect(res.status).toBe(303);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(builds).toBe(1);
  });

  it('rebuild_endpoint_requires_publish_permission', async () => {
    const dist = makeSiteDist();
    let builds = 0;
    const { app } = makeDeps(bypassEnv, { distDir: dist, onBuild: () => (builds += 1) });
    const res = await app.request('/admin/site/rebuild', { method: 'POST' });
    expect(res.status).toBe(303);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(builds).toBe(1);
  });
});

describe('site builder coalescing', () => {
  it('queues_at_most_one_build_while_building', async () => {
    let running = 0;
    let total = 0;
    const releases: Array<() => void> = [];
    const builder = createSiteBuilder({
      siteDir: '/x',
      adminApiUrl: 'http://127.0.0.1:4177',
      runBuild: () =>
        new Promise<void>((resolve) => {
          running += 1;
          total += 1;
          releases.push(() => {
            running -= 1;
            resolve();
          });
        }),
    });
    builder.requestBuild();
    builder.requestBuild();
    builder.requestBuild();
    expect(running).toBe(1);
    expect(builder.status().queued).toBe(true);
    releases.shift()?.();
    await new Promise((r) => setTimeout(r, 5));
    expect(total).toBe(2);
    releases.shift()?.();
    await new Promise((r) => setTimeout(r, 5));
    expect(builder.status().state).toBe('idle');
    expect(builder.status().lastResult).toBe('success');
  });

  it('records_failures', async () => {
    const builder = createSiteBuilder({
      siteDir: '/x',
      adminApiUrl: 'http://127.0.0.1:4177',
      runBuild: async () => {
        throw new Error('boom');
      },
    });
    builder.requestBuild();
    await new Promise((r) => setTimeout(r, 5));
    expect(builder.status().lastResult).toBe('failure');
    expect(builder.status().lastError).toContain('boom');
  });
});

describe('return-to-page after save', () => {
  it('redirects_back_to_site_page', async () => {
    const { app, content } = makeDeps(bypassEnv);
    const item = content.create('testimonials', { quote: 'Old', source: 'Parent' });
    const res = await app.fetch(
      new Request(`http://localhost/admin/content/testimonials/${item.id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ quote: 'New', source: 'Parent', returnTo: '/v2/admissions' }).toString(),
      }),
    );
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/v2/admissions');
  });

  it('rejects_offsite_return_targets', async () => {
    const { app, content } = makeDeps(bypassEnv);
    const item = content.create('testimonials', { quote: 'Old', source: 'Parent' });
    const res = await app.fetch(
      new Request(`http://localhost/admin/content/testimonials/${item.id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ quote: 'New', source: 'Parent', returnTo: '//evil.example' }).toString(),
      }),
    );
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/admin/content/testimonials');
  });
});
