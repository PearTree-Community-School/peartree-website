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
      category: str(body['category'], 50) as never,
      priority: (str(body['priority'], 20) ?? 'Medium') as never,
      location: str(body['location'], 200),
      neededBy: str(body['neededBy'], 40),
    },
  });

  return NextResponse.json({ ok: true }, { status: 201, headers });
}
