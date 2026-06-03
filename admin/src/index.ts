import { serve } from '@hono/node-server';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createAuditRepo } from './audit.js';
import { requireAdminEnv } from './config.js';
import { createAdminApp } from './server.js';
import { createUsersRepo, openDatabase } from './users.js';

const env = requireAdminEnv(process.env);

const dbPath = resolve(env.ADMIN_DB_PATH);
mkdirSync(dirname(dbPath), { recursive: true });
const db = openDatabase(dbPath);
const users = createUsersRepo(db);
const audit = createAuditRepo(db);

const app = createAdminApp({ env, users, audit });

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
