/**
 * Optional CMS-backed content fetchers for the PearTree admin (Hono service).
 *
 * Every helper falls back to the static TS data module if ADMIN_API_URL is not
 * set or the fetch fails — so all three site variants keep building with zero
 * config, and pages opt in one import at a time.
 *
 * Set ADMIN_API_URL at build time (e.g. http://127.0.0.1:3000) to pull
 * published content from the admin instead.
 *
 * Usage (in any .astro page):
 *
 *   import { getTestimonials } from '../data/cms';
 *   const testimonials = await getTestimonials();
 */
import { testimonials as testimonialsFallback, type Testimonial } from './testimonials';
import { parentFAQ as faqFallback, type FAQ } from './parentFAQ';
import { classrooms as classroomsFallback, type Classroom } from './classrooms';
import { schoolStats as schoolStatsFallback, statsList as statsListFallback } from './schoolStats';
import {
  tagline as taglineFallback,
  shortMission as shortMissionFallback,
  fullMission as fullMissionFallback,
  missionContext as missionContextFallback,
  baldwinQuote as baldwinQuoteFallback,
} from './missionStatement';

function apiBase(): string | undefined {
  const base = import.meta.env['ADMIN_API_URL'] ?? process.env['ADMIN_API_URL'];
  return typeof base === 'string' && base.length > 0 ? base.replace(/\/$/, '') : undefined;
}

async function fetchJson<T>(path: string): Promise<T | null> {
  const base = apiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}${path}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      console.warn(`CMS fetch ${path} failed (${res.status}); using static fallback`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`CMS fetch ${path} errored (${String(err)}); using static fallback`);
    return null;
  }
}

/** CMS-served items carry their DB id so the edit overlay can deep-link to the right form. */
export type WithId<T> = T & { id?: number };

async function fetchList<T>(slug: string, fallback: readonly T[]): Promise<readonly WithId<T>[]> {
  // Payload serves collections at /api/<slug> and wraps them in `docs`. The
  // default page size is 10, which silently truncated the FAQ; ask for more.
  const body = await fetchJson<{ docs: WithId<T>[] }>(`/api/${slug}?limit=200&depth=0`);
  return body && Array.isArray(body.docs) && body.docs.length > 0 ? body.docs : fallback;
}

async function fetchSingleton<T extends Record<string, unknown>>(slug: string): Promise<T | null> {
  // Globals live under /api/globals/<slug> and return the object directly.
  return await fetchJson<T>(`/api/globals/${slug}?depth=0`);
}

export async function getTestimonials(): Promise<readonly WithId<Testimonial>[]> {
  return fetchList<Testimonial>('testimonials', testimonialsFallback);
}

export async function getParentFAQ(): Promise<readonly WithId<FAQ>[]> {
  return fetchList<FAQ>('parent-faq', faqFallback);
}

export async function getClassrooms(): Promise<readonly WithId<Classroom>[]> {
  return fetchList<Classroom>('classrooms', classroomsFallback);
}

export async function getStatsList(): Promise<readonly WithId<{ label: string; value: string }>[]> {
  // Not a collection — an array field on the school-stats global.
  const data = await fetchSingleton<Record<string, unknown>>('school-stats');
  const list = data?.['statsList'];
  if (!Array.isArray(list) || list.length === 0) return statsListFallback;
  return list as readonly WithId<{ label: string; value: string }>[];
}

export async function getSchoolStats(): Promise<typeof schoolStatsFallback> {
  const data = await fetchSingleton<Record<string, unknown>>('school-stats');
  return data ? { ...schoolStatsFallback, ...data } : schoolStatsFallback;
}

export type Mission = {
  tagline: string;
  shortMission: string;
  fullMission: string;
  missionContext: string;
  baldwinQuote: { quote: string; source: string };
};

export async function getMission(): Promise<Mission> {
  const fallback: Mission = {
    tagline: taglineFallback,
    shortMission: shortMissionFallback,
    fullMission: fullMissionFallback,
    missionContext: missionContextFallback,
    baldwinQuote: baldwinQuoteFallback,
  };
  const data = await fetchSingleton<Record<string, unknown>>('mission-statement');
  if (!data) return fallback;
  return {
    tagline: typeof data['tagline'] === 'string' ? data['tagline'] : fallback.tagline,
    shortMission: typeof data['shortMission'] === 'string' ? data['shortMission'] : fallback.shortMission,
    fullMission: typeof data['fullMission'] === 'string' ? data['fullMission'] : fallback.fullMission,
    missionContext:
      typeof data['missionContext'] === 'string' ? data['missionContext'] : fallback.missionContext,
    baldwinQuote: {
      quote: typeof data['baldwinQuote'] === 'string' ? data['baldwinQuote'] : fallback.baldwinQuote.quote,
      source:
        typeof data['baldwinQuoteSource'] === 'string'
          ? data['baldwinQuoteSource']
          : fallback.baldwinQuote.source,
    },
  };
}
