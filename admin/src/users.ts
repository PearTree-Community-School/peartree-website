import Database from 'better-sqlite3';
import { roles, type Role } from './policy.js';

export type UserStatus = 'active' | 'disabled';

export type UserRecord = {
  readonly id: number;
  readonly workosUserId: string | null;
  readonly email: string;
  readonly role: Role;
  readonly status: UserStatus;
  readonly createdAt: Date;
  readonly lastLoginAt: Date | null;
};

export type NewUser = {
  readonly email: string;
  readonly role: Role;
  readonly workosUserId?: string;
};

export type UsersRepo = {
  readonly count: () => number;
  readonly list: () => readonly UserRecord[];
  readonly findById: (id: number) => UserRecord | null;
  readonly findByWorkOSId: (workosUserId: string) => UserRecord | null;
  readonly findByEmail: (email: string) => UserRecord | null;
  readonly create: (input: NewUser) => UserRecord;
  readonly linkWorkOSId: (id: number, workosUserId: string) => UserRecord;
  readonly updateRole: (id: number, role: Role) => UserRecord;
  readonly setStatus: (id: number, status: UserStatus) => UserRecord;
  readonly recordLogin: (id: number, at: Date) => void;
  readonly countActiveSuperAdmins: () => number;
};

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workos_user_id TEXT UNIQUE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('super_admin','admin','editor','author','viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at INTEGER NOT NULL,
  last_login_at INTEGER
);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
`;

type Row = {
  readonly id: number;
  readonly workos_user_id: string | null;
  readonly email: string;
  readonly role: string;
  readonly status: string;
  readonly created_at: number;
  readonly last_login_at: number | null;
};

function mapRow(row: Row): UserRecord {
  if (!(roles as readonly string[]).includes(row.role)) {
    throw new Error(`Invalid role in DB: ${row.role}`);
  }
  if (row.status !== 'active' && row.status !== 'disabled') {
    throw new Error(`Invalid status in DB: ${row.status}`);
  }
  return {
    id: row.id,
    workosUserId: row.workos_user_id,
    email: row.email,
    role: row.role as Role,
    status: row.status,
    createdAt: new Date(row.created_at),
    lastLoginAt: row.last_login_at === null ? null : new Date(row.last_login_at),
  };
}

type ColumnInfo = { readonly name: string; readonly notnull: number };

function migrateWorkOSUserIdToNullable(db: Database.Database): void {
  const cols = db.prepare(`PRAGMA table_info('users')`).all() as readonly ColumnInfo[];
  const workosCol = cols.find((c) => c.name === 'workos_user_id');
  if (!workosCol || workosCol.notnull === 0) {
    return;
  }
  db.exec(`
    BEGIN TRANSACTION;
    CREATE TABLE users_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workos_user_id TEXT UNIQUE,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK (role IN ('super_admin','admin','editor','author','viewer')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
      created_at INTEGER NOT NULL,
      last_login_at INTEGER
    );
    INSERT INTO users_new (id, workos_user_id, email, role, status, created_at, last_login_at)
      SELECT id, workos_user_id, email, role, status, created_at, last_login_at FROM users;
    DROP TABLE users;
    ALTER TABLE users_new RENAME TO users;
    CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
    COMMIT;
  `);
}

export function openDatabase(path: string): Database.Database {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA_SQL);
  migrateWorkOSUserIdToNullable(db);
  return db;
}

export function createUsersRepo(db: Database.Database): UsersRepo {
  const countStmt = db.prepare('SELECT COUNT(*) AS n FROM users');
  const countSuperAdminsStmt = db.prepare(
    "SELECT COUNT(*) AS n FROM users WHERE role = 'super_admin' AND status = 'active'",
  );
  const listStmt = db.prepare('SELECT * FROM users ORDER BY id ASC');
  const findByIdStmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const findByWorkOSIdStmt = db.prepare('SELECT * FROM users WHERE workos_user_id = ?');
  const findByEmailStmt = db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)');
  const insertStmt = db.prepare(
    'INSERT INTO users (workos_user_id, email, role, status, created_at) VALUES (?, ?, ?, ?, ?) RETURNING *',
  );
  const linkStmt = db.prepare(
    'UPDATE users SET workos_user_id = ? WHERE id = ? RETURNING *',
  );
  const updateRoleStmt = db.prepare('UPDATE users SET role = ? WHERE id = ? RETURNING *');
  const setStatusStmt = db.prepare('UPDATE users SET status = ? WHERE id = ? RETURNING *');
  const recordLoginStmt = db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?');

  const requireRow = (row: Row | undefined, id: number, what: string): UserRecord => {
    if (!row) throw new Error(`${what} failed: user id ${id} not found`);
    return mapRow(row);
  };

  return {
    count() {
      return (countStmt.get() as { readonly n: number }).n;
    },
    countActiveSuperAdmins() {
      return (countSuperAdminsStmt.get() as { readonly n: number }).n;
    },
    list() {
      return (listStmt.all() as readonly Row[]).map(mapRow);
    },
    findById(id) {
      const row = findByIdStmt.get(id) as Row | undefined;
      return row ? mapRow(row) : null;
    },
    findByWorkOSId(workosUserId) {
      const row = findByWorkOSIdStmt.get(workosUserId) as Row | undefined;
      return row ? mapRow(row) : null;
    },
    findByEmail(email) {
      const row = findByEmailStmt.get(email) as Row | undefined;
      return row ? mapRow(row) : null;
    },
    create(input) {
      const row = insertStmt.get(
        input.workosUserId ?? null,
        input.email,
        input.role,
        'active',
        Date.now(),
      ) as Row;
      return mapRow(row);
    },
    linkWorkOSId(id, workosUserId) {
      const row = linkStmt.get(workosUserId, id) as Row | undefined;
      return requireRow(row, id, 'linkWorkOSId');
    },
    updateRole(id, role) {
      const row = updateRoleStmt.get(role, id) as Row | undefined;
      return requireRow(row, id, 'updateRole');
    },
    setStatus(id, status) {
      const row = setStatusStmt.get(status, id) as Row | undefined;
      return requireRow(row, id, 'setStatus');
    },
    recordLogin(id, at) {
      recordLoginStmt.run(at.getTime(), id);
    },
  };
}
