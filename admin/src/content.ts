import Database from 'better-sqlite3';
import { collections, findCollection } from './content-schema.js';
import type { SiteSeedData } from './site-data.js';

export type ContentItem = {
  readonly id: number;
  readonly collection: string;
  readonly data: Readonly<Record<string, unknown>>;
  readonly displayOrder: number;
  readonly published: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ContentRepo = {
  readonly listAll: (collection: string) => readonly ContentItem[];
  readonly listPublished: (collection: string) => readonly ContentItem[];
  readonly counts: (collection: string) => { readonly total: number; readonly published: number };
  readonly findById: (id: number) => ContentItem | null;
  readonly create: (collection: string, data: Record<string, unknown>, published?: boolean) => ContentItem;
  readonly update: (id: number, data: Record<string, unknown>) => ContentItem;
  readonly setPublished: (id: number, published: boolean) => ContentItem;
  readonly remove: (id: number) => void;
  /** Swap display order with the neighbor above/below. No-op at the edges. */
  readonly move: (id: number, direction: 'up' | 'down') => boolean;
  readonly getSingleton: (collection: string) => ContentItem | null;
  readonly upsertSingleton: (collection: string, data: Record<string, unknown>) => ContentItem;
};

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS content_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection TEXT NOT NULL,
  data TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1 CHECK (published IN (0,1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS content_items_collection_idx ON content_items(collection, display_order);
`;

type Row = {
  readonly id: number;
  readonly collection: string;
  readonly data: string;
  readonly display_order: number;
  readonly published: number;
  readonly created_at: number;
  readonly updated_at: number;
};

function mapRow(row: Row): ContentItem {
  let data: Record<string, unknown>;
  try {
    const parsed = JSON.parse(row.data) as unknown;
    data = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    data = {};
  }
  return {
    id: row.id,
    collection: row.collection,
    data,
    displayOrder: row.display_order,
    published: row.published === 1,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function createContentRepo(db: Database.Database): ContentRepo {
  db.exec(SCHEMA_SQL);
  const listAllStmt = db.prepare(
    'SELECT * FROM content_items WHERE collection = ? ORDER BY display_order ASC, id ASC',
  );
  const listPublishedStmt = db.prepare(
    'SELECT * FROM content_items WHERE collection = ? AND published = 1 ORDER BY display_order ASC, id ASC',
  );
  const countsStmt = db.prepare(
    'SELECT COUNT(*) AS total, COALESCE(SUM(published), 0) AS published FROM content_items WHERE collection = ?',
  );
  const findByIdStmt = db.prepare('SELECT * FROM content_items WHERE id = ?');
  const maxOrderStmt = db.prepare(
    'SELECT COALESCE(MAX(display_order), -1) AS max_order FROM content_items WHERE collection = ?',
  );
  const insertStmt = db.prepare(
    `INSERT INTO content_items (collection, data, display_order, published, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
  );
  const updateStmt = db.prepare(
    'UPDATE content_items SET data = ?, updated_at = ? WHERE id = ? RETURNING *',
  );
  const setPublishedStmt = db.prepare(
    'UPDATE content_items SET published = ?, updated_at = ? WHERE id = ? RETURNING *',
  );
  const deleteStmt = db.prepare('DELETE FROM content_items WHERE id = ?');
  const setOrderStmt = db.prepare('UPDATE content_items SET display_order = ? WHERE id = ?');
  const neighborUpStmt = db.prepare(
    `SELECT * FROM content_items WHERE collection = ? AND (display_order < ? OR (display_order = ? AND id < ?))
     ORDER BY display_order DESC, id DESC LIMIT 1`,
  );
  const neighborDownStmt = db.prepare(
    `SELECT * FROM content_items WHERE collection = ? AND (display_order > ? OR (display_order = ? AND id > ?))
     ORDER BY display_order ASC, id ASC LIMIT 1`,
  );

  const requireRow = (row: Row | undefined, id: number, what: string): ContentItem => {
    if (!row) throw new Error(`${what} failed: content item ${id} not found`);
    return mapRow(row);
  };

  const swapOrders = db.transaction((a: ContentItem, b: ContentItem) => {
    // If orders collide (legacy rows), renumber deterministically instead of swapping equal values.
    if (a.displayOrder === b.displayOrder) {
      setOrderStmt.run(a.displayOrder + 1, a.id);
      return;
    }
    setOrderStmt.run(b.displayOrder, a.id);
    setOrderStmt.run(a.displayOrder, b.id);
  });

  return {
    listAll(collection) {
      return (listAllStmt.all(collection) as readonly Row[]).map(mapRow);
    },
    listPublished(collection) {
      return (listPublishedStmt.all(collection) as readonly Row[]).map(mapRow);
    },
    counts(collection) {
      const row = countsStmt.get(collection) as { readonly total: number; readonly published: number };
      return { total: row.total, published: row.published };
    },
    findById(id) {
      const row = findByIdStmt.get(id) as Row | undefined;
      return row ? mapRow(row) : null;
    },
    create(collection, data, published = true) {
      const maxOrder = (maxOrderStmt.get(collection) as { readonly max_order: number }).max_order;
      const now = Date.now();
      const row = insertStmt.get(
        collection,
        JSON.stringify(data),
        maxOrder + 1,
        published ? 1 : 0,
        now,
        now,
      ) as Row;
      return mapRow(row);
    },
    update(id, data) {
      const row = updateStmt.get(JSON.stringify(data), Date.now(), id) as Row | undefined;
      return requireRow(row, id, 'update');
    },
    setPublished(id, published) {
      const row = setPublishedStmt.get(published ? 1 : 0, Date.now(), id) as Row | undefined;
      return requireRow(row, id, 'setPublished');
    },
    remove(id) {
      deleteStmt.run(id);
    },
    move(id, direction) {
      const current = findByIdStmt.get(id) as Row | undefined;
      if (!current) return false;
      const item = mapRow(current);
      const neighborRow = (direction === 'up'
        ? neighborUpStmt.get(item.collection, item.displayOrder, item.displayOrder, item.id)
        : neighborDownStmt.get(item.collection, item.displayOrder, item.displayOrder, item.id)) as
        | Row
        | undefined;
      if (!neighborRow) return false;
      swapOrders(item, mapRow(neighborRow));
      return true;
    },
    getSingleton(collection) {
      const rows = listAllStmt.all(collection) as readonly Row[];
      const first = rows[0];
      return first ? mapRow(first) : null;
    },
    upsertSingleton(collection, data) {
      const rows = listAllStmt.all(collection) as readonly Row[];
      const first = rows[0];
      if (first) {
        const row = updateStmt.get(JSON.stringify(data), Date.now(), first.id) as Row | undefined;
        return requireRow(row, first.id, 'upsertSingleton');
      }
      const now = Date.now();
      const row = insertStmt.get(collection, JSON.stringify(data), 0, 1, now, now) as Row;
      return mapRow(row);
    },
  };
}

/**
 * Idempotent seed: fills empty collections from the parsed site data.
 * Never overwrites existing rows — admin edits always win over the static files.
 * Returns the number of items inserted.
 */
export function seedContent(repo: ContentRepo, seed: SiteSeedData): number {
  let inserted = 0;
  for (const def of collections) {
    if (def.kind === 'singleton') {
      if (repo.getSingleton(def.slug)) continue;
      const data = seed.singletons[def.slug];
      if (!data || Object.keys(data).length === 0) continue;
      repo.upsertSingleton(def.slug, data);
      inserted += 1;
      continue;
    }
    if (repo.counts(def.slug).total > 0) continue;
    const items = seed.lists[def.slug] ?? [];
    for (const item of items) {
      if (!findCollection(def.slug)) continue;
      repo.create(def.slug, { ...item }, true);
      inserted += 1;
    }
  }
  return inserted;
}
