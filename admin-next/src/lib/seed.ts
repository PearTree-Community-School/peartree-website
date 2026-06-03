import type { Payload } from 'payload';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Idempotent seed of starter content from the public-site TypeScript data
 * modules. Skips items that already exist (matched by their natural key).
 * Runs on every Payload init; cheap when already seeded.
 *
 * Globals are upserted unconditionally (latest TS data wins).
 */
export async function seedFromSiteData(payload: Payload): Promise<void> {
  const siteDataDir = path.resolve(process.cwd(), '../site/src/data');

  // Read TS modules as text and extract array/object via dynamic import.
  // We use dynamic import with a file:// URL so this works regardless of cwd.
  let testimonials: ReadonlyArray<{ quote: string; source: string; origin?: string }> = [];
  let parentFAQ: ReadonlyArray<{ question: string; answer: string }> = [];
  let classrooms: ReadonlyArray<{ name: string; level: string; campus: 'preschool' | 'elementary' }> = [];
  let schoolStats: Record<string, unknown> = {};
  let statsList: ReadonlyArray<{ label: string; value: string }> = [];
  let mission: {
    tagline?: string;
    shortMission?: string;
    fullMission?: string;
    missionContext?: string;
    baldwinQuote?: { quote: string; source: string };
  } = {};

  try {
    // These TS files have no internal dependencies and use only plain exports.
    // We strip TypeScript by hand (just parsing simple `export const X = [...]`).
    testimonials = parseExportedArray<typeof testimonials[number]>(
      readSafe(path.join(siteDataDir, 'testimonials.ts')),
      'testimonials',
    );
    parentFAQ = parseExportedArray<typeof parentFAQ[number]>(
      readSafe(path.join(siteDataDir, 'parentFAQ.ts')),
      'parentFAQ',
    );
    classrooms = parseExportedArray<typeof classrooms[number]>(
      readSafe(path.join(siteDataDir, 'classrooms.ts')),
      'classrooms',
    );
    const statsSrc = readSafe(path.join(siteDataDir, 'schoolStats.ts'));
    schoolStats = parseExportedObject(statsSrc, 'schoolStats');
    statsList = parseExportedArray<typeof statsList[number]>(statsSrc, 'statsList');
    const missionSrc = readSafe(path.join(siteDataDir, 'missionStatement.ts'));
    mission = {
      tagline: parseExportedString(missionSrc, 'tagline') ?? undefined,
      shortMission: parseExportedString(missionSrc, 'shortMission') ?? undefined,
      fullMission: parseExportedString(missionSrc, 'fullMission') ?? undefined,
      missionContext: parseExportedString(missionSrc, 'missionContext') ?? undefined,
      baldwinQuote: parseExportedObject(missionSrc, 'baldwinQuote') as { quote: string; source: string },
    };
  } catch (err) {
    payload.logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      'Seed skipped: could not read site data modules',
    );
    return;
  }

  // --- Testimonials ---
  for (let i = 0; i < testimonials.length; i++) {
    const t = testimonials[i];
    if (!t) continue;
    const existing = await payload.find({
      collection: 'testimonials',
      where: { quote: { equals: t.quote } },
      limit: 1,
      overrideAccess: true,
    });
    if (existing.docs.length > 0) continue;
    await payload.create({
      collection: 'testimonials',
      data: { quote: t.quote, source: t.source, origin: t.origin ?? undefined, displayOrder: i, _status: 'published' },
      overrideAccess: true,
    });
  }

  // --- ParentFAQ ---
  for (let i = 0; i < parentFAQ.length; i++) {
    const f = parentFAQ[i];
    if (!f) continue;
    const existing = await payload.find({
      collection: 'parent-faq',
      where: { question: { equals: f.question } },
      limit: 1,
      overrideAccess: true,
    });
    if (existing.docs.length > 0) continue;
    await payload.create({
      collection: 'parent-faq',
      data: { question: f.question, answer: f.answer, displayOrder: i, _status: 'published' },
      overrideAccess: true,
    });
  }

  // --- Classrooms ---
  for (let i = 0; i < classrooms.length; i++) {
    const c = classrooms[i];
    if (!c) continue;
    const existing = await payload.find({
      collection: 'classrooms',
      where: { name: { equals: c.name } },
      limit: 1,
      overrideAccess: true,
    });
    if (existing.docs.length > 0) continue;
    await payload.create({
      collection: 'classrooms',
      data: { name: c.name, level: c.level, campus: c.campus, displayOrder: i, _status: 'published' },
      overrideAccess: true,
    });
  }

  // --- SchoolStats global (upsert) ---
  if (Object.keys(schoolStats).length > 0) {
    await payload.updateGlobal({
      slug: 'school-stats',
      data: { ...schoolStats, statsList: statsList.map((s) => ({ label: s.label, value: s.value })) },
      overrideAccess: true,
    });
  }

  // --- MissionStatement global (upsert) ---
  if (mission.tagline) {
    await payload.updateGlobal({
      slug: 'mission-statement',
      data: {
        tagline: mission.tagline,
        shortMission: mission.shortMission,
        fullMission: mission.fullMission,
        missionContext: mission.missionContext,
        ...(mission.baldwinQuote ? { baldwinQuote: mission.baldwinQuote } : {}),
      },
      overrideAccess: true,
    });
  }

  payload.logger.info('Seed from site data: complete');
}

function readSafe(p: string): string {
  try {
    return readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

/** Trivial parser: finds `export const NAME = [ ... ];` and JSON.parses the array. */
function parseExportedArray<T>(src: string, name: string): readonly T[] {
  const re = new RegExp(`export const ${name}(?::\\s*[^=]+)?\\s*=\\s*\\[([\\s\\S]*?)\\];`, 'm');
  const m = src.match(re);
  if (!m || !m[1]) return [];
  const arrayBody = `[${m[1]}]`;
  return tolerantJsonParse<readonly T[]>(arrayBody) ?? [];
}

function parseExportedObject(src: string, name: string): Record<string, unknown> {
  const re = new RegExp(`export const ${name}(?::\\s*[^=]+)?\\s*=\\s*\\{([\\s\\S]*?)\\};`, 'm');
  const m = src.match(re);
  if (!m || !m[1]) return {};
  return tolerantJsonParse<Record<string, unknown>>(`{${m[1]}}`) ?? {};
}

function parseExportedString(src: string, name: string): string | null {
  const re = new RegExp(`export const ${name}\\s*=\\s*(\`(?:[^\`\\\\]|\\\\.)*\`|'(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*");`, 'm');
  const m = src.match(re);
  if (!m || !m[1]) return null;
  const raw = m[1];
  // Strip surrounding quotes and unescape minimally
  return raw.slice(1, -1).replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"');
}

/** Lenient JSON parse that accepts unquoted keys, single quotes, and trailing commas. */
function tolerantJsonParse<T>(input: string): T | null {
  // Strip block + line comments
  let s = input.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  // Quote unquoted keys: { foo: ... } -> { "foo": ... }
  s = s.replace(/([\{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)\s*:/g, '$1"$2":');
  // Convert single-quoted strings to double-quoted; escape any interior double quotes
  s = s.replace(/'((?:[^'\\]|\\.)*)'/g, (_match, body: string) => {
    return `"${body.replace(/\\'/g, "'").replace(/"/g, '\\"')}"`;
  });
  // Convert template literals (backticks) → JSON strings.
  s = s.replace(/`((?:[^`\\]|\\.)*)`/g, (_match, body: string) => {
    return `"${body.replace(/\n/g, '\\n').replace(/"/g, '\\"')}"`;
  });
  // Drop trailing commas
  s = s.replace(/,(\s*[\}\]])/g, '$1');
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}
