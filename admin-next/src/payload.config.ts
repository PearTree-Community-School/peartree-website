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
