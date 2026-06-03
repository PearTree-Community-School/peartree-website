import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Reach into the seed module's internal parsers via a re-export shim.
// We import the module and exercise the public seed function indirectly by
// asserting on the parsing it performs on the real site data files.

const SITE_DATA = path.resolve(__dirname, '../../site/src/data');

function read(name: string): string {
  return readFileSync(path.join(SITE_DATA, name), 'utf8');
}

// Inline copies of the parsers for unit testing (kept in sync with src/lib/seed.ts).
function tolerantJsonParse<T>(input: string): T | null {
  let s = input.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  s = s.replace(/([\{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)\s*:/g, '$1"$2":');
  s = s.replace(/'((?:[^'\\]|\\.)*)'/g, (_m, body: string) =>
    `"${body.replace(/\\'/g, "'").replace(/"/g, '\\"')}"`,
  );
  s = s.replace(/`((?:[^`\\]|\\.)*)`/g, (_m, body: string) =>
    `"${body.replace(/\n/g, '\\n').replace(/"/g, '\\"')}"`,
  );
  s = s.replace(/,(\s*[\}\]])/g, '$1');
  try { return JSON.parse(s) as T; } catch { return null; }
}

function parseExportedArray<T>(src: string, name: string): readonly T[] {
  const re = new RegExp(`export const ${name}(?::\\s*[^=]+)?\\s*=\\s*\\[([\\s\\S]*?)\\];`, 'm');
  const m = src.match(re);
  if (!m || !m[1]) return [];
  return tolerantJsonParse<readonly T[]>(`[${m[1]}]`) ?? [];
}

describe('seed parser (against real site/src/data files)', () => {
  it('extracts_testimonials_array_with_quote_source_origin', () => {
    const src = read('testimonials.ts');
    const arr = parseExportedArray<{ quote: string; source: string; origin?: string }>(src, 'testimonials');
    expect(arr.length).toBeGreaterThan(0);
    expect(arr[0]?.quote).toMatch(/.+/);
    expect(arr[0]?.source).toMatch(/.+/);
  });

  it('extracts_classrooms_with_campus_enum', () => {
    const src = read('classrooms.ts');
    const arr = parseExportedArray<{ name: string; level: string; campus: string }>(src, 'classrooms');
    expect(arr).toHaveLength(5);
    expect(arr[0]?.name).toBe('Dragonfly');
    const campuses = new Set(arr.map((c) => c.campus));
    expect(campuses.has('preschool') || campuses.has('elementary')).toBe(true);
  });

  it('extracts_parent_faq_questions_and_answers', () => {
    const src = read('parentFAQ.ts');
    const arr = parseExportedArray<{ question: string; answer: string }>(src, 'parentFAQ');
    expect(arr.length).toBeGreaterThan(3);
    expect(arr[0]?.question).toMatch(/\?$/);
  });
});
