import { sqliteAdapter } from '@payloadcms/db-sqlite';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildConfig } from 'payload';
import { Users } from './collections/Users';
import { AuditLog } from './collections/AuditLog';
import { Testimonials } from './collections/Testimonials';
import { ParentFAQ } from './collections/ParentFAQ';
import { Classrooms } from './collections/Classrooms';
import { TourRequests } from './collections/TourRequests';
import { StaffRequests } from './collections/StaffRequests';
import { SchoolStats } from './globals/SchoolStats';
import { MissionStatement } from './globals/MissionStatement';
import { workosAuthStrategy } from './lib/payload-auth';
import { seedFromSiteData } from './lib/seed';

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
    TourRequests,
    StaffRequests,
    Testimonials,
    ParentFAQ,
    Classrooms,
  ],
  globals: [SchoolStats, MissionStatement],
  editor: lexicalEditor({}),
  secret: process.env['PAYLOAD_SECRET'] ?? 'unset-secret-do-not-use',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: {
      url: process.env['DATABASE_URI'] ?? 'file:./data/admin.sqlite',
    },
    // Keeps the local dev schema in step with this config. Note that Payload
    // ignores `push` in production — it expects migrations there.
    //
    // TODO: there are no migrations yet. The deployed schema was bootstrapped by
    // running dev against a scratch file and uploading it to the Fly volume,
    // which does not scale to the next schema change. Generating migrations is
    // blocked on `payload migrate:create` failing to resolve the extensionless
    // imports in this file under moduleResolution: bundler. Fix before real
    // submissions land, or schema changes will mean hand-editing production.
    push: true,
  }),
  sharp: undefined,
  onInit: async (payload) => {
    if (process.env['ADMIN_NEXT_SKIP_SEED'] === '1') return;
    try {
      await seedFromSiteData(payload);
    } catch (err) {
      payload.logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        'onInit seed failed (non-fatal)',
      );
    }
  },
});
