import Database from 'better-sqlite3';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Minimal forward-only schema migrations.
 *
 * Payload only creates schema automatically in development; in production it
 * expects migrations. Its `migrate:create` CLI cannot resolve this project's
 * module layout (its bundled tsx fails on the extensionless imports in
 * payload.config.ts, on both Node 22 and 25), so the schema was previously
 * hand-bootstrapped — which does not survive a second change.
 *
 * This runs plain .sql files from admin-next/migrations in filename order,
 * exactly once each, recording what has been applied. Each file runs in a
 * transaction: a failing migration leaves no partial state.
 *
 * Author new files by making the schema change in the Payload config, letting
 * dev `push` apply it to a scratch database, then diffing that schema against
 * production. Payload writes the DDL; this just replays it.
 */

const TABLE = '_schema_migrations';

function dbPathFromUri(uri: string): string {
  return uri.replace(/^file:/, '');
}

export function runMigrations(log: (m: string) => void = console.log): void {
  const uri = process.env['DATABASE_URI'] ?? 'file:./data/admin.sqlite';
  const file = dbPathFromUri(uri);
  const dir = path.resolve(process.cwd(), 'migrations');

  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  } catch {
    return; // No migrations directory yet — nothing to do.
  }
  if (files.length === 0) return;

  const db = new Database(file);
  try {
    db.pragma('foreign_keys = ON');
    db.exec(`CREATE TABLE IF NOT EXISTS ${TABLE} (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )`);

    const applied = new Set(
      db.prepare(`SELECT name FROM ${TABLE}`).all().map((r) => (r as { name: string }).name),
    );

    for (const name of files) {
      if (applied.has(name)) continue;
      const sql = readFileSync(path.join(dir, name), 'utf8');
      const tx = db.transaction(() => {
        db.exec(sql);
        db.prepare(`INSERT INTO ${TABLE} (name, applied_at) VALUES (?, ?)`).run(
          name,
          new Date().toISOString(),
        );
      });
      try {
        tx();
        log(`[migrate] applied ${name}`);
      } catch (err) {
        // Surface loudly and stop: continuing past a failed migration would
        // leave the schema in an unknown state.
        log(`[migrate] FAILED ${name}: ${String(err)}`);
        throw err;
      }
    }
  } finally {
    db.close();
  }
}
