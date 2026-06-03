import type { AuditRepo } from './audit.js';
import type { Role } from './policy.js';
import type { UserRecord, UsersRepo } from './users.js';

export type SessionUser = {
  readonly id: string;
  readonly email: string;
  readonly firstName: string | null;
  readonly lastName: string | null;
};

export type ActiveSession = {
  readonly user: SessionUser;
  readonly role: Role;
  readonly record: UserRecord;
};

export const SESSION_COOKIE_NAME = 'pt_admin_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export function parseBootstrapEmails(raw: string | undefined): readonly string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
}

export type ProvisionOutcome =
  | { readonly status: 'provisioned'; readonly record: UserRecord }
  | { readonly status: 'unprovisioned' };

/**
 * Resolve or bootstrap the database record for a freshly authenticated WorkOS user.
 *
 * - Existing user in DB → record returned, last_login_at updated.
 * - Pre-provisioned by admin (row with NULL workos_user_id) → linked + signed in.
 * - Empty users table AND the email matches ADMIN_BOOTSTRAP_EMAILS → first super_admin is auto-created.
 * - Otherwise → unprovisioned (caller renders 403).
 */
export function provisionFromCallback(
  users: UsersRepo,
  audit: AuditRepo,
  workosUser: SessionUser,
  bootstrapEmails: readonly string[],
  now: Date = new Date(),
): ProvisionOutcome {
  // 1. Returning user: matched by WorkOS user id.
  const existing = users.findByWorkOSId(workosUser.id);
  if (existing) {
    if (existing.status !== 'active') {
      audit.record({
        action: 'session.refused_unprovisioned',
        actorEmail: workosUser.email,
        targetUserId: existing.id,
        targetEmail: existing.email,
        summary: `Sign-in refused: account is disabled.`,
      });
      return { status: 'unprovisioned' };
    }
    users.recordLogin(existing.id, now);
    audit.record({
      action: 'session.signed_in',
      actorUserId: existing.id,
      actorEmail: existing.email,
      targetUserId: existing.id,
      targetEmail: existing.email,
      summary: `Signed in (${existing.role}).`,
    });
    return { status: 'provisioned', record: existing };
  }
  // 2. Pre-provisioned by admin: row exists for this email with no WorkOS id yet.
  const byEmail = users.findByEmail(workosUser.email);
  if (byEmail) {
    if (byEmail.status !== 'active') {
      audit.record({
        action: 'session.refused_unprovisioned',
        actorEmail: workosUser.email,
        targetUserId: byEmail.id,
        targetEmail: byEmail.email,
        summary: 'Sign-in refused: account is disabled.',
      });
      return { status: 'unprovisioned' };
    }
    if (byEmail.workosUserId !== null && byEmail.workosUserId !== workosUser.id) {
      audit.record({
        action: 'session.refused_unprovisioned',
        actorEmail: workosUser.email,
        targetUserId: byEmail.id,
        targetEmail: byEmail.email,
        summary: 'Sign-in refused: email is already linked to a different WorkOS account.',
      });
      return { status: 'unprovisioned' };
    }
    const wasPending = byEmail.workosUserId === null;
    const linked = wasPending ? users.linkWorkOSId(byEmail.id, workosUser.id) : byEmail;
    if (wasPending) {
      audit.record({
        action: 'user.linked',
        actorUserId: linked.id,
        actorEmail: linked.email,
        targetUserId: linked.id,
        targetEmail: linked.email,
        summary: `Linked WorkOS account on first sign-in.`,
      });
    }
    users.recordLogin(linked.id, now);
    audit.record({
      action: 'session.signed_in',
      actorUserId: linked.id,
      actorEmail: linked.email,
      targetUserId: linked.id,
      targetEmail: linked.email,
      summary: `Signed in (${linked.role}).`,
    });
    return { status: 'provisioned', record: linked };
  }
  // 3. Bootstrap path: empty table + first super_admin email match.
  const isBootstrapCandidate =
    users.count() === 0 && bootstrapEmails.includes(workosUser.email.trim().toLowerCase());
  if (!isBootstrapCandidate) {
    audit.record({
      action: 'session.refused_unprovisioned',
      actorEmail: workosUser.email,
      summary: 'Sign-in refused: no account provisioned for this email.',
    });
    return { status: 'unprovisioned' };
  }
  const created = users.create({
    workosUserId: workosUser.id,
    email: workosUser.email,
    role: 'super_admin',
  });
  users.recordLogin(created.id, now);
  audit.record({
    action: 'user.bootstrapped',
    actorUserId: created.id,
    actorEmail: created.email,
    targetUserId: created.id,
    targetEmail: created.email,
    summary: 'Bootstrapped first super_admin from ADMIN_BOOTSTRAP_EMAILS.',
  });
  audit.record({
    action: 'session.signed_in',
    actorUserId: created.id,
    actorEmail: created.email,
    targetUserId: created.id,
    targetEmail: created.email,
    summary: 'Signed in (super_admin).',
  });
  return { status: 'provisioned', record: created };
}

/** Look up an already-provisioned user on subsequent requests. */
export function resolveSession(users: UsersRepo, workosUser: SessionUser): ProvisionOutcome {
  const existing = users.findByWorkOSId(workosUser.id);
  if (!existing || existing.status !== 'active') {
    return { status: 'unprovisioned' };
  }
  return { status: 'provisioned', record: existing };
}
