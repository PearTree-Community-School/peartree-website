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
  const frame = useRef<HTMLIFrameElement>(null);

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
