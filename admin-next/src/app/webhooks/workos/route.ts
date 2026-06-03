import { getPayload } from 'payload';
import { NextResponse, type NextRequest } from 'next/server';
import config from '@payload-config';
import { getEnv } from '@/lib/env';
import { getWorkOS } from '@/lib/workos';
import { eventToAuditEntry, type WorkOSEvent } from '@/lib/workos-webhooks';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const env = getEnv();
  if (!env.WORKOS_WEBHOOK_SECRET) {
    return new NextResponse('Webhook secret not configured', { status: 503 });
  }
  const sigHeader = req.headers.get('workos-signature');
  if (!sigHeader) {
    return new NextResponse('Missing signature header', { status: 401 });
  }
  const rawBody = await req.text();
  let event: WorkOSEvent;
  try {
    event = (await getWorkOS().webhooks.constructEvent({
      payload: rawBody,
      sigHeader,
      secret: env.WORKOS_WEBHOOK_SECRET,
    })) as unknown as WorkOSEvent;
  } catch {
    return new NextResponse('Invalid signature', { status: 401 });
  }
  const payload = await getPayload({ config });
  const entry = eventToAuditEntry(event);
  try {
    await payload.create({
      collection: 'audit-log',
      data: {
        action: entry.action,
        actorEmail: entry.actorEmail ?? undefined,
        targetEmail: entry.targetEmail ?? undefined,
        summary: entry.summary,
        externalId: entry.externalId ?? undefined,
      },
      overrideAccess: true,
    });
  } catch (err) {
    // Unique constraint on externalId → ignore duplicate, return 200 so WorkOS stops retrying.
    if (!(err instanceof Error) || !err.message.toLowerCase().includes('unique')) {
      throw err;
    }
  }
  return NextResponse.json({ ok: true });
}
