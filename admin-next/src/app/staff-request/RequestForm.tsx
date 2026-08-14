'use client';

import { useState } from 'react';
import { CATEGORIES, LOCATIONS, PRIORITIES } from '@/lib/staff-request-form';

type State = 'idle' | 'sending' | 'sent' | 'error';

export default function RequestForm({ userEmail }: { userEmail: string }) {
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');
  const [category, setCategory] = useState('');

  const chosen = CATEGORIES.find((c) => c.id === category);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setState('sending');
    setError('');
    try {
      const res = await fetch('/api/staff-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterName: data.get('requesterName'),
          summary: data.get('summary'),
          description: data.get('description'),
          category: data.get('category'),
          priority: data.get('priority'),
          location: data.get('location'),
          neededBy: data.get('neededBy'),
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Something went wrong');
      setState('sent');
      form.reset();
      setCategory('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <div className="sr-done">
        <h2>Request submitted</h2>
        <p>It is now in the queue and the admin team can see it. You will be contacted if anything is unclear.</p>
        <div className="sr-done-actions">
          <button className="sr-btn" onClick={() => setState('idle')}>Submit another</button>
          <a className="sr-link" href="/sheets?sheet=staff-requests">See all requests</a>
        </div>
      </div>
    );
  }

  return (
    <form className="sr-form" onSubmit={submit}>
      <div className="sr-row">
        <div className="sr-f">
          <label htmlFor="requesterName">Your name *</label>
          <input id="requesterName" name="requesterName" required autoComplete="name" />
        </div>
        <div className="sr-f">
          <label htmlFor="email">Email</label>
          <input id="email" value={userEmail} disabled />
          <p className="sr-hint">Taken from your sign-in</p>
        </div>
      </div>

      <div className="sr-f">
        <label htmlFor="summary">What do you need? *</label>
        <input
          id="summary"
          name="summary"
          required
          maxLength={300}
          placeholder="Sink in Dolphin Classroom is leaking"
        />
      </div>

      <div className="sr-row">
        <div className="sr-f">
          <label htmlFor="category">Category *</label>
          <select
            id="category"
            name="category"
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Choose…</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          {chosen && <p className="sr-hint">{chosen.desc}</p>}
        </div>
        <div className="sr-f">
          <label htmlFor="priority">Priority</label>
          <select id="priority" name="priority" defaultValue="Medium">
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="sr-row">
        <div className="sr-f">
          <label htmlFor="location">Location</label>
          <select id="location" name="location" defaultValue="">
            <option value="">Choose…</option>
            {LOCATIONS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div className="sr-f">
          <label htmlFor="neededBy">Needed by</label>
          <input id="neededBy" name="neededBy" type="date" />
        </div>
      </div>

      <div className="sr-f">
        <label htmlFor="description">Details</label>
        <textarea
          id="description"
          name="description"
          rows={5}
          maxLength={5000}
          placeholder="Anything that helps — what is broken, how urgent, where exactly."
        />
      </div>

      {state === 'error' && <p className="sr-error">{error}</p>}

      <div className="sr-actions">
        <button className="sr-btn" type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? 'Submitting…' : 'Submit request'}
        </button>
      </div>
    </form>
  );
}
