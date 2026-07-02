import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createContentRepo, seedContent } from '../src/content.js';
import { collections, findCollection, parseContentForm } from '../src/content-schema.js';
import { loadSiteSeedData, tolerantJsonParse } from '../src/site-data.js';
import { openDatabase } from '../src/users.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const siteDataDir = path.resolve(dirname, '../../site/src/data');

function freshRepo() {
  return createContentRepo(openDatabase(':memory:'));
}

describe('content repo', () => {
  it('creates_items_in_append_order', () => {
    const repo = freshRepo();
    const a = repo.create('testimonials', { quote: 'A', source: 'Parent' });
    const b = repo.create('testimonials', { quote: 'B', source: 'Parent' });
    expect(a.displayOrder).toBeLessThan(b.displayOrder);
    const listed = repo.listAll('testimonials');
    expect(listed.map((i) => i.data['quote'])).toEqual(['A', 'B']);
  });

  it('updates_and_reads_back_data', () => {
    const repo = freshRepo();
    const item = repo.create('testimonials', { quote: 'Old', source: 'Parent' });
    const updated = repo.update(item.id, { quote: 'New', source: 'Parent', origin: 'BPN' });
    expect(updated.data['quote']).toBe('New');
    expect(repo.findById(item.id)?.data['origin']).toBe('BPN');
  });

  it('publish_filter_hides_drafts', () => {
    const repo = freshRepo();
    repo.create('testimonials', { quote: 'Live', source: 'Parent' }, true);
    const draft = repo.create('testimonials', { quote: 'Draft', source: 'Parent' }, false);
    expect(repo.listPublished('testimonials').map((i) => i.data['quote'])).toEqual(['Live']);
    repo.setPublished(draft.id, true);
    expect(repo.listPublished('testimonials')).toHaveLength(2);
    expect(repo.counts('testimonials')).toEqual({ total: 2, published: 2 });
  });

  it('move_swaps_neighbors_and_stops_at_edges', () => {
    const repo = freshRepo();
    const a = repo.create('classrooms', { name: 'A', level: 'x', campus: 'preschool' });
    const b = repo.create('classrooms', { name: 'B', level: 'x', campus: 'preschool' });
    const c = repo.create('classrooms', { name: 'C', level: 'x', campus: 'preschool' });
    expect(repo.move(a.id, 'up')).toBe(false);
    expect(repo.move(c.id, 'down')).toBe(false);
    expect(repo.move(b.id, 'up')).toBe(true);
    expect(repo.listAll('classrooms').map((i) => i.data['name'])).toEqual(['B', 'A', 'C']);
  });

  it('delete_removes_item', () => {
    const repo = freshRepo();
    const item = repo.create('parent-faq', { question: 'Q', answer: 'A' });
    repo.remove(item.id);
    expect(repo.findById(item.id)).toBeNull();
    expect(repo.counts('parent-faq').total).toBe(0);
  });

  it('singleton_upsert_creates_then_updates', () => {
    const repo = freshRepo();
    expect(repo.getSingleton('school-stats')).toBeNull();
    repo.upsertSingleton('school-stats', { founded: 2012 });
    repo.upsertSingleton('school-stats', { founded: 2013 });
    const item = repo.getSingleton('school-stats');
    expect(item?.data['founded']).toBe(2013);
    expect(repo.counts('school-stats').total).toBe(1);
  });
});

describe('site data seed', () => {
  it('loads_real_site_data_modules', () => {
    const seed = loadSiteSeedData(siteDataDir);
    expect(seed.lists['testimonials']?.length).toBeGreaterThan(0);
    expect(seed.lists['parent-faq']?.length).toBeGreaterThan(0);
    expect(seed.lists['classrooms']?.length).toBeGreaterThan(0);
    expect(seed.lists['stats-list']?.length).toBeGreaterThan(0);
    expect(seed.singletons['school-stats']?.['founded']).toBe(2012);
    expect(seed.singletons['mission-statement']?.['tagline']).toContain('Oakland');
    expect(seed.singletons['mission-statement']?.['baldwinQuote']).toContain('children');
  });

  it('seed_is_idempotent_and_respects_edits', () => {
    const repo = freshRepo();
    const seed = loadSiteSeedData(siteDataDir);
    const first = seedContent(repo, seed);
    expect(first).toBeGreaterThan(0);
    const again = seedContent(repo, seed);
    expect(again).toBe(0);
    const item = repo.listAll('testimonials')[0];
    expect(item).toBeDefined();
    if (!item) return;
    repo.update(item.id, { ...item.data, quote: 'Edited by admin' });
    seedContent(repo, seed);
    expect(repo.findById(item.id)?.data['quote']).toBe('Edited by admin');
  });

  it('seeded_items_validate_against_their_collection_schemas', () => {
    const repo = freshRepo();
    seedContent(repo, loadSiteSeedData(siteDataDir));
    for (const def of collections) {
      for (const item of repo.listAll(def.slug)) {
        const form = new FormData();
        for (const [key, value] of Object.entries(item.data)) {
          form.set(key, String(value));
        }
        const parsed = parseContentForm(def, form);
        expect(parsed.ok, `${def.slug} item ${item.id}: ${parsed.ok ? '' : parsed.message}`).toBe(true);
      }
    }
  });

  it('tolerant_parse_handles_ts_literals', () => {
    expect(tolerantJsonParse(`[{ quote: 'It\\'s great', source: "Parent", },]`)).toEqual([
      { quote: "It's great", source: 'Parent' },
    ]);
    expect(tolerantJsonParse('{ founded: 2012, grades: `TK–5` }')).toEqual({
      founded: 2012,
      grades: 'TK–5',
    });
  });
});

describe('content form validation', () => {
  it('rejects_missing_required_fields', () => {
    const def = findCollection('testimonials');
    expect(def).not.toBeNull();
    if (!def) return;
    const form = new FormData();
    form.set('source', 'Parent');
    const parsed = parseContentForm(def, form);
    expect(parsed.ok).toBe(false);
  });

  it('rejects_invalid_select_option', () => {
    const def = findCollection('classrooms');
    if (!def) throw new Error('missing def');
    const form = new FormData();
    form.set('name', 'Dragonfly');
    form.set('level', 'Preschool');
    form.set('campus', 'space-station');
    const parsed = parseContentForm(def, form);
    expect(parsed.ok).toBe(false);
  });

  it('coerces_numbers_and_drops_empty_optionals', () => {
    const statsDef = findCollection('school-stats');
    if (!statsDef) throw new Error('missing def');
    const form = new FormData();
    form.set('founded', '2012');
    form.set('studentsOfColor', '95');
    form.set('familiesReceivingAid', '80');
    form.set('exceedLiteracyBenchmarks', '90');
    form.set('staffCount', '20');
    form.set('preschoolMinAge', '2');
    form.set('elementaryGrades', 'TK–5');
    const parsed = parseContentForm(statsDef, form);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data['founded']).toBe(2012);

    const testimonialDef = findCollection('testimonials');
    if (!testimonialDef) throw new Error('missing def');
    const tForm = new FormData();
    tForm.set('quote', 'Great school');
    tForm.set('source', 'Parent');
    tForm.set('origin', '   ');
    const tParsed = parseContentForm(testimonialDef, tForm);
    expect(tParsed.ok).toBe(true);
    if (!tParsed.ok) return;
    expect('origin' in tParsed.data).toBe(false);
  });
});
