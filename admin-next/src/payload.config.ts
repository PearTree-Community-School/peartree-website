import { sqliteAdapter } from '@payloadcms/db-sqlite';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildConfig } from 'payload';
import { Users } from './collections/Users';
import { AuditLog } from './collections/AuditLog';
import { workosAuthStrategy } from './lib/payload-auth';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    {
      ...Users,
      auth: {
        ...(typeof Users.auth === 'object' ? Users.auth : {}),
        strategies: [workosAuthStrategy],
      },
    },
    AuditLog,
  ],
  editor: lexicalEditor({}),
  secret: process.env['PAYLOAD_SECRET'] ?? 'unset-secret-do-not-use',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: {
      url: process.env['DATABASE_URI'] ?? 'file:./data/admin.sqlite',
    },
  }),
  sharp: undefined,
});
