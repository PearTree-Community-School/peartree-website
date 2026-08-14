'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SheetColumn, SheetDef } from '@/lib/sheets-config';

type Row = Record<string, unknown> & { id: number };
type Cursor = { row: number; col: number } | null;
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type Props = {
  sheet: SheetDef;
  sheets: ReadonlyArray<{ slug: string; label: string }>;
  initialRows: Row[];
  canEdit: boolean;
  canDelete: boolean;
  userEmail: string;
};

const cellText = (row: Row, col: SheetColumn): string => {
  const v = row[col.key];
  if (v === null || v === undefined) return '';
  if (col.type === 'date') return String(v).slice(0, 10);
  return String(v);
};

export default function Sheet({
  sheet,
  sheets,
  initialRows,
  canEdit,
  canDelete,
  userEmail,
}: Props) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [cursor, setCursor] = useState<Cursor>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState('');
  const [save, setSave] = useState<SaveState>('idle');
  const [toast, setToast] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  const cols = sheet.columns;

  const visible = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) =>
      cols.some((c) => cellText(r, c).toLowerCase().includes(q)),
    );
  }, [rows, query, cols]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }, []);

  // ---- persistence -------------------------------------------------------

  const commit = useCallback(
    async (rowId: number, key: string, value: string) => {
      const before = rows.find((r) => r.id === rowId);
      if (!before) return;
      if (cellText(before, cols.find((c) => c.key === key)!) === value) return;

      // Optimistic: the grid should never feel like it is waiting on a network.
      setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, [key]: value } : r)));
      setSave('saving');
      try {
        const res = await fetch(`/api/sheets/${sheet.slug}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: rowId, changes: { [key]: value } }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const { doc } = (await res.json()) as { doc: Row };
        setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...doc } : r)));
        setSave('saved');
        setTimeout(() => setSave('idle'), 1400);
      } catch {
        // Roll back so the screen never lies about what was stored.
        setRows((prev) => prev.map((r) => (r.id === rowId ? before : r)));
        setSave('error');
        flash('Could not save that change — it has been reverted.');
      }
    },
    [rows, cols, sheet.slug, flash],
  );

  const addRow = useCallback(async () => {
    setSave('saving');
    try {
      const res = await fetch(`/api/sheets/${sheet.slug}`, { method: 'POST' });
      if (!res.ok) throw new Error();
      const { doc } = (await res.json()) as { doc: Row };
      setRows((prev) => [doc, ...prev]);
      setCursor({ row: 0, col: 1 });
      setSave('saved');
      setTimeout(() => setSave('idle'), 1400);
    } catch {
      setSave('error');
      flash('Could not add a row.');
    }
  }, [sheet.slug, flash]);

  const removeSelected = useCallback(async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    const noun = ids.length === 1 ? 'row' : `${ids.length} rows`;
    if (!window.confirm(`Delete ${noun}? This cannot be undone.`)) return;
    const before = rows;
    setRows((prev) => prev.filter((r) => !selected.has(r.id)));
    setSelected(new Set());
    try {
      const res = await fetch(`/api/sheets/${sheet.slug}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error();
      flash(`Deleted ${noun}.`);
    } catch {
      setRows(before);
      flash('Delete failed — nothing was removed.');
    }
  }, [selected, rows, sheet.slug, flash]);

  // ---- editing -----------------------------------------------------------

  const beginEdit = useCallback(
    (seed?: string) => {
      if (!canEdit || !cursor) return;
      const row = visible[cursor.row];
      const col = cols[cursor.col];
      if (!row || !col) return;
      setDraft(seed ?? cellText(row, col));
      setEditing(true);
    },
    [canEdit, cursor, visible, cols],
  );

  const endEdit = useCallback(
    (persist: boolean) => {
      if (!editing || !cursor) return;
      const row = visible[cursor.row];
      const col = cols[cursor.col];
      setEditing(false);
      if (persist && row && col) void commit(row.id, col.key, draft);
    },
    [editing, cursor, visible, cols, draft, commit],
  );

  const move = useCallback(
    (dRow: number, dCol: number) => {
      setCursor((cur) => {
        if (!cur) return { row: 0, col: 0 };
        const row = Math.max(0, Math.min(visible.length - 1, cur.row + dRow));
        const col = Math.max(0, Math.min(cols.length - 1, cur.col + dCol));
        return { row, col };
      });
    },
    [visible.length, cols.length],
  );

  // ---- keyboard ----------------------------------------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && target.getAttribute('data-toolbar') === 'true') return;

      if (editing) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setEditing(false);
        } else if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          endEdit(true);
          move(1, 0);
        } else if (e.key === 'Tab') {
          e.preventDefault();
          endEdit(true);
          move(0, e.shiftKey ? -1 : 1);
        }
        return;
      }

      if (!cursor) return;
      switch (e.key) {
        case 'ArrowUp': e.preventDefault(); move(-1, 0); break;
        case 'ArrowDown': e.preventDefault(); move(1, 0); break;
        case 'ArrowLeft': e.preventDefault(); move(0, -1); break;
        case 'ArrowRight': e.preventDefault(); move(0, 1); break;
        case 'Tab': e.preventDefault(); move(0, e.shiftKey ? -1 : 1); break;
        case 'Enter': e.preventDefault(); beginEdit(); break;
        case 'Escape': e.preventDefault(); setCursor(null); break;
        case 'Backspace':
        case 'Delete': {
          e.preventDefault();
          const row = visible[cursor.row];
          const col = cols[cursor.col];
          if (row && col && canEdit) void commit(row.id, col.key, '');
          break;
        }
        default:
          // Typing a printable character starts editing, as a spreadsheet does.
          if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            beginEdit(e.key);
          }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, cursor, move, beginEdit, endEdit, visible, cols, canEdit, commit]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  // ---- render ------------------------------------------------------------

  const template = `44px ${cols.map((c) => c.width).join(' ')}`;

  return (
    <div className="sheet-root">
      <header className="sheet-bar">
        <div className="sheet-tabs">
          {sheets.map((s) => (
            <a
              key={s.slug}
              href={`/sheets?sheet=${s.slug}`}
              className={`sheet-tab${s.slug === sheet.slug ? ' is-active' : ''}`}
            >
              {s.label}
            </a>
          ))}
        </div>

        <div className="sheet-actions">
          <div className="sheet-search">
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8.5 3a5.5 5.5 0 1 1-3.9 9.4l-2.8 2.8-1.4-1.4 2.8-2.8A5.5 5.5 0 0 1 8.5 3Zm0 2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/></svg>
            <input
              data-toolbar="true"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${sheet.label.toLowerCase()}`}
              aria-label="Search rows"
            />
          </div>

          <span className={`sheet-save is-${save}`}>
            {save === 'saving' && 'Saving…'}
            {save === 'saved' && 'All changes saved'}
            {save === 'error' && 'Save failed'}
          </span>

          {canDelete && selected.size > 0 && (
            <button className="btn btn-danger" onClick={removeSelected}>
              Delete {selected.size}
            </button>
          )}
          {canEdit && (
            <button className="btn btn-primary" onClick={addRow}>
              <span aria-hidden="true">+</span> Add row
            </button>
          )}
        </div>
      </header>

      <div className="sheet-scroll" ref={gridRef}>
        <div className="sheet-grid" style={{ gridTemplateColumns: template }} role="grid">
          <div className="sheet-head" role="row">
            <div className="sheet-th sheet-gutter" role="columnheader" />
            {cols.map((c) => (
              <div key={c.key} className="sheet-th" role="columnheader">{c.label}</div>
            ))}
          </div>

          {visible.map((row, rIdx) => (
            <div
              key={row.id}
              className={`sheet-row${selected.has(row.id) ? ' is-selected' : ''}`}
              role="row"
            >
              <div className="sheet-td sheet-gutter">
                <input
                  type="checkbox"
                  aria-label={`Select row ${rIdx + 1}`}
                  checked={selected.has(row.id)}
                  onChange={(e) => {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(row.id);
                      else next.delete(row.id);
                      return next;
                    });
                  }}
                />
              </div>

              {cols.map((col, cIdx) => {
                const active = cursor?.row === rIdx && cursor?.col === cIdx;
                const isEditing = active && editing;
                const text = cellText(row, col);
                const opt = col.options?.find((o) => o.value === text);

                return (
                  <div
                    key={col.key}
                    role="gridcell"
                    tabIndex={-1}
                    className={`sheet-td${active ? ' is-active' : ''}${col.type === 'longtext' ? ' is-long' : ''}`}
                    onMouseDown={() => { if (!isEditing) { setCursor({ row: rIdx, col: cIdx }); setEditing(false); } }}
                    onDoubleClick={() => beginEdit()}
                  >
                    {isEditing ? (
                      col.type === 'select' ? (
                        <select
                          ref={inputRef as React.RefObject<HTMLSelectElement>}
                          className="cell-input"
                          value={draft}
                          onChange={(e) => { setDraft(e.target.value); void commit(row.id, col.key, e.target.value); setEditing(false); }}
                          onBlur={() => setEditing(false)}
                        >
                          <option value="">—</option>
                          {col.options?.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      ) : col.type === 'longtext' ? (
                        <textarea
                          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                          className="cell-input cell-textarea"
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={() => endEdit(true)}
                        />
                      ) : (
                        <input
                          ref={inputRef as React.RefObject<HTMLInputElement>}
                          className="cell-input"
                          type={col.type === 'date' ? 'date' : col.type === 'email' ? 'email' : col.type === 'tel' ? 'tel' : 'text'}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={() => endEdit(true)}
                        />
                      )
                    ) : col.type === 'select' && opt ? (
                      <span className={`pill tone-${opt.tone ?? 'new'}`}>{opt.label}</span>
                    ) : (
                      <span className="cell-text">{text}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {visible.length === 0 && (
            <div className="sheet-empty">
              {query ? `Nothing matches “${query}”.` : 'No submissions yet.'}
            </div>
          )}
        </div>
      </div>

      <footer className="sheet-foot">
        <span>{visible.length} of {rows.length} {rows.length === 1 ? 'row' : 'rows'}</span>
        <span className="sheet-hint">
          Click a cell, then type. <kbd>Enter</kbd> edit · <kbd>Tab</kbd> next · <kbd>Esc</kbd> cancel
        </span>
        <span className="sheet-who">{userEmail}</span>
      </footer>

      {toast && <div className="sheet-toast" role="status">{toast}</div>}
    </div>
  );
}
