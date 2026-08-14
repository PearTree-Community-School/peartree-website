import { getPayload } from 'payload';
import { NextResponse } from 'next/server';
import config from '@payload-config';
import { canDelete, canEdit, getSessionUser } from '@/lib/session';
import { getSheet, SHEETS } from '@/lib/sheets-config';

export const dynamic = 'force-dynamic';

/** Only fields declared as columns may be written — the request body is untrusted. */
function editableKeys(slug: string): Set<string> {
  return new Set(getSheet(slug).columns.map((c) => c.key));
}

function knownSlug(slug: string): boolean {
  return SHEETS.some((s) => s.slug === slug);
}

/** PATCH — update one cell (or several) on one row. */
export async function PATCH(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!knownSlug(slug)) return NextResponse.json({ error: 'Unknown sheet' }, { status: 404 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  if (!canEdit(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as { id?: number; changes?: Record<string, unknown> };
  if (!body.id || !body.changes) {
    return NextResponse.json({ error: 'id and changes are required' }, { status: 400 });
  }

  const allowed = editableKeys(slug);
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body.changes)) {
    if (!allowed.has(k)) continue;
    // Empty strings clear a field rather than storing "".
    data[k] = v === '' ? null : v;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No editable fields in request' }, { status: 400 });
  }

  const payload = await getPayload({ config });
  const doc = await payload.update({
    collection: slug as 'tour-requests',
    id: body.id,
    data,
    overrideAccess: true,
  });
  return NextResponse.json({ doc });
}

/** POST — add a blank row, for inquiries that arrive by phone. */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!knownSlug(slug)) return NextResponse.json({ error: 'Unknown sheet' }, { status: 404 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  if (!canEdit(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const sheet = getSheet(slug);
  const payload = await getPayload({ config });
  const seed: Record<string, unknown> =
    slug === 'tour-requests'
      ? { parentName: 'New inquiry', status: 'new', source: 'phone' }
      : { summary: 'New request', requesterName: user.email, status: 'new', source: 'manual' };

  const doc = await payload.create({
    collection: sheet.slug as 'tour-requests',
    data: seed as never,
    overrideAccess: true,
  });
  return NextResponse.json({ doc }, { status: 201 });
}

/** DELETE — remove rows. Restricted to admins; editors can only mark as spam. */
export async function DELETE(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!knownSlug(slug)) return NextResponse.json({ error: 'Unknown sheet' }, { status: 404 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  if (!canDelete(user.role)) {
    return NextResponse.json(
      { error: 'Only admins can delete. Set the status to Spam instead.' },
      { status: 403 },
    );
  }

  const body = (await req.json()) as { ids?: number[] };
  const ids = (body.ids ?? []).filter((n) => Number.isInteger(n));
  if (ids.length === 0) return NextResponse.json({ error: 'No ids given' }, { status: 400 });

  const payload = await getPayload({ config });
  for (const id of ids) {
    await payload.delete({ collection: slug as 'tour-requests', id, overrideAccess: true });
  }
  return NextResponse.json({ deleted: ids.length });
}
