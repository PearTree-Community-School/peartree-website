import { serve } from '@hono/node-server';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createAuditRepo } from './audit.js';
import { requireAdminEnv } from './config.js';
import { createContentRepo, seedContent } from './content.js';
import { createAdminApp } from './server.js';
import { loadSiteSeedData } from './site-data.js';
import { createUsersRepo, openDatabase } from './users.js';

const env = requireAdminEnv(process.env);

const dbPath = resolve(env.ADMIN_DB_PATH);
mkdirSync(dirname(dbPath), { recursive: true });
const db = openDatabase(dbPath);
const users = createUsersRepo(db);
const audit = createAuditRepo(db);
const content = createContentRepo(db);

const siteDataDir = resolve(process.env['SITE_DATA_DIR'] ?? '../site/src/data');
const seeded = seedContent(content, loadSiteSeedData(siteDataDir));
if (seeded > 0) {
  process.stdout.write(`Seeded ${seeded} content item(s) from ${siteDataDir}\n`);
}

const app = createAdminApp({ env, users, audit, content });

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    process.stdout.write(`PearTree admin listening on http://127.0.0.1:${info.port}\n`);
    process.stdout.write(`DB: ${dbPath}\n`);
  },
);
