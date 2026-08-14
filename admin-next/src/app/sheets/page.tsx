import { getPayload } from 'payload';
import { redirect } from 'next/navigation';
import config from '@payload-config';
import { canDelete, canEdit, getSessionUser } from '@/lib/session';
import { getSheet, SHEETS } from '@/lib/sheets-config';
import Sheet from './Sheet';
import './sheets.css';

export const dynamic = 'force-dynamic';

export default async function SheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ sheet?: string }>;
}) {
  const user = await getSessionUser();
  // Unlike /admin, this bounces straight to sign-in rather than showing an
  // empty shell to someone who is simply signed out.
  if (!user) redirect('/auth/sign-in');

  const { sheet: slug } = await searchParams;
  const sheet = getSheet(slug);

  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: sheet.slug as 'tour-requests',
    limit: 500,
    sort: '-createdAt',
    depth: 0,
    overrideAccess: true,
  });

  return (
    <Sheet
      sheet={sheet}
      sheets={SHEETS.map((s) => ({ slug: s.slug, label: s.label }))}
      initialRows={result.docs as never}
      canEdit={canEdit(user.role)}
      canDelete={canDelete(user.role)}
      userEmail={user.email}
    />
  );
}
