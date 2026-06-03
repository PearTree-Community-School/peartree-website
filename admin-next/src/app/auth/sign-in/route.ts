import { redirect } from 'next/navigation';
import { getSignInUrl } from '@/lib/workos';

export const dynamic = 'force-dynamic';

export function GET() {
  redirect(getSignInUrl());
}
