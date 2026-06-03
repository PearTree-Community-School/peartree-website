/**
 * Seed Payload from the existing public-site TypeScript data files.
 *
 * Usage:  npx tsx scripts/seed.ts
 *
 * Idempotent for collections: skips items whose unique key already exists.
 * Globals are upserted unconditionally (latest wins).
 */
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPayload } from 'payload';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_DATA_DIR = path.resolve(__dirname, '../../site/src/data');

async function main(): Promise<void> {
  const { default: config } = await import('../src/payload.config.js');
  const payload = await getPayload({ config });

  // Dynamic imports so this script doesn't need site/ to compile at the admin-next root.
  const { testimonials } = (await import(`${SITE_DATA_DIR}/testimonials.ts`)) as {
    testimonials: ReadonlyArray<{ quote: string; source: string; origin?: string }>;
  };
  const { parentFAQ } = (await import(`${SITE_DATA_DIR}/parentFAQ.ts`)) as {
    parentFAQ: ReadonlyArray<{ question: string; answer: string }>;
  };
  const { classrooms } = (await import(`${SITE_DATA_DIR}/classrooms.ts`)) as {
    classrooms: ReadonlyArray<{ name: string; level: string; campus: 'preschool' | 'elementary' }>;
  };
  const { schoolStats, statsList } = (await import(`${SITE_DATA_DIR}/schoolStats.ts`)) as {
    schoolStats: {
      founded: number;
      studentsOfColor: number;
      familiesReceivingAid: number;
      exceedLiteracyBenchmarks: number;
      staffCount: number;
      preschoolMinAge: number;
      elementaryGrades: string;
    };
    statsList: ReadonlyArray<{ label: string; value: string }>;
  };
  const mission = (await import(`${SITE_DATA_DIR}/missionStatement.ts`)) as {
    tagline: string;
    shortMission: string;
    fullMission: string;
    missionContext: string;
    baldwinQuote: { quote: string; source: string };
  };

  // --- Testimonials (idempotent by quote) ---
  for (let i = 0; i < testimonials.length; i++) {
    const t = testimonials[i];
    if (!t) continue;
    const existing = await payload.find({
      collection: 'testimonials',
      where: { quote: { equals: t.quote } },
      limit: 1,
      overrideAccess: true,
    });
    if (existing.docs.length > 0) {
      console.log(`  testimonial[${i}] exists, skipping`);
      continue;
    }
    await payload.create({
      collection: 'testimonials',
      data: { quote: t.quote, source: t.source, origin: t.origin, displayOrder: i },
      overrideAccess: true,
    });
    console.log(`  + testimonial[${i}] by ${t.source}`);
  }

  // --- ParentFAQ (idempotent by question) ---
  for (let i = 0; i < parentFAQ.length; i++) {
    const f = parentFAQ[i];
    if (!f) continue;
    const existing = await payload.find({
      collection: 'parent-faq',
      where: { question: { equals: f.question } },
      limit: 1,
      overrideAccess: true,
    });
    if (existing.docs.length > 0) {
      console.log(`  faq[${i}] exists, skipping`);
      continue;
    }
    await payload.create({
      collection: 'parent-faq',
      data: { question: f.question, answer: f.answer, displayOrder: i },
      overrideAccess: true,
    });
    console.log(`  + faq[${i}]: ${f.question.slice(0, 60)}…`);
  }

  // --- Classrooms (idempotent by name) ---
  for (let i = 0; i < classrooms.length; i++) {
    const c = classrooms[i];
    if (!c) continue;
    const existing = await payload.find({
      collection: 'classrooms',
      where: { name: { equals: c.name } },
      limit: 1,
      overrideAccess: true,
    });
    if (existing.docs.length > 0) {
      console.log(`  classroom[${i}] exists, skipping`);
      continue;
    }
    await payload.create({
      collection: 'classrooms',
      data: { name: c.name, level: c.level, campus: c.campus, displayOrder: i },
      overrideAccess: true,
    });
    console.log(`  + classroom[${i}]: ${c.name}`);
  }

  // --- SchoolStats global (upsert) ---
  await payload.updateGlobal({
    slug: 'school-stats',
    data: {
      ...schoolStats,
      statsList: statsList.map((s) => ({ label: s.label, value: s.value })),
    },
    overrideAccess: true,
  });
  console.log('  ~ school-stats global');

  // --- MissionStatement global (upsert) ---
  await payload.updateGlobal({
    slug: 'mission-statement',
    data: {
      tagline: mission.tagline,
      shortMission: mission.shortMission,
      fullMission: mission.fullMission,
      missionContext: mission.missionContext,
      baldwinQuote: { quote: mission.baldwinQuote.quote, source: mission.baldwinQuote.source },
    },
    overrideAccess: true,
  });
  console.log('  ~ mission-statement global');

  console.log('\nSeed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
