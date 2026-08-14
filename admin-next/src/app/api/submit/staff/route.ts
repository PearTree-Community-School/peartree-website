import { getPayload } from 'payload';
import { NextResponse } from 'next/server';
import config from '@payload-config';
import {
  clientIp,
  corsHeaders,
  isAllowedOrigin,
  isHoneypotTripped,
  isRateLimited,
  str,
} from '@/lib/submissions';

export const dynamic = 'force-dynamic';

/**
 * The staff portal's category dropdown submits the human-readable label, while
 * the collection stores the id. Accept either so the form and the schema can
 * drift independently without dropping submissions.
 */
const CATEGORY_BY_LABEL: Readonly<Record<string, string>> = {
  'facilities & maintenance': 'facilities',
  'classroom supplies': 'supplies',
  'technology support': 'tech',
  'montessori materials': 'montessori',
  'plants & classroom pets': 'plants-pets',
  'curriculum & books': 'curriculum',
  'hr / administrative': 'hr',
  'room booking': 'room-booking',
  other: 'other',
};

const CATEGORY_IDS = new Set(Object.values(CATEGORY_BY_LABEL));

function normalizeCategory(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const value = raw.trim();
  if (CATEGORY_IDS.has(value)) return value;
  // Unknown labels fall through to 'other' rather than failing the submission.
  return CATEGORY_BY_LABEL[value.toLowerCase()] ?? 'other';
}

export function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) });
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);

  if (!isAllowedOrigin(origin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers });
  }

  if (isRateLimited(clientIp(req.headers))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers });
  }

  if (isHoneypotTripped(body)) {
    return NextResponse.json({ ok: true }, { status: 201, headers });
  }

  const requesterName = str(body['requesterName'], 200);
  const summary = str(body['summary'], 300);
  if (!requesterName || !summary) {
    return NextResponse.json(
      { error: 'A name and a summary are required' },
      { status: 400, headers },
    );
  }

  const payload = await getPayload({ config });
  await payload.create({
    collection: 'staff-requests',
    overrideAccess: true,
    data: {
      status: 'new',
      source: 'web_form',
      requesterName,
      requesterEmail: str(body['requesterEmail'], 320),
      summary,
      description: str(body['description'], 5000),
      category: normalizeCategory(str(body['category'], 80)) as never,
      priority: (str(body['priority'], 20) ?? 'Medium') as never,
      location: str(body['location'], 200),
      neededBy: str(body['neededBy'], 40),
    },
  });

  return NextResponse.json({ ok: true }, { status: 201, headers });
}
