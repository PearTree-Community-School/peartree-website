import type { AuditAction, AuditRepo, NewAuditEntry } from './audit.js';

export type WorkOSEvent = {
  readonly id: string;
  readonly event: string;
  readonly data: Record<string, unknown>;
  readonly createdAt?: string;
};

export type WorkOSWebhookVerifier = {
  readonly constructEvent: (params: {
    readonly payload: unknown;
    readonly sigHeader: string;
    readonly secret: string;
  }) => Promise<WorkOSEvent> | WorkOSEvent;
};

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function extractEmail(data: Record<string, unknown>): string | null {
  const direct = asString(data['email']);
  if (direct) return direct;
  const user = data['user'];
  if (user && typeof user === 'object') {
    return asString((user as Record<string, unknown>)['email']);
  }
  return null;
}

/** Maps a WorkOS event to our audit-log row shape. */
export function eventToAuditEntry(event: WorkOSEvent): NewAuditEntry {
  const subtype = event.event.replace(/\./g, '_');
  const action = `workos.${subtype}` as AuditAction;
  const email = extractEmail(event.data);
  return {
    action,
    actorEmail: email,
    targetEmail: email,
    summary: summarize(event),
    externalId: event.id,
  };
}

function summarize(event: WorkOSEvent): string {
  const email = extractEmail(event.data);
  const who = email ? ` for ${email}` : '';
  switch (event.event) {
    case 'user.created':
      return `WorkOS user created${who}.`;
    case 'user.updated':
      return `WorkOS user updated${who}.`;
    case 'user.deleted':
      return `WorkOS user deleted${who}.`;
    case 'session.created':
      return `WorkOS session created${who}.`;
    case 'session.revoked':
      return `WorkOS session revoked${who}.`;
    case 'authentication.password_failed':
    case 'authentication.magic_auth_failed':
    case 'authentication.mfa_failed':
    case 'authentication.email_verification_failed':
      return `WorkOS authentication failed (${event.event})${who}.`;
    case 'authentication.password_succeeded':
    case 'authentication.magic_auth_succeeded':
    case 'authentication.mfa_succeeded':
    case 'authentication.oauth_succeeded':
    case 'authentication.sso_succeeded':
    case 'authentication.email_verification_succeeded':
      return `WorkOS authentication succeeded (${event.event})${who}.`;
    default:
      return `WorkOS event: ${event.event}${who}.`;
  }
}

export async function recordWorkOSEvent(
  audit: AuditRepo,
  event: WorkOSEvent,
): Promise<{ readonly inserted: boolean }> {
  const inserted = audit.record(eventToAuditEntry(event));
  return { inserted };
}
