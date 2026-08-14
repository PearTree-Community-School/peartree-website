import { getPayload } from 'payload';
import { NextResponse } from 'next/server';
import config from '@payload-config';
import { canEdit, getSessionUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** Collections and globals the visual editor may touch. */
const COLLECTIONS = new Set(['testimonials', 'parent-faq', 'classrooms']);
const GLOBALS = new Set(['mission-statement', 'school-stats']);

/** Long-form fields render as a textarea rather than a single line. */
const LONG_FIELDS = new Set(['quote', 'answer', 'fullMission', 'missionContext', 'baldwinQuote', 'description']);

/** Fields the editor should never expose — ids, timestamps, ordering internals. */
const HIDDEN = new Set(['id', 'createdAt', 'updatedAt', '_status', 'displayOrder']);

type Field = { key: string; label: string; value: string; long: boolean };

function toFields(doc: Record<string, unknown>): Field[] {
  return Object.entries(doc)
    .filter(([k, v]) => !HIDDEN.has(k) && (typeof v === 'string' || v === null))
    .map(([k, v]) => ({
      key: k,
      label: k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()),
      value: (v as string) ?? '',
      long: LONG_FIELDS.has(k),
    }));
}

/** GET — the editable fields behind one marker on the page. */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const url = new URL(req.url);
  const collection = url.searchParams.get('collection') ?? '';
  const id = url.searchParams.get('id');
  const payload = await getPayload({ config });

  if (GLOBALS.has(collection)) {
    const doc = await payload.findGlobal({ slug: collection as 'mission-statement', overrideAccess: true });
    return NextResponse.json({ kind: 'global', collection, fields: toFields(doc as Record<string, unknown>) });
  }
  if (!COLLECTIONS.has(collection) || !id) {
    return NextResponse.json({ error: 'Unknown content reference' }, { status: 404 });
  }
  const doc = await payload.findByID({
    collection: collection as 'testimonials',
    id: Number(id),
    overrideAccess: true,
  });
  return NextResponse.json({ kind: 'item', collection, id: Number(id), fields: toFields(doc as Record<string, unknown>) });
}

/** PATCH — save edits made in place on the page. */
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  if (!canEdit(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    collection?: string;
    id?: number;
    changes?: Record<string, string>;
  };
  const collection = body.collection ?? '';
  const changes = body.changes ?? {};
  if (Object.keys(changes).length === 0) {
    return NextResponse.json({ error: 'No changes' }, { status: 400 });
  }
  for (const k of Object.keys(changes)) {
    if (HIDDEN.has(k)) return NextResponse.json({ error: `Cannot edit ${k}` }, { status: 400 });
  }

  const payload = await getPayload({ config });

  if (GLOBALS.has(collection)) {
    await payload.updateGlobal({
      slug: collection as 'mission-statement',
      data: changes as never,
      overrideAccess: true,
    });
    return NextResponse.json({ ok: true });
  }
  if (!COLLECTIONS.has(collection) || !body.id) {
    return NextResponse.json({ error: 'Unknown content reference' }, { status: 404 });
  }
  await payload.update({
    collection: collection as 'testimonials',
    id: body.id,
    data: changes as never,
    overrideAccess: true,
  });
  return NextResponse.json({ ok: true });
}
