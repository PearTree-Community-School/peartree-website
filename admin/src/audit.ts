import Database from 'better-sqlite3';

export type AuditAction =
  | 'user.invited'
  | 'user.role_changed'
  | 'user.status_changed'
  | 'user.linked'
  | 'user.bootstrapped'
  | 'session.signed_in'
  | 'session.signed_out'
  | 'session.refused_unprovisioned'
  // WorkOS webhook-sourced events. Subtype encoded into the action string.
  | `workos.${string}`;

export type AuditEntry = {
  readonly id: number;
  readonly occurredAt: Date;
  readonly actorUserId: number | null;
  readonly actorEmail: string | null;
  readonly action: AuditAction;
  readonly targetUserId: number | null;
  readonly targetEmail: string | null;
  readonly summary: string;
  readonly externalId: string | null;
};

export type NewAuditEntry = {
  readonly actorUserId?: number | null;
  readonly actorEmail?: string | null;
  readonly action: AuditAction;
  readonly targetUserId?: number | null;
  readonly targetEmail?: string | null;
  readonly summary: string;
  readonly externalId?: string | null;
};

export type AuditRepo = {
  /** Returns true if a new row was inserted; false if external_id collided with an existing row. */
  readonly record: (entry: NewAuditEntry) => boolean;
  readonly list: (limit?: number) => readonly AuditEntry[];
};

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  occurred_at INTEGER NOT NULL,
  actor_user_id INTEGER,
  actor_email TEXT,
  action TEXT NOT NULL,
  target_user_id INTEGER,
  target_email TEXT,
  summary TEXT NOT NULL,
  external_id TEXT UNIQUE
);
CREATE INDEX IF NOT EXISTS audit_log_occurred_at_idx ON audit_log(occurred_at DESC);
`;

type ColumnInfo = { readonly name: string };

function ensureExternalIdColumn(db: Database.Database): void {
  const cols = db.prepare(`PRAGMA table_info('audit_log')`).all() as readonly ColumnInfo[];
  if (cols.some((c) => c.name === 'external_id')) return;
  db.exec(`
    BEGIN TRANSACTION;
    ALTER TABLE audit_log ADD COLUMN external_id TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS audit_log_external_id_idx ON audit_log(external_id) WHERE external_id IS NOT NULL;
    COMMIT;
  `);
}

type Row = {
  readonly id: number;
  readonly occurred_at: number;
  readonly actor_user_id: number | null;
  readonly actor_email: string | null;
  readonly action: string;
  readonly target_user_id: number | null;
  readonly target_email: string | null;
  readonly summary: string;
  readonly external_id: string | null;
};

function mapRow(row: Row): AuditEntry {
  return {
    id: row.id,
    occurredAt: new Date(row.occurred_at),
    actorUserId: row.actor_user_id,
    actorEmail: row.actor_email,
    action: row.action as AuditAction,
    targetUserId: row.target_user_id,
    targetEmail: row.target_email,
    summary: row.summary,
    externalId: row.external_id,
  };
}

export function ensureAuditSchema(db: Database.Database): void {
  db.exec(SCHEMA_SQL);
  ensureExternalIdColumn(db);
}

export function createAuditRepo(db: Database.Database): AuditRepo {
  ensureAuditSchema(db);
  const insertStmt = db.prepare(
    `INSERT OR IGNORE INTO audit_log
       (occurred_at, actor_user_id, actor_email, action, target_user_id, target_email, summary, external_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const listStmt = db.prepare('SELECT * FROM audit_log ORDER BY occurred_at DESC, id DESC LIMIT ?');
  return {
    record(entry) {
      const result = insertStmt.run(
        Date.now(),
        entry.actorUserId ?? null,
        entry.actorEmail ?? null,
        entry.action,
        entry.targetUserId ?? null,
        entry.targetEmail ?? null,
        entry.summary,
        entry.externalId ?? null,
      );
      return result.changes > 0;
    },
    list(limit = 200) {
      return (listStmt.all(limit) as readonly Row[]).map(mapRow);
    },
  };
}
