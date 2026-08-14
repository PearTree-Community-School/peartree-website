import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import RequestForm from './RequestForm';
import './staff-request.css';

export const dynamic = 'force-dynamic';

export default async function StaffRequestPage() {
  const user = await getSessionUser();
  if (!user) redirect('/auth/sign-in');

  return (
    <div className="sr-root">
      <header className="sr-bar">
        <span className="sr-brand">Staff Requests</span>
        <nav className="sr-nav">
          <a href="/sheets?sheet=staff-requests">All requests</a>
          <a href="/sheets">Tour requests</a>
          <a href="/editor">Site editor</a>
          <span className="sr-who">{user.email}</span>
        </nav>
      </header>

      <main className="sr-main">
        <div className="sr-intro">
          <h1>Submit a work request</h1>
          <p>
            Facilities, supplies, tech, Montessori materials, or anything else you need to do your
            job well. Requests go straight to the admin team and you can track them alongside
            everyone else&rsquo;s.
          </p>
        </div>
        <RequestForm userEmail={user.email} />
      </main>
    </div>
  );
}
