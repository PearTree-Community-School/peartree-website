'use client';

import { useEffect, useRef, useState } from 'react';

const PAGES = [
  { path: '', label: 'Home' },
  { path: 'about/', label: 'About' },
  { path: 'programs/', label: 'Programs' },
  { path: 'admissions/', label: 'Admissions' },
  { path: 'parents/', label: 'Parents' },
  { path: 'support/', label: 'Support' },
  { path: 'contact/', label: 'Contact' },
];

const WIDTHS = [
  { id: 'full', label: 'Desktop', css: '100%' },
  { id: 'tablet', label: 'Tablet', css: '834px' },
  { id: 'phone', label: 'Phone', css: '414px' },
];

export default function EditorChrome({ userEmail }: { userEmail: string }) {
  const [page, setPage] = useState('');
  const [width, setWidth] = useState(WIDTHS[0]!);
  const [dirty, setDirty] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [note, setNote] = useState<{ text: string; url?: string } | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);

  async function publish() {
    setPublishing(true);
    setNote({ text: 'Starting build…' });
    try {
      const res = await fetch('/api/editor/publish', { method: 'POST' });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setNote({ text: data.error ?? 'Publish failed' });
        setPublishing(false);
        return;
      }
      // Poll until the run leaves "in progress" so the button reflects reality
      // rather than just claiming success the moment GitHub accepts the call.
      const started = Date.now();
      const tick = async () => {
        const s = await fetch('/api/editor/publish', { cache: 'no-store' });
        const st = (await s.json()) as { status?: string; conclusion?: string; url?: string };
        if (st.status === 'completed') {
          const ok = st.conclusion === 'success';
          setNote({ text: ok ? 'Published — live in a moment' : `Build ${st.conclusion}`, url: st.url });
          setPublishing(false);
          if (ok) setDirty(false);
          return;
        }
        if (Date.now() - started > 5 * 60 * 1000) {
          setNote({ text: 'Still building — check GitHub', url: st.url });
          setPublishing(false);
          return;
        }
        setTimeout(tick, 5000);
      };
      setTimeout(tick, 4000);
    } catch {
      setNote({ text: 'Could not reach the publish service' });
      setPublishing(false);
    }
  }

  // The overlay posts up whenever a save lands, so the chrome can show that
  // there are changes not yet on the public site.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if ((e.data as { type?: string })?.type === 'pt-content-saved') setDirty(true);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  return (
    <div className="ed-root">
      <header className="ed-bar">
        <div className="ed-left">
          <span className="ed-brand">Site Editor</span>
          <select
            className="ed-select"
            value={page}
            onChange={(e) => setPage(e.target.value)}
            aria-label="Page"
          >
            {PAGES.map((p) => (
              <option key={p.path} value={p.path}>{p.label}</option>
            ))}
          </select>
        </div>

        <div className="ed-widths" role="group" aria-label="Preview width">
          {WIDTHS.map((w) => (
            <button
              key={w.id}
              className={`ed-w${w.id === width.id ? ' is-active' : ''}`}
              onClick={() => setWidth(w)}
            >
              {w.label}
            </button>
          ))}
        </div>

        <div className="ed-right">
          {dirty && <span className="ed-dirty">Unpublished changes</span>}
          <button className="ed-publish" onClick={publish} disabled={publishing}>
            {publishing ? 'Publishing…' : 'Publish'}
          </button>
          {note && (
            <span className="ed-note">
              {note.text}
              {note.url && (
                <>
                  {' '}
                  <a className="ed-link" href={note.url} target="_blank" rel="noreferrer">view</a>
                </>
              )}
            </span>
          )}
          <a className="ed-link" href="/sheets">Sheets</a>
          <a className="ed-link" href="/admin">Admin</a>
          <span className="ed-who">{userEmail}</span>
        </div>
      </header>

      <div className="ed-stage">
        <iframe
          ref={frame}
          className="ed-frame"
          style={{ width: width.css }}
          src={`/editor/view/${page}`}
          title="Site preview"
        />
      </div>
    </div>
  );
}
