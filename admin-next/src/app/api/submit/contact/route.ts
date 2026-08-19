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

/** General website enquiries. Public by necessity — anyone may ask a question. */
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

  // Silently accept honeypot hits — telling a bot it failed only helps it retry.
  if (isHoneypotTripped(body)) {
    return NextResponse.json({ ok: true }, { status: 201, headers });
  }

  const name = str(body['name'], 200);
  if (!name) {
    return NextResponse.json({ error: 'A name is required' }, { status: 400, headers });
  }

  const payload = await getPayload({ config });
  await payload.create({
    collection: 'contact-requests',
    overrideAccess: true,
    data: {
      status: 'new',
      name,
      email: str(body['email'], 320),
      phone: str(body['phone'], 50),
      message: str(body['message'], 5000),
    },
  });

  return NextResponse.json({ ok: true }, { status: 201, headers });
}
