import { Hono } from 'hono';
import type { AuditRepo, AuditEntry } from './audit.js';
import { roles, type Role } from './policy.js';
import type { ActiveSession } from './session.js';
import type { UsersRepo, UserRecord } from './users.js';
import { escapeHtml, flashClearCookie, flashSetCookie, readFlash, renderLayout } from './ui.js';

export type UsersRouteVariables = {
  readonly session: ActiveSession;
};

function isValidRole(value: string): value is Role {
  return (roles as readonly string[]).includes(value);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function statusPill(record: UserRecord): string {
  if (record.workosUserId === null) {
    return `<span class="status-pill status-pending">Pending</span>`;
  }
  return `<span class="status-pill status-${record.status === 'active' ? 'active' : 'disabled'}">${record.status}</span>`;
}

function roleOptions(selected: Role): string {
  return (roles as readonly Role[])
    .map((r) => `<option value="${r}"${r === selected ? ' selected' : ''}>${r}</option>`)
    .join('');
}

function formatDate(d: Date | null): string {
  if (!d) return '—';
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

function renderUsersTable(records: readonly UserRecord[], session: ActiveSession): string {
  const rows = records.map((r) => {
    const isSelf = r.id === session.record.id;
    const roleSelect = isSelf
      ? `<span class="role-pill">${escapeHtml(r.role)}</span>`
      : `<form method="post" action="/admin/users/${r.id}/role" class="inline">
           <select name="role">${roleOptions(r.role)}</select>
           <button type="submit">Save</button>
         </form>`;
    const statusToggle = isSelf
      ? ''
      : r.status === 'active'
      ? `<form method="post" action="/admin/users/${r.id}/status" class="inline">
           <input type="hidden" name="status" value="disabled" />
           <button type="submit" class="danger">Disable</button>
         </form>`
      : `<form method="post" action="/admin/users/${r.id}/status" class="inline">
           <input type="hidden" name="status" value="active" />
           <button type="submit">Re-enable</button>
         </form>`;
    return `<tr>
      <td>${escapeHtml(r.email)}${isSelf ? ' <span style="color:#6b7280;font-size:0.75rem;">(you)</span>' : ''}</td>
      <td>${roleSelect}</td>
      <td>${statusPill(r)}</td>
      <td>${escapeHtml(formatDate(r.lastLoginAt))}</td>
      <td>${statusToggle}</td>
    </tr>`;
  });
  return `<table>
    <thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Last login (UTC)</th><th></th></tr></thead>
    <tbody>${rows.join('\n')}</tbody>
  </table>`;
}

function renderInviteForm(): string {
  return `<form method="post" action="/admin/users" class="invite">
    <label>Email
      <input type="email" name="email" required placeholder="staff@peartree.org" />
    </label>
    <label>Role
      <select name="role">${roleOptions('editor')}</select>
    </label>
    <button type="submit">Invite</button>
  </form>`;
}

export function renderUsersPage(opts: {
  readonly session: ActiveSession;
  readonly users: readonly UserRecord[];
  readonly flash?: { readonly kind: 'success' | 'error'; readonly message: string };
}): string {
  const body = `
    <h2 style="margin-top:0">Users</h2>
    <p style="color:#6b7280;font-size:0.9rem;">Invite staff by email. They become Pending until they sign in with WorkOS for the first time — at which point we link their WorkOS account.</p>
    ${renderInviteForm()}
    ${renderUsersTable(opts.users, opts.session)}
  `;
  return renderLayout({
    title: 'Users',
    currentPath: '/admin/users',
    session: opts.session,
    ...(opts.flash ? { flash: opts.flash } : {}),
    body,
  });
}

export function renderForbidden(session: ActiveSession, permission: string): string {
  const body = `<p>Your role (<span class="role-pill">${escapeHtml(session.role)}</span>) does not have permission <code>${escapeHtml(permission)}</code>.</p>`;
  return renderLayout({
    title: 'Forbidden',
    currentPath: '/admin',
    session,
    body,
  });
}

export function createUsersRouter(users: UsersRepo, audit: AuditRepo): Hono<{ Variables: UsersRouteVariables }> {
  const router = new Hono<{ Variables: UsersRouteVariables }>();

  router.get('/admin/users', (c) => {
    const session = c.get('session');
    const flash = readFlash(c.req.header('cookie'));
    const html = renderUsersPage({
      session,
      users: users.list(),
      ...(flash ? { flash } : {}),
    });
    c.header('Set-Cookie', flashClearCookie, { append: true });
    return c.html(html);
  });

  router.post('/admin/users', async (c) => {
    const form = await c.req.formData();
    const email = String(form.get('email') ?? '').trim();
    const role = String(form.get('role') ?? '');
    if (!isValidEmail(email) || !isValidRole(role)) {
      c.header('Set-Cookie', flashSetCookie({ kind: 'error', message: 'Invalid email or role.' }), { append: true });
      return c.redirect('/admin/users', 303);
    }
    if (users.findByEmail(email)) {
      c.header('Set-Cookie', flashSetCookie({ kind: 'error', message: `User ${email} already exists.` }), { append: true });
      return c.redirect('/admin/users', 303);
    }
    const created = users.create({ email, role });
    const session = c.get('session');
    audit.record({
      action: 'user.invited',
      actorUserId: session.record.id,
      actorEmail: session.record.email,
      targetUserId: created.id,
      targetEmail: created.email,
      summary: `Invited ${email} as ${role}.`,
    });
    c.header('Set-Cookie', flashSetCookie({ kind: 'success', message: `Invited ${email} as ${role}.` }), { append: true });
    return c.redirect('/admin/users', 303);
  });

  router.post('/admin/users/:id/role', async (c) => {
    const session = c.get('session');
    const id = Number(c.req.param('id'));
    const form = await c.req.formData();
    const role = String(form.get('role') ?? '');
    if (!Number.isInteger(id) || !isValidRole(role)) {
      c.header('Set-Cookie', flashSetCookie({ kind: 'error', message: 'Invalid request.' }), { append: true });
      return c.redirect('/admin/users', 303);
    }
    const target = users.findById(id);
    if (!target) {
      c.header('Set-Cookie', flashSetCookie({ kind: 'error', message: 'User not found.' }), { append: true });
      return c.redirect('/admin/users', 303);
    }
    if (target.id === session.record.id) {
      c.header('Set-Cookie', flashSetCookie({ kind: 'error', message: 'You cannot change your own role.' }), { append: true });
      return c.redirect('/admin/users', 303);
    }
    if (target.role === 'super_admin' && role !== 'super_admin' && users.countActiveSuperAdmins() <= 1) {
      c.header('Set-Cookie', flashSetCookie({ kind: 'error', message: 'Cannot demote the last active super_admin.' }), { append: true });
      return c.redirect('/admin/users', 303);
    }
    const previousRole = target.role;
    users.updateRole(id, role);
    audit.record({
      action: 'user.role_changed',
      actorUserId: session.record.id,
      actorEmail: session.record.email,
      targetUserId: target.id,
      targetEmail: target.email,
      summary: `Role: ${previousRole} → ${role}.`,
    });
    c.header('Set-Cookie', flashSetCookie({ kind: 'success', message: `Updated ${target.email} to ${role}.` }), { append: true });
    return c.redirect('/admin/users', 303);
  });

  router.post('/admin/users/:id/status', async (c) => {
    const session = c.get('session');
    const id = Number(c.req.param('id'));
    const form = await c.req.formData();
    const status = String(form.get('status') ?? '');
    if (!Number.isInteger(id) || (status !== 'active' && status !== 'disabled')) {
      c.header('Set-Cookie', flashSetCookie({ kind: 'error', message: 'Invalid request.' }), { append: true });
      return c.redirect('/admin/users', 303);
    }
    const target = users.findById(id);
    if (!target) {
      c.header('Set-Cookie', flashSetCookie({ kind: 'error', message: 'User not found.' }), { append: true });
      return c.redirect('/admin/users', 303);
    }
    if (target.id === session.record.id) {
      c.header('Set-Cookie', flashSetCookie({ kind: 'error', message: 'You cannot change your own status.' }), { append: true });
      return c.redirect('/admin/users', 303);
    }
    if (
      status === 'disabled' &&
      target.role === 'super_admin' &&
      target.status === 'active' &&
      users.countActiveSuperAdmins() <= 1
    ) {
      c.header('Set-Cookie', flashSetCookie({ kind: 'error', message: 'Cannot disable the last active super_admin.' }), { append: true });
      return c.redirect('/admin/users', 303);
    }
    const previousStatus = target.status;
    users.setStatus(id, status);
    audit.record({
      action: 'user.status_changed',
      actorUserId: session.record.id,
      actorEmail: session.record.email,
      targetUserId: target.id,
      targetEmail: target.email,
      summary: `Status: ${previousStatus} → ${status}.`,
    });
    c.header('Set-Cookie', flashSetCookie({ kind: 'success', message: `${status === 'active' ? 'Re-enabled' : 'Disabled'} ${target.email}.` }), { append: true });
    return c.redirect('/admin/users', 303);
  });

  router.get('/admin/audit', (c) => {
    const session = c.get('session');
    const entries = audit.list(200);
    const html = renderAuditPage({ session, entries });
    return c.html(html);
  });

  return router;
}

function formatTimestamp(d: Date): string {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function renderAuditPage(opts: {
  readonly session: ActiveSession;
  readonly entries: readonly AuditEntry[];
}): string {
  const rows = opts.entries
    .map(
      (e) => `<tr>
        <td><code style="font-size:0.8rem;">${escapeHtml(formatTimestamp(e.occurredAt))}</code></td>
        <td>${escapeHtml(e.actorEmail ?? '—')}</td>
        <td><code style="font-size:0.8rem;">${escapeHtml(e.action)}</code></td>
        <td>${escapeHtml(e.targetEmail ?? '—')}</td>
        <td>${escapeHtml(e.summary)}</td>
      </tr>`,
    )
    .join('\n');
  const body = `
    <h2 style="margin-top:0">Audit log</h2>
    <p style="color:#6b7280;font-size:0.9rem;">Every state-changing admin action and sign-in event. Newest first, last 200 shown.</p>
    <table>
      <thead><tr><th>When (UTC)</th><th>Actor</th><th>Action</th><th>Target</th><th>Summary</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" style="color:#6b7280;">No events yet.</td></tr>'}</tbody>
    </table>
  `;
  return renderLayout({
    title: 'Audit log',
    currentPath: '/admin/audit',
    session: opts.session,
    body,
  });
}
