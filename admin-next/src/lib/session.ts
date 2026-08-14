import { getPayload } from 'payload';
import { headers as nextHeaders } from 'next/headers';
import config from '@payload-config';

export type SessionUser = {
  readonly id: number;
  readonly email: string;
  readonly role: string;
};

/**
 * Resolves the signed-in staff user via the same WorkOS strategy Payload's
 * admin uses, so PearTree Sheets can never diverge from it. Returns null when
 * there is no valid session.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await nextHeaders() });
  if (!user || typeof user !== 'object') return null;
  const u = user as { id?: number; email?: string; role?: string };
  if (!u.id || !u.email || !u.role) return null;
  return { id: u.id, email: u.email, role: u.role };
}

export function canEdit(role: string): boolean {
  return ['super_admin', 'admin', 'editor'].includes(role);
}

export function canDelete(role: string): boolean {
  return ['super_admin', 'admin'].includes(role);
}
