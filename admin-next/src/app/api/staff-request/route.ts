import { getPayload } from 'payload';
import { NextResponse } from 'next/server';
import config from '@payload-config';
import { getSessionUser } from '@/lib/session';
import { CATEGORY_IDS, PRIORITIES } from '@/lib/staff-request-form';

export const dynamic = 'force-dynamic';

function str(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t ? t.slice(0, max) : undefined;
}

/**
 * Staff work requests. Unlike the parent tour form this is never public — any
 * signed-in staff member may file one, and the requester is taken from the
 * session rather than a form field, so a request cannot be filed under someone
 * else's name.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;

  const summary = str(body['summary'], 300);
  const description = str(body['description'], 5000);
  if (!summary) return NextResponse.json({ error: 'A short summary is required' }, { status: 400 });

  const rawCategory = str(body['category'], 60);
  const category = rawCategory && CATEGORY_IDS.has(rawCategory) ? rawCategory : 'other';

  const rawPriority = str(body['priority'], 20);
  const priority = (PRIORITIES as readonly string[]).includes(rawPriority ?? '')
    ? rawPriority
    : 'Medium';

  const payload = await getPayload({ config });
  const doc = await payload.create({
    collection: 'staff-requests',
    overrideAccess: true,
    data: {
      status: 'new',
      source: 'web_form',
      summary,
      description,
      category: category as never,
      priority: priority as never,
      location: str(body['location'], 200),
      neededBy: str(body['neededBy'], 40),
      // Identity comes from the session, not the payload.
      requesterName: str(body['requesterName'], 200) ?? user.email,
      requesterEmail: user.email,
    },
  });

  return NextResponse.json({ ok: true, id: (doc as { id: number }).id }, { status: 201 });
}
