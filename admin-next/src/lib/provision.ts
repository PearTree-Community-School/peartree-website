import type { Payload } from 'payload';
import { getEnv } from './env';
import type { WorkOSAuthUser } from './workos';

export type ProvisionOutcome =
  | { readonly status: 'provisioned'; readonly userId: number; readonly role: string }
  | { readonly status: 'unprovisioned'; readonly reason: string };

/**
 * Resolve or bootstrap the Payload user record after WorkOS authentication.
 *
 * - Existing match by workosUserId → mark login, return.
 * - Pre-provisioned by email (workosUserId = null) → link, return.
 * - Empty table + email in ADMIN_BOOTSTRAP_EMAILS → bootstrap as super_admin.
 * - Otherwise → unprovisioned.
 */
export async function provisionFromCallback(
  payload: Payload,
  workosUser: WorkOSAuthUser,
): Promise<ProvisionOutcome> {
  const env = getEnv();
  const now = new Date().toISOString();

  // 1. Returning user by WorkOS id
  const byWorkOSId = await payload.find({
    collection: 'users',
    where: { workosUserId: { equals: workosUser.id } },
    limit: 1,
    overrideAccess: true,
  });
  const existing = byWorkOSId.docs[0] as
    | { id: number | string; status?: string; email: string; role: string }
    | undefined;
  if (existing) {
    if (existing.status !== 'active') {
      await payload.create({
        collection: 'audit-log',
        data: {
          action: 'session.refused_unprovisioned',
          actorEmail: workosUser.email,
          targetEmail: existing.email,
          summary: 'Sign-in refused: account is disabled.',
        },
        overrideAccess: true,
      });
      return { status: 'unprovisioned', reason: 'disabled' };
    }
    await payload.update({
      collection: 'users',
      id: existing.id,
      data: { lastLoginAt: now },
      overrideAccess: true,
    });
    await payload.create({
      collection: 'audit-log',
      data: {
        action: 'session.signed_in',
        actorEmail: existing.email,
        targetEmail: existing.email,
        summary: `Signed in (${existing.role}).`,
      },
      overrideAccess: true,
    });
    return { status: 'provisioned', userId: Number(existing.id), role: existing.role };
  }

  // 2. Pre-provisioned by email (workosUserId still null)
  const byEmail = await payload.find({
    collection: 'users',
    where: { email: { equals: workosUser.email } },
    limit: 1,
    overrideAccess: true,
  });
  const pending = byEmail.docs[0] as
    | { id: number | string; status?: string; email: string; role: string; workosUserId?: string | null }
    | undefined;
  if (pending) {
    if (pending.status !== 'active') {
      await payload.create({
        collection: 'audit-log',
        data: {
          action: 'session.refused_unprovisioned',
          actorEmail: workosUser.email,
          targetEmail: pending.email,
          summary: 'Sign-in refused: account is disabled.',
        },
        overrideAccess: true,
      });
      return { status: 'unprovisioned', reason: 'disabled' };
    }
    if (pending.workosUserId && pending.workosUserId !== workosUser.id) {
      await payload.create({
        collection: 'audit-log',
        data: {
          action: 'session.refused_unprovisioned',
          actorEmail: workosUser.email,
          targetEmail: pending.email,
          summary: 'Sign-in refused: email is already linked to a different WorkOS account.',
        },
        overrideAccess: true,
      });
      return { status: 'unprovisioned', reason: 'email_conflict' };
    }
    const wasPending = !pending.workosUserId;
    if (wasPending) {
      await payload.update({
        collection: 'users',
        id: pending.id,
        data: { workosUserId: workosUser.id, lastLoginAt: now },
        overrideAccess: true,
      });
      await payload.create({
        collection: 'audit-log',
        data: {
          action: 'user.linked',
          actorEmail: pending.email,
          targetEmail: pending.email,
          summary: 'Linked WorkOS account on first sign-in.',
        },
        overrideAccess: true,
      });
    } else {
      await payload.update({
        collection: 'users',
        id: pending.id,
        data: { lastLoginAt: now },
        overrideAccess: true,
      });
    }
    await payload.create({
      collection: 'audit-log',
      data: {
        action: 'session.signed_in',
        actorEmail: pending.email,
        targetEmail: pending.email,
        summary: `Signed in (${pending.role}).`,
      },
      overrideAccess: true,
    });
    return { status: 'provisioned', userId: Number(pending.id), role: pending.role };
  }

  // 3. Bootstrap path: empty users table + email in ADMIN_BOOTSTRAP_EMAILS
  const count = (
    await payload.count({ collection: 'users', overrideAccess: true })
  ).totalDocs;
  const emailLower = workosUser.email.trim().toLowerCase();
  if (count === 0 && env.ADMIN_BOOTSTRAP_EMAILS.includes(emailLower)) {
    const created = await payload.create({
      collection: 'users',
      data: {
        email: workosUser.email,
        workosUserId: workosUser.id,
        role: 'super_admin',
        status: 'active',
        firstName: workosUser.firstName ?? undefined,
        lastName: workosUser.lastName ?? undefined,
        lastLoginAt: now,
      },
      overrideAccess: true,
    });
    await payload.create({
      collection: 'audit-log',
      data: {
        action: 'user.bootstrapped',
        actorEmail: workosUser.email,
        targetEmail: workosUser.email,
        summary: 'Bootstrapped first super_admin from ADMIN_BOOTSTRAP_EMAILS.',
      },
      overrideAccess: true,
    });
    await payload.create({
      collection: 'audit-log',
      data: {
        action: 'session.signed_in',
        actorEmail: workosUser.email,
        targetEmail: workosUser.email,
        summary: 'Signed in (super_admin).',
      },
      overrideAccess: true,
    });
    return { status: 'provisioned', userId: Number(created.id), role: 'super_admin' };
  }

  await payload.create({
    collection: 'audit-log',
    data: {
      action: 'session.refused_unprovisioned',
      actorEmail: workosUser.email,
      summary: 'Sign-in refused: no account provisioned for this email.',
    },
    overrideAccess: true,
  });
  return { status: 'unprovisioned', reason: 'no_account' };
}
