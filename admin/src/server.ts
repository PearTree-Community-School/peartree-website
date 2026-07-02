import { WorkOS } from '@workos-inc/node';
import { Hono, type MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { AdminEnv } from './config.js';
import type { AuditRepo } from './audit.js';
import { roleHasPermission, type Permission } from './policy.js';
import {
  provisionFromCallback,
  resolveSession,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  type ActiveSession,
  type SessionUser,
} from './session.js';
import { openDatabase, type UsersRepo } from './users.js';
import { createContentRepo, type ContentRepo } from './content.js';
import { createContentApi, createContentRouter } from './content-routes.js';
import { OVERLAY_JS } from './overlay.js';
import type { SiteBuilder } from './site-build.js';
import { serveSiteFile } from './static-site.js';
import { escapeHtml, renderLayout } from './ui.js';
import { createUsersRouter, renderForbidden } from './users-routes.js';
import { recordWorkOSEvent, type WorkOSEvent, type WorkOSWebhookVerifier } from './workos-webhooks.js';

type AuthenticateResult = {
  readonly user: SessionUser;
  readonly sealedSession: string;
};

type SealedSessionAuthenticated =
  | { readonly authenticated: true; readonly user: SessionUser }
  | { readonly authenticated: false };

export type WorkOSAdminClient = {
  readonly userManagement: {
    readonly getAuthorizationUrl: (params: {
      readonly provider: 'authkit';
      readonly clientId: string;
      readonly redirectUri: string;
      readonly organizationId?: string;
    }) => string;
    readonly authenticateWithCode: (params: {
      readonly code: string;
      readonly clientId: string;
      readonly session: { readonly sealSession: true; readonly cookiePassword: string };
    }) => Promise<AuthenticateResult>;
    readonly loadSealedSession: (params: {
      readonly sessionData: string;
      readonly cookiePassword: string;
    }) => { readonly authenticate: () => Promise<SealedSessionAuthenticated> };
  };
  readonly webhooks: WorkOSWebhookVerifier;
};

export type AdminAppDependencies = {
  readonly env: AdminEnv;
  readonly users: UsersRepo;
  readonly audit: AuditRepo;
  /** Defaults to an empty in-memory repo (handy for tests). */
  readonly content?: ContentRepo;
  readonly workos?: WorkOSAdminClient;
  /** When set, the built Astro site is served from this directory at / and rebuilt on content changes. */
  readonly site?: {
    readonly distDir: string;
    readonly builder: SiteBuilder;
  };
};

type AppVariables = { readonly session: ActiveSession };

function createWorkOSClient(env: AdminEnv): WorkOSAdminClient {
  return new WorkOS(env.WORKOS_API_KEY, { clientId: env.WORKOS_CLIENT_ID }) as unknown as WorkOSAdminClient;
}

function getSignInUrl(env: AdminEnv, workos: WorkOSAdminClient): string {
  if (env.WORKOS_ORGANIZATION_ID) {
    return workos.userManagement.getAuthorizationUrl({
      provider: 'authkit',
      clientId: env.WORKOS_CLIENT_ID,
      redirectUri: env.WORKOS_REDIRECT_URI,
      organizationId: env.WORKOS_ORGANIZATION_ID,
    });
  }
  return workos.userManagement.getAuthorizationUrl({
    provider: 'authkit',
    clientId: env.WORKOS_CLIENT_ID,
    redirectUri: env.WORKOS_REDIRECT_URI,
  });
}

function isSecureUrl(url: string): boolean {
  return url.startsWith('https://');
}

function isLoopbackUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === '127.0.0.1' || host === 'localhost' || host === '::1';
  } catch {
    return false;
  }
}

/**
 * Dev-only WorkOS bypass: fakes a session for ADMIN_DEV_BYPASS_EMAIL.
 * Hard-guarded to loopback ADMIN_BASE_URL so it cannot work on a deployed host.
 */
function devBypassSession(env: AdminEnv, users: UsersRepo): ActiveSession | null {
  if (!env.ADMIN_DEV_BYPASS_EMAIL || !isLoopbackUrl(env.ADMIN_BASE_URL)) return null;
  const record = users.findByEmail(env.ADMIN_DEV_BYPASS_EMAIL);
  if (!record || record.status !== 'active') return null;
  return {
    user: {
      id: record.workosUserId ?? 'dev_bypass',
      email: record.email,
      firstName: null,
      lastName: null,
    },
    role: record.role,
    record,
  };
}

type SessionLoadResult =
  | { readonly status: 'active'; readonly session: ActiveSession }
  | { readonly status: 'unauthenticated' }
  | { readonly status: 'unprovisioned'; readonly user: SessionUser };

async function readActiveSession(
  rawCookie: string | undefined,
  env: AdminEnv,
  workos: WorkOSAdminClient,
  users: UsersRepo,
): Promise<SessionLoadResult> {
  if (!rawCookie) {
    return { status: 'unauthenticated' };
  }
  let auth: SealedSessionAuthenticated;
  try {
    auth = await workos.userManagement
      .loadSealedSession({ sessionData: rawCookie, cookiePassword: env.WORKOS_COOKIE_PASSWORD })
      .authenticate();
  } catch {
    return { status: 'unauthenticated' };
  }
  if (!auth.authenticated) {
    return { status: 'unauthenticated' };
  }
  const outcome = resolveSession(users, auth.user);
  if (outcome.status === 'unprovisioned') {
    return { status: 'unprovisioned', user: auth.user };
  }
  return {
    status: 'active',
    session: { user: auth.user, role: outcome.record.role, record: outcome.record },
  };
}

function renderDashboard(session: ActiveSession, siteEnabled: boolean, siteStatus?: string): string {
  const fullName = [session.user.firstName, session.user.lastName]
    .filter((part): part is string => Boolean(part))
    .join(' ');
  const displayName = fullName.length > 0 ? fullName : session.user.email;
  const siteBlock = siteEnabled
    ? `<p>
        <a href="/" class="button" style="text-decoration:none;display:inline-block;background:#047857;">View site →</a>
        <form method="post" action="/admin/site/rebuild" class="inline" style="margin-left:0.5rem;">
          <button type="submit" class="secondary">Rebuild site</button>
        </form>
        ${siteStatus ? `<span style="color:#6b7280;font-size:0.8rem;margin-left:0.75rem;">${escapeHtml(siteStatus)}</span>` : ''}
      </p>
      <p style="color:#6b7280;font-size:0.85rem;">Tip: browse the site while signed in and you'll see Edit buttons on everything editable.</p>`
    : '';
  const body = `
    <h2 style="margin-top:0">Welcome, ${escapeHtml(displayName)}</h2>
    <p style="color:#6b7280;">You're signed in. Edit site content, manage users, or review the audit log.</p>
    <p>
      <a href="/admin/content" class="button" style="text-decoration:none;display:inline-block;">Edit content →</a>
      <a href="/admin/users" class="button" style="text-decoration:none;display:inline-block;margin-left:0.5rem;background:#f3f4f6;color:#1f2937;border:1px solid #d1d5db;">Manage users →</a>
    </p>
    ${siteBlock}
  `;
  return renderLayout({ title: 'Dashboard', currentPath: '/admin', session, body });
}

function describeSiteStatus(status: {
  readonly state: 'idle' | 'building';
  readonly lastResult: 'success' | 'failure' | null;
  readonly lastFinishedAt: Date | null;
  readonly lastError: string | null;
}): string {
  if (status.state === 'building') return 'Site rebuild in progress…';
  if (status.lastResult === 'failure') return `Last rebuild failed: ${status.lastError ?? 'unknown error'}`;
  if (status.lastResult === 'success' && status.lastFinishedAt) {
    return `Site up to date (rebuilt ${status.lastFinishedAt.toISOString().slice(11, 19)} UTC)`;
  }
  return '';
}

function renderUnprovisionedPage(user: SessionUser): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>PearTree Admin — No access</title>
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:4rem auto;padding:0 1rem;color:#1a1a1a;}</style>
</head>
<body>
  <h1>Access not yet provisioned</h1>
  <p>You signed in as <strong>${escapeHtml(user.email)}</strong>, but no role is assigned to this account.</p>
  <p>Ask a PearTree administrator to grant you access.</p>
  <form method="post" action="/auth/sign-out"><button type="submit">Sign out</button></form>
</body>
</html>`;
}

export function createAdminApp(dependencies: AdminAppDependencies): Hono<{ Variables: AppVariables }> {
  const app = new Hono<{ Variables: AppVariables }>();
  const env = dependencies.env;
  const users = dependencies.users;
  const audit = dependencies.audit;
  const workos = dependencies.workos ?? createWorkOSClient(env);
  const secure = isSecureUrl(env.ADMIN_BASE_URL);

  const requireSession: MiddlewareHandler<{ Variables: AppVariables }> = async (c, next) => {
    const bypass = devBypassSession(env, users);
    if (bypass) {
      c.set('session', bypass);
      await next();
      return;
    }
    const sealed = getCookie(c, SESSION_COOKIE_NAME);
    const result = await readActiveSession(sealed, env, workos, users);
    if (result.status === 'unauthenticated') {
      if (sealed) deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' });
      return c.redirect('/auth/sign-in', 302);
    }
    if (result.status === 'unprovisioned') {
      return c.html(renderUnprovisionedPage(result.user), 403);
    }
    c.set('session', result.session);
    await next();
    return;
  };

  const requirePermission =
    (perm: Permission): MiddlewareHandler<{ Variables: AppVariables }> =>
    async (c, next) => {
      const session = c.get('session');
      if (!roleHasPermission(session.role, perm)) {
        return c.html(renderForbidden(session, perm), 403);
      }
      await next();
      return;
    };

  // Public routes
  if (!dependencies.site) {
    app.get('/', (c) => c.redirect('/admin', 302));
  }
  app.get('/health', (c) =>
    c.json({ ok: true, service: 'peartree-admin', publicSite: env.PUBLIC_SITE_BASE_URL }),
  );

  app.post('/webhooks/workos', async (c) => {
    if (!env.WORKOS_WEBHOOK_SECRET) {
      return c.text('Webhook secret not configured', 503);
    }
    const sigHeader = c.req.header('workos-signature');
    if (!sigHeader) {
      return c.text('Missing signature header', 401);
    }
    const rawBody = await c.req.text();
    let event: WorkOSEvent;
    try {
      event = await workos.webhooks.constructEvent({
        payload: rawBody,
        sigHeader,
        secret: env.WORKOS_WEBHOOK_SECRET,
      });
    } catch {
      return c.text('Invalid signature', 401);
    }
    await recordWorkOSEvent(audit, event);
    return c.json({ ok: true });
  });

  app.get('/auth/sign-in', (c) => c.redirect(getSignInUrl(env, workos), 302));

  app.get('/auth/callback', async (c) => {
    const code = c.req.query('code');
    if (!code) {
      return c.text('Missing WorkOS authorization code', 400);
    }
    let result: AuthenticateResult;
    try {
      result = await workos.userManagement.authenticateWithCode({
        code,
        clientId: env.WORKOS_CLIENT_ID,
        session: { sealSession: true, cookiePassword: env.WORKOS_COOKIE_PASSWORD },
      });
    } catch {
      return c.text('Authentication failed', 401);
    }
    provisionFromCallback(users, audit, result.user, env.ADMIN_BOOTSTRAP_EMAILS);
    setCookie(c, SESSION_COOKIE_NAME, result.sealedSession, {
      httpOnly: true,
      secure,
      sameSite: 'Lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return c.redirect('/admin', 302);
  });

  app.post('/auth/sign-out', async (c) => {
    const sealed = getCookie(c, SESSION_COOKIE_NAME);
    if (sealed) {
      try {
        const auth = await workos.userManagement
          .loadSealedSession({ sessionData: sealed, cookiePassword: env.WORKOS_COOKIE_PASSWORD })
          .authenticate();
        if (auth.authenticated) {
          const record = users.findByWorkOSId(auth.user.id);
          audit.record({
            action: 'session.signed_out',
            actorUserId: record?.id ?? null,
            actorEmail: auth.user.email,
            targetUserId: record?.id ?? null,
            targetEmail: auth.user.email,
            summary: 'Signed out.',
          });
        }
      } catch {
        // ignore; signing out should never fail
      }
    }
    deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' });
    return c.redirect(env.PUBLIC_SITE_BASE_URL, 302);
  });

  // Edit-mode probe + overlay script for the public site.
  app.get('/api/edit-mode', async (c) => {
    c.header('Cache-Control', 'no-store');
    const session =
      devBypassSession(env, users) ??
      (await (async () => {
        const sealed = getCookie(c, SESSION_COOKIE_NAME);
        const result = await readActiveSession(sealed, env, workos, users);
        return result.status === 'active' ? result.session : null;
      })());
    const editor = session !== null && roleHasPermission(session.role, 'content:write');
    return c.json({ editor });
  });

  app.get('/overlay.js', (c) => {
    c.header('Cache-Control', 'no-cache');
    return c.text(OVERLAY_JS, 200, { 'Content-Type': 'text/javascript; charset=utf-8' });
  });

  // Authenticated routes
  app.get('/admin', requireSession, (c) => {
    const site = dependencies.site;
    return c.html(
      renderDashboard(c.get('session'), Boolean(site), site ? describeSiteStatus(site.builder.status()) : undefined),
    );
  });

  if (dependencies.site) {
    const builder = dependencies.site.builder;
    app.post('/admin/site/rebuild', requireSession, requirePermission('content:publish'), (c) => {
      builder.requestBuild();
      return c.redirect('/admin', 303);
    });
  }

  const usersRouter = createUsersRouter(users, audit);
  app.use('/admin/users', requireSession, requirePermission('users:manage'));
  app.use('/admin/users/*', requireSession, requirePermission('users:manage'));
  app.use('/admin/audit', requireSession, requirePermission('audit:view'));
  app.route('/', usersRouter);

  const content = dependencies.content ?? createContentRepo(openDatabase(':memory:'));
  const onContentChanged = dependencies.site
    ? (() => {
        const builder = dependencies.site.builder;
        return () => builder.requestBuild();
      })()
    : undefined;
  const contentRouter = createContentRouter(content, audit, onContentChanged);
  app.use('/admin/content', requireSession, requirePermission('content:read'));
  app.use('/admin/content/*', requireSession, requirePermission('content:read'));
  app.route('/', contentRouter);

  // Public content API (published content only) for the Astro site build.
  app.route('/', createContentApi(content));

  // Self-hosted mode: everything else falls through to the built Astro site.
  if (dependencies.site) {
    const distDir = dependencies.site.distDir;
    app.get('*', (c) => serveSiteFile(c, distDir) ?? c.notFound());
  }

  return app;
}
