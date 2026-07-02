import type { ActiveSession } from './session.js';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const baseStyles = `
  :root { color-scheme: light; }
  body { font-family: system-ui, sans-serif; max-width: 960px; margin: 0 auto; padding: 1.5rem 1rem 4rem; color: #1a1a1a; }
  header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 1rem; border-bottom: 1px solid #e5e7eb; margin-bottom: 2rem; }
  header h1 { font-size: 1.1rem; margin: 0; }
  nav { display: flex; gap: 1rem; }
  nav a { text-decoration: none; color: #1f2937; font-size: 0.9rem; padding: 0.25rem 0.5rem; border-radius: 4px; }
  nav a.active { background: #eef2ff; color: #3730a3; }
  .me { font-size: 0.8rem; color: #555; }
  .role-pill { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; background: #eef2ff; color: #3730a3; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .status-pill { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .status-active { background: #ecfdf5; color: #047857; }
  .status-disabled { background: #fef2f2; color: #b91c1c; }
  .status-pending { background: #fef3c7; color: #92400e; }
  button, .button { background: #1f2937; color: #fff; border: 0; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
  button.secondary { background: #f3f4f6; color: #1f2937; border: 1px solid #d1d5db; }
  button.danger { background: #b91c1c; }
  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  th, td { text-align: left; padding: 0.6rem 0.5rem; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
  th { font-size: 0.75rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
  form.inline { display: inline; }
  form.inline + form.inline { margin-left: 0.25rem; }
  select, input[type="email"], input[type="text"], input[type="number"], textarea { padding: 0.4rem 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.9rem; font-family: inherit; }
  textarea { width: 100%; min-height: 6rem; resize: vertical; box-sizing: border-box; }
  input[type="text"], input[type="number"] { width: 100%; box-sizing: border-box; }
  .field { margin-bottom: 1rem; max-width: 640px; }
  .field label { display: block; font-size: 0.8rem; color: #374151; font-weight: 600; margin-bottom: 0.3rem; }
  .field .help { font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem; }
  .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
  .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; text-decoration: none; color: inherit; display: block; }
  .card:hover { border-color: #a5b4fc; }
  .card h3 { margin: 0 0 0.25rem; font-size: 1rem; }
  .card p { margin: 0 0 0.5rem; color: #6b7280; font-size: 0.85rem; }
  .card .meta { font-size: 0.75rem; color: #6b7280; }
  .actions { display: flex; gap: 0.25rem; align-items: center; }
  .order-btn { background: #f3f4f6; color: #1f2937; border: 1px solid #d1d5db; padding: 0.2rem 0.5rem; }
  .invite { background: #f9fafb; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; display: flex; gap: 0.5rem; align-items: end; flex-wrap: wrap; }
  .invite label { display: flex; flex-direction: column; font-size: 0.75rem; color: #6b7280; gap: 0.25rem; }
  .flash { padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.9rem; }
  .flash-success { background: #ecfdf5; color: #065f46; }
  .flash-error { background: #fef2f2; color: #991b1b; }
`;

function navItem(href: string, label: string, current: string): string {
  const active = current === href || (href !== '/admin' && current.startsWith(`${href}/`));
  const cls = active ? ' class="active"' : '';
  return `<a href="${href}"${cls}>${label}</a>`;
}

export type FlashMessage = { readonly kind: 'success' | 'error'; readonly message: string };

export function readFlash(cookieHeader: string | undefined): FlashMessage | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(/(?:^|;\s*)pt_flash=([^;]+)/);
  if (!match || !match[1]) return undefined;
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'kind' in parsed &&
      'message' in parsed &&
      (parsed.kind === 'success' || parsed.kind === 'error') &&
      typeof parsed.message === 'string'
    ) {
      return { kind: parsed.kind, message: parsed.message };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function flashSetCookie(flash: FlashMessage): string {
  return `pt_flash=${encodeURIComponent(JSON.stringify(flash))}; Path=/; Max-Age=10; SameSite=Lax`;
}

export const flashClearCookie = 'pt_flash=; Path=/; Max-Age=0; SameSite=Lax';

export function renderLayout(opts: {
  readonly title: string;
  readonly currentPath: string;
  readonly session: ActiveSession;
  readonly flash?: { readonly kind: 'success' | 'error'; readonly message: string };
  readonly body: string;
}): string {
  const flashHtml = opts.flash
    ? `<div class="flash flash-${opts.flash.kind}">${escapeHtml(opts.flash.message)}</div>`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(opts.title)} — PearTree Admin</title>
<style>${baseStyles}</style>
</head>
<body>
<header>
  <h1>PearTree Admin</h1>
  <nav>
    ${navItem('/admin', 'Dashboard', opts.currentPath)}
    ${navItem('/admin/content', 'Content', opts.currentPath)}
    ${navItem('/admin/users', 'Users', opts.currentPath)}
    ${navItem('/admin/audit', 'Audit log', opts.currentPath)}
  </nav>
  <div class="me">${escapeHtml(opts.session.user.email)} <span class="role-pill">${escapeHtml(opts.session.role)}</span> &middot; <form method="post" action="/auth/sign-out" class="inline"><button class="secondary" type="submit">Sign out</button></form></div>
</header>
${flashHtml}
${opts.body}
</body>
</html>`;
}
