import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Reads the public site's TypeScript data modules (site/src/data/*.ts) and
 * extracts their exported literals so we can seed the CMS without executing
 * arbitrary code. The modules are plain `export const X = ...` literals, so a
 * tolerant JSON parse is enough.
 */

export type SeedItems = readonly Record<string, unknown>[];

export type SiteSeedData = {
  readonly lists: Readonly<Record<string, SeedItems>>;
  readonly singletons: Readonly<Record<string, Record<string, unknown>>>;
};

function readSafe(p: string): string {
  try {
    return readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

/** Finds `export const NAME = [ ... ];` and parses the array literal. */
export function parseExportedArray(src: string, name: string): SeedItems {
  const re = new RegExp(`export const ${name}(?::\\s*[^=]+)?\\s*=\\s*\\[([\\s\\S]*?)\\];`, 'm');
  const m = src.match(re);
  if (!m || !m[1]) return [];
  return tolerantJsonParse<SeedItems>(`[${m[1]}]`) ?? [];
}

export function parseExportedObject(src: string, name: string): Record<string, unknown> {
  const re = new RegExp(`export const ${name}(?::\\s*[^=]+)?\\s*=\\s*\\{([\\s\\S]*?)\\};`, 'm');
  const m = src.match(re);
  if (!m || !m[1]) return {};
  return tolerantJsonParse<Record<string, unknown>>(`{${m[1]}}`) ?? {};
}

export function parseExportedString(src: string, name: string): string | null {
  const re = new RegExp(
    `export const ${name}\\s*=\\s*(\`(?:[^\`\\\\]|\\\\.)*\`|'(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*");`,
    'm',
  );
  const m = src.match(re);
  if (!m || !m[1]) return null;
  const raw = m[1];
  return raw.slice(1, -1).replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"');
}

/** Lenient JSON parse accepting unquoted keys, single quotes, template literals, trailing commas. */
export function tolerantJsonParse<T>(input: string): T | null {
  let s = input.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  s = s.replace(/([\{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)\s*:/g, '$1"$2":');
  s = s.replace(/'((?:[^'\\]|\\.)*)'/g, (_match, body: string) => {
    return `"${body.replace(/\\'/g, "'").replace(/"/g, '\\"')}"`;
  });
  s = s.replace(/`((?:[^`\\]|\\.)*)`/g, (_match, body: string) => {
    return `"${body.replace(/\n/g, '\\n').replace(/"/g, '\\"')}"`;
  });
  s = s.replace(/,(\s*[\}\]])/g, '$1');
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

/** Loads all seedable content from the site data directory, keyed by collection slug. */
export function loadSiteSeedData(siteDataDir: string): SiteSeedData {
  const testimonialsSrc = readSafe(path.join(siteDataDir, 'testimonials.ts'));
  const faqSrc = readSafe(path.join(siteDataDir, 'parentFAQ.ts'));
  const classroomsSrc = readSafe(path.join(siteDataDir, 'classrooms.ts'));
  const statsSrc = readSafe(path.join(siteDataDir, 'schoolStats.ts'));
  const missionSrc = readSafe(path.join(siteDataDir, 'missionStatement.ts'));

  const baldwin = parseExportedObject(missionSrc, 'baldwinQuote');
  const mission: Record<string, unknown> = {};
  for (const key of ['tagline', 'shortMission', 'fullMission', 'missionContext'] as const) {
    const value = parseExportedString(missionSrc, key);
    if (value !== null) mission[key] = value;
  }
  if (typeof baldwin['quote'] === 'string') mission['baldwinQuote'] = baldwin['quote'];
  if (typeof baldwin['source'] === 'string') mission['baldwinQuoteSource'] = baldwin['source'];

  return {
    lists: {
      testimonials: parseExportedArray(testimonialsSrc, 'testimonials'),
      'parent-faq': parseExportedArray(faqSrc, 'parentFAQ'),
      classrooms: parseExportedArray(classroomsSrc, 'classrooms'),
      'stats-list': parseExportedArray(statsSrc, 'statsList'),
    },
    singletons: {
      'school-stats': parseExportedObject(statsSrc, 'schoolStats'),
      'mission-statement': mission,
    },
  };
}
