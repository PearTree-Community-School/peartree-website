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

function renderDashboard(session: ActiveSession): string {
  const fullName = [session.user.firstName, session.user.lastName]
    .filter((part): part is string => Boolean(part))
    .join(' ');
  const displayName = fullName.length > 0 ? fullName : session.user.email;
  const body = `
    <h2 style="margin-top:0">Welcome, ${escapeHtml(displayName)}</h2>
    <p style="color:#6b7280;">You're signed in. Edit site content, manage users, or review the audit log.</p>
    <p>
      <a href="/admin/content" class="button" style="text-decoration:none;display:inline-block;">Edit content →</a>
      <a href="/admin/users" class="button" style="text-decoration:none;display:inline-block;margin-left:0.5rem;background:#f3f4f6;color:#1f2937;border:1px solid #d1d5db;">Manage users →</a>
    </p>
  `;
  return renderLayout({ title: 'Dashboard', currentPath: '/admin', session, body });
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
  app.get('/', (c) => c.redirect('/admin', 302));
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

  // Authenticated routes
  app.get('/admin', requireSession, (c) => c.html(renderDashboard(c.get('session'))));

  const usersRouter = createUsersRouter(users, audit);
  app.use('/admin/users', requireSession, requirePermission('users:manage'));
  app.use('/admin/users/*', requireSession, requirePermission('users:manage'));
  app.use('/admin/audit', requireSession, requirePermission('audit:view'));
  app.route('/', usersRouter);

  const content = dependencies.content ?? createContentRepo(openDatabase(':memory:'));
  const contentRouter = createContentRouter(content, audit);
  app.use('/admin/content', requireSession, requirePermission('content:read'));
  app.use('/admin/content/*', requireSession, requirePermission('content:read'));
  app.route('/', contentRouter);

  // Public content API (published content only) for the Astro site build.
  app.route('/', createContentApi(content));

  return app;
}
