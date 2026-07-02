import { Hono } from 'hono';
import type { AuditRepo } from './audit.js';
import type { ContentItem, ContentRepo } from './content.js';
import {
  collections,
  findCollection,
  parseContentForm,
  type CollectionDef,
  type FieldDef,
} from './content-schema.js';
import { roleHasPermission } from './policy.js';
import type { ActiveSession } from './session.js';
import {
  escapeHtml,
  flashClearCookie,
  flashSetCookie,
  readFlash,
  renderLayout,
  type FlashMessage,
} from './ui.js';
import { renderForbidden } from './users-routes.js';

export type ContentRouteVariables = {
  readonly session: ActiveSession;
};

function canWrite(session: ActiveSession): boolean {
  return roleHasPermission(session.role, 'content:write');
}

function canPublish(session: ActiveSession): boolean {
  return roleHasPermission(session.role, 'content:publish');
}

function truncate(value: string, max = 90): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function itemTitle(def: CollectionDef, item: ContentItem): string {
  const raw = item.data[def.titleField];
  const title = typeof raw === 'string' ? raw : String(raw ?? '');
  return title.length > 0 ? truncate(title) : `(item ${item.id})`;
}

function fieldInput(field: FieldDef, value: unknown): string {
  const current = value === undefined || value === null ? '' : String(value);
  const required = field.required ? ' required' : '';
  switch (field.type) {
    case 'textarea':
      return `<textarea name="${field.name}"${required}>${escapeHtml(current)}</textarea>`;
    case 'number':
      return `<input type="number" name="${field.name}" value="${escapeHtml(current)}" step="any"${required} />`;
    case 'select': {
      const options = (field.options ?? [])
        .map((o) => `<option value="${escapeHtml(o)}"${o === current ? ' selected' : ''}>${escapeHtml(o)}</option>`)
        .join('');
      return `<select name="${field.name}"${required}>${options}</select>`;
    }
    default:
      return `<input type="text" name="${field.name}" value="${escapeHtml(current)}"${required} />`;
  }
}

function renderFields(def: CollectionDef, data: Readonly<Record<string, unknown>>): string {
  return def.fields
    .map(
      (f) => `<div class="field">
        <label>${escapeHtml(f.label)}${f.required ? '' : ' <span style="color:#9ca3af;font-weight:400;">(optional)</span>'}</label>
        ${fieldInput(f, data[f.name])}
        ${f.help ? `<div class="help">${escapeHtml(f.help)}</div>` : ''}
      </div>`,
    )
    .join('\n');
}

function renderOverview(session: ActiveSession, content: ContentRepo, flash?: FlashMessage): string {
  const cards = collections
    .map((def) => {
      const counts = content.counts(def.slug);
      const meta =
        def.kind === 'singleton'
          ? counts.total > 0
            ? 'Configured'
            : 'Not yet configured'
          : `${counts.total} item${counts.total === 1 ? '' : 's'} · ${counts.published} published`;
      return `<a class="card" href="/admin/content/${def.slug}">
        <h3>${escapeHtml(def.label)}</h3>
        <p>${escapeHtml(def.description)}</p>
        <span class="meta">${escapeHtml(meta)}</span>
      </a>`;
    })
    .join('\n');
  const body = `
    <h2 style="margin-top:0">Content</h2>
    <p style="color:#6b7280;font-size:0.9rem;">Everything here feeds the public site. Published changes are picked up on the next site build/deploy.</p>
    <div class="card-grid">${cards}</div>
  `;
  return renderLayout({
    title: 'Content',
    currentPath: '/admin/content',
    session,
    ...(flash ? { flash } : {}),
    body,
  });
}

function renderListPage(opts: {
  readonly session: ActiveSession;
  readonly def: CollectionDef;
  readonly items: readonly ContentItem[];
  readonly flash?: FlashMessage;
}): string {
  const { session, def, items } = opts;
  const write = canWrite(session);
  const publish = canPublish(session);
  const rows = items
    .map((item, index) => {
      const publishedPill = item.published
        ? '<span class="status-pill status-active">published</span>'
        : '<span class="status-pill status-pending">draft</span>';
      const moveButtons = write
        ? `${
            index > 0
              ? `<form method="post" action="/admin/content/${def.slug}/${item.id}/move" class="inline"><input type="hidden" name="direction" value="up" /><button type="submit" class="order-btn" title="Move up">↑</button></form>`
              : ''
          }${
            index < items.length - 1
              ? `<form method="post" action="/admin/content/${def.slug}/${item.id}/move" class="inline"><input type="hidden" name="direction" value="down" /><button type="submit" class="order-btn" title="Move down">↓</button></form>`
              : ''
          }`
        : '';
      const publishToggle = publish
        ? `<form method="post" action="/admin/content/${def.slug}/${item.id}/publish" class="inline">
             <input type="hidden" name="published" value="${item.published ? '0' : '1'}" />
             <button type="submit" class="secondary">${item.published ? 'Unpublish' : 'Publish'}</button>
           </form>`
        : '';
      const deleteButton = write
        ? `<form method="post" action="/admin/content/${def.slug}/${item.id}/delete" class="inline" onsubmit="return confirm('Delete this item? This cannot be undone.');">
             <button type="submit" class="danger">Delete</button>
           </form>`
        : '';
      const title = write
        ? `<a href="/admin/content/${def.slug}/${item.id}">${escapeHtml(itemTitle(def, item))}</a>`
        : escapeHtml(itemTitle(def, item));
      return `<tr>
        <td>${title}</td>
        <td>${publishedPill}</td>
        <td><div class="actions">${moveButtons}${publishToggle}${deleteButton}</div></td>
      </tr>`;
    })
    .join('\n');
  const newButton = write
    ? `<p><a href="/admin/content/${def.slug}/new" class="button" style="text-decoration:none;display:inline-block;">+ New item</a></p>`
    : '';
  const body = `
    <p style="margin-top:0;"><a href="/admin/content" style="color:#6b7280;font-size:0.85rem;text-decoration:none;">← All content</a></p>
    <h2 style="margin-top:0.25rem;">${escapeHtml(def.label)}</h2>
    <p style="color:#6b7280;font-size:0.9rem;">${escapeHtml(def.description)} Items appear on the site in this order.</p>
    ${newButton}
    <table>
      <thead><tr><th>${escapeHtml(def.label.replace(/s$/, ''))}</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows || `<tr><td colspan="3" style="color:#6b7280;">No items yet.</td></tr>`}</tbody>
    </table>
  `;
  return renderLayout({
    title: def.label,
    currentPath: '/admin/content',
    session,
    ...(opts.flash ? { flash: opts.flash } : {}),
    body,
  });
}

function renderItemForm(opts: {
  readonly session: ActiveSession;
  readonly def: CollectionDef;
  readonly item: ContentItem | null;
  readonly flash?: FlashMessage;
}): string {
  const { session, def, item } = opts;
  const isNew = item === null;
  const action = isNew ? `/admin/content/${def.slug}` : `/admin/content/${def.slug}/${item.id}`;
  const body = `
    <p style="margin-top:0;"><a href="/admin/content/${def.slug}" style="color:#6b7280;font-size:0.85rem;text-decoration:none;">← ${escapeHtml(def.label)}</a></p>
    <h2 style="margin-top:0.25rem;">${isNew ? `New ${escapeHtml(def.label)} item` : `Edit ${escapeHtml(itemTitle(def, item))}`}</h2>
    <form method="post" action="${action}">
      ${renderFields(def, item?.data ?? {})}
      <button type="submit">${isNew ? 'Create' : 'Save changes'}</button>
      <a href="/admin/content/${def.slug}" class="button secondary" style="text-decoration:none;display:inline-block;background:#f3f4f6;color:#1f2937;border:1px solid #d1d5db;margin-left:0.5rem;">Cancel</a>
    </form>
  `;
  return renderLayout({
    title: isNew ? `New — ${def.label}` : `Edit — ${def.label}`,
    currentPath: '/admin/content',
    session,
    ...(opts.flash ? { flash: opts.flash } : {}),
    body,
  });
}

function renderSingletonPage(opts: {
  readonly session: ActiveSession;
  readonly def: CollectionDef;
  readonly item: ContentItem | null;
  readonly flash?: FlashMessage;
}): string {
  const { session, def, item } = opts;
  const write = canWrite(session);
  const fields = write
    ? `<form method="post" action="/admin/content/${def.slug}">
        ${renderFields(def, item?.data ?? {})}
        <button type="submit">Save</button>
      </form>`
    : renderFields(def, item?.data ?? {}).replace(/<(input|textarea|select)/g, '<$1 disabled');
  const body = `
    <p style="margin-top:0;"><a href="/admin/content" style="color:#6b7280;font-size:0.85rem;text-decoration:none;">← All content</a></p>
    <h2 style="margin-top:0.25rem;">${escapeHtml(def.label)}</h2>
    <p style="color:#6b7280;font-size:0.9rem;">${escapeHtml(def.description)}</p>
    ${fields}
  `;
  return renderLayout({
    title: def.label,
    currentPath: '/admin/content',
    session,
    ...(opts.flash ? { flash: opts.flash } : {}),
    body,
  });
}

function redirectWithFlash(
  c: { header: (name: string, value: string, opts: { append: boolean }) => void; redirect: (to: string, status: 303) => Response },
  to: string,
  flash: FlashMessage,
): Response {
  c.header('Set-Cookie', flashSetCookie(flash), { append: true });
  return c.redirect(to, 303);
}

export function createContentRouter(
  content: ContentRepo,
  audit: AuditRepo,
): Hono<{ Variables: ContentRouteVariables }> {
  const router = new Hono<{ Variables: ContentRouteVariables }>();

  const auditContent = (
    session: ActiveSession,
    action: 'content.created' | 'content.updated' | 'content.deleted' | 'content.published' | 'content.unpublished' | 'content.reordered',
    summary: string,
  ): void => {
    audit.record({
      action,
      actorUserId: session.record.id,
      actorEmail: session.record.email,
      summary,
    });
  };

  router.get('/admin/content', (c) => {
    const session = c.get('session');
    const flash = readFlash(c.req.header('cookie'));
    c.header('Set-Cookie', flashClearCookie, { append: true });
    return c.html(renderOverview(session, content, flash));
  });

  router.get('/admin/content/:slug', (c) => {
    const session = c.get('session');
    const def = findCollection(c.req.param('slug'));
    if (!def) return c.notFound();
    const flash = readFlash(c.req.header('cookie'));
    c.header('Set-Cookie', flashClearCookie, { append: true });
    if (def.kind === 'singleton') {
      const item = content.getSingleton(def.slug);
      return c.html(renderSingletonPage({ session, def, item, ...(flash ? { flash } : {}) }));
    }
    const items = content.listAll(def.slug);
    return c.html(renderListPage({ session, def, items, ...(flash ? { flash } : {}) }));
  });

  router.get('/admin/content/:slug/new', (c) => {
    const session = c.get('session');
    const def = findCollection(c.req.param('slug'));
    if (!def || def.kind !== 'list') return c.notFound();
    if (!canWrite(session)) return c.html(renderForbidden(session, 'content:write'), 403);
    return c.html(renderItemForm({ session, def, item: null }));
  });

  // Create (list) or save (singleton).
  router.post('/admin/content/:slug', async (c) => {
    const session = c.get('session');
    const def = findCollection(c.req.param('slug'));
    if (!def) return c.notFound();
    if (!canWrite(session)) return c.html(renderForbidden(session, 'content:write'), 403);
    const parsed = parseContentForm(def, await c.req.formData());
    if (!parsed.ok) {
      const back = def.kind === 'singleton' ? `/admin/content/${def.slug}` : `/admin/content/${def.slug}/new`;
      return redirectWithFlash(c, back, { kind: 'error', message: parsed.message });
    }
    if (def.kind === 'singleton') {
      content.upsertSingleton(def.slug, parsed.data);
      auditContent(session, 'content.updated', `Updated ${def.label}.`);
      return redirectWithFlash(c, `/admin/content/${def.slug}`, { kind: 'success', message: `${def.label} saved.` });
    }
    const item = content.create(def.slug, parsed.data, canPublish(session));
    auditContent(session, 'content.created', `Created ${def.label} item #${item.id}: ${itemTitle(def, item)}`);
    const note = item.published ? 'Created and published.' : 'Created as draft — an editor must publish it.';
    return redirectWithFlash(c, `/admin/content/${def.slug}`, { kind: 'success', message: note });
  });

  router.get('/admin/content/:slug/:id', (c) => {
    const session = c.get('session');
    const def = findCollection(c.req.param('slug'));
    const id = Number(c.req.param('id'));
    if (!def || def.kind !== 'list' || !Number.isInteger(id)) return c.notFound();
    if (!canWrite(session)) return c.html(renderForbidden(session, 'content:write'), 403);
    const item = content.findById(id);
    if (!item || item.collection !== def.slug) return c.notFound();
    const flash = readFlash(c.req.header('cookie'));
    c.header('Set-Cookie', flashClearCookie, { append: true });
    return c.html(renderItemForm({ session, def, item, ...(flash ? { flash } : {}) }));
  });

  router.post('/admin/content/:slug/:id', async (c) => {
    const session = c.get('session');
    const def = findCollection(c.req.param('slug'));
    const id = Number(c.req.param('id'));
    if (!def || def.kind !== 'list' || !Number.isInteger(id)) return c.notFound();
    if (!canWrite(session)) return c.html(renderForbidden(session, 'content:write'), 403);
    const item = content.findById(id);
    if (!item || item.collection !== def.slug) return c.notFound();
    const parsed = parseContentForm(def, await c.req.formData());
    if (!parsed.ok) {
      return redirectWithFlash(c, `/admin/content/${def.slug}/${id}`, { kind: 'error', message: parsed.message });
    }
    const updated = content.update(id, parsed.data);
    auditContent(session, 'content.updated', `Updated ${def.label} item #${id}: ${itemTitle(def, updated)}`);
    return redirectWithFlash(c, `/admin/content/${def.slug}`, { kind: 'success', message: 'Saved.' });
  });

  router.post('/admin/content/:slug/:id/delete', async (c) => {
    const session = c.get('session');
    const def = findCollection(c.req.param('slug'));
    const id = Number(c.req.param('id'));
    if (!def || def.kind !== 'list' || !Number.isInteger(id)) return c.notFound();
    if (!canWrite(session)) return c.html(renderForbidden(session, 'content:write'), 403);
    const item = content.findById(id);
    if (!item || item.collection !== def.slug) return c.notFound();
    content.remove(id);
    auditContent(session, 'content.deleted', `Deleted ${def.label} item #${id}: ${itemTitle(def, item)}`);
    return redirectWithFlash(c, `/admin/content/${def.slug}`, { kind: 'success', message: 'Deleted.' });
  });

  router.post('/admin/content/:slug/:id/publish', async (c) => {
    const session = c.get('session');
    const def = findCollection(c.req.param('slug'));
    const id = Number(c.req.param('id'));
    if (!def || def.kind !== 'list' || !Number.isInteger(id)) return c.notFound();
    if (!canPublish(session)) return c.html(renderForbidden(session, 'content:publish'), 403);
    const item = content.findById(id);
    if (!item || item.collection !== def.slug) return c.notFound();
    const form = await c.req.formData();
    const published = String(form.get('published') ?? '') === '1';
    content.setPublished(id, published);
    auditContent(
      session,
      published ? 'content.published' : 'content.unpublished',
      `${published ? 'Published' : 'Unpublished'} ${def.label} item #${id}: ${itemTitle(def, item)}`,
    );
    return redirectWithFlash(c, `/admin/content/${def.slug}`, {
      kind: 'success',
      message: published ? 'Published.' : 'Unpublished.',
    });
  });

  router.post('/admin/content/:slug/:id/move', async (c) => {
    const session = c.get('session');
    const def = findCollection(c.req.param('slug'));
    const id = Number(c.req.param('id'));
    if (!def || def.kind !== 'list' || !Number.isInteger(id)) return c.notFound();
    if (!canWrite(session)) return c.html(renderForbidden(session, 'content:write'), 403);
    const form = await c.req.formData();
    const direction = String(form.get('direction') ?? '');
    if (direction !== 'up' && direction !== 'down') {
      return redirectWithFlash(c, `/admin/content/${def.slug}`, { kind: 'error', message: 'Invalid direction.' });
    }
    const moved = content.move(id, direction);
    if (moved) {
      auditContent(session, 'content.reordered', `Moved ${def.label} item #${id} ${direction}.`);
    }
    return c.redirect(`/admin/content/${def.slug}`, 303);
  });

  return router;
}

/** Public, unauthenticated JSON API the Astro site fetches at build time. */
export function createContentApi(content: ContentRepo): Hono {
  const api = new Hono();

  api.get('/api/content', (c) => {
    c.header('Access-Control-Allow-Origin', '*');
    return c.json({
      collections: collections.map((def) => ({
        slug: def.slug,
        label: def.label,
        kind: def.kind,
      })),
    });
  });

  api.get('/api/content/:slug', (c) => {
    const def = findCollection(c.req.param('slug'));
    if (!def) {
      return c.json({ error: 'Unknown collection' }, 404);
    }
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Cache-Control', 'no-store');
    if (def.kind === 'singleton') {
      const item = content.getSingleton(def.slug);
      return c.json({ kind: 'singleton', slug: def.slug, data: item?.data ?? null });
    }
    const items = content.listPublished(def.slug).map((item) => ({ id: item.id, ...item.data }));
    return c.json({ kind: 'list', slug: def.slug, items });
  });

  return api;
}
