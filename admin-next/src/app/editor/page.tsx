import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import EditorChrome from './EditorChrome';
import './editor.css';

export const dynamic = 'force-dynamic';

export default async function EditorPage() {
  const user = await getSessionUser();
  if (!user) redirect('/auth/sign-in');
  return <EditorChrome userEmail={user.email} />;
}
