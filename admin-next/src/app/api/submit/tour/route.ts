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

  // A browser always sends Origin on a cross-site POST. Requiring it keeps the
  // endpoint from being a general-purpose write API.
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

  // Silently accept honeypot hits — telling a bot it failed just helps it retry.
  if (isHoneypotTripped(body)) {
    return NextResponse.json({ ok: true }, { status: 201, headers });
  }

  const parentName = str(body['parentName'], 200);
  if (!parentName) {
    return NextResponse.json({ error: 'A name is required' }, { status: 400, headers });
  }

  const payload = await getPayload({ config });
  await payload.create({
    collection: 'tour-requests',
    // The visitor is unauthenticated by definition; access control on the
    // collection denies public create, so this call is the trusted path in.
    overrideAccess: true,
    data: {
      status: 'new',
      source: 'web_form',
      parentName,
      parentEmail: str(body['parentEmail'], 320),
      parentPhone: str(body['parentPhone'], 50),
      child1Name: str(body['child1Name'], 200),
      child1DOB: str(body['child1DOB'], 40),
      child2Name: str(body['child2Name'], 200),
      child2DOB: str(body['child2DOB'], 40),
      gradeApplyingFor: str(body['gradeApplyingFor'], 100),
      desiredStartDate: str(body['desiredStartDate'], 100),
      campusInterest: str(body['campusInterest'], 200),
    },
  });

  return NextResponse.json({ ok: true }, { status: 201, headers });
}
