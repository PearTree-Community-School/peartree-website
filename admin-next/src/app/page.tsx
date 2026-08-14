import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * Land staff somewhere useful. /admin used to be the target, but Payload's
 * shell offers its own password login that cannot authenticate anyone here,
 * which read as "the site is broken".
 */
export default async function HomePage() {
  const user = await getSessionUser();
  redirect(user ? '/sheets' : '/auth/sign-in');
}
