import { NextResponse } from 'next/server';
import { canEdit, getSessionUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

const REPO = 'PearTree-Community-School/peartree-website';
const WORKFLOW = 'pages.yml';
const BRANCH = 'main';

/**
 * Publish = rebuild the static site so CMS edits reach peartreecs.com.
 *
 * The public site is static, so saving content in the admin changes nothing
 * visitors can see until GitHub Actions rebuilds with ADMIN_API_URL set. This
 * triggers that workflow.
 *
 * Needs GITHUB_PUBLISH_TOKEN — a fine-grained token with Actions: read/write
 * on the site repo, and nothing else.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  if (!canEdit(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const token = process.env['GITHUB_PUBLISH_TOKEN'];
  if (!token) {
    return NextResponse.json(
      { error: 'Publishing is not configured yet — GITHUB_PUBLISH_TOKEN is unset.' },
      { status: 503 },
    );
  }

  const res = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: BRANCH }),
    },
  );

  // GitHub answers 204 with no body when the dispatch is accepted.
  if (res.status !== 204) {
    const detail = await res.text();
    return NextResponse.json(
      { error: 'GitHub rejected the publish request', status: res.status, detail: detail.slice(0, 300) },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, startedBy: user.email });
}

/** GET — is the most recent build still running? Drives the publish button. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const token = process.env['GITHUB_PUBLISH_TOKEN'];
  if (!token) return NextResponse.json({ configured: false });

  const res = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/runs?per_page=1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      cache: 'no-store',
    },
  );
  if (!res.ok) return NextResponse.json({ configured: true, unknown: true });

  const data = (await res.json()) as {
    workflow_runs?: Array<{ status: string; conclusion: string | null; html_url: string; created_at: string }>;
  };
  const run = data.workflow_runs?.[0];
  return NextResponse.json({
    configured: true,
    status: run?.status ?? null,
    conclusion: run?.conclusion ?? null,
    url: run?.html_url ?? null,
    startedAt: run?.created_at ?? null,
  });
}
