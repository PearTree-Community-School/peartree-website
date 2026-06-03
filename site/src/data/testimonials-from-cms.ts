/**
 * Optional Payload-backed testimonials fetcher.
 *
 * Falls back to the static TS file if PAYLOAD_API_URL is not set or the fetch
 * fails. Designed to be a drop-in for `testimonials.ts` on pages that want
 * CMS-backed content while leaving other pages unchanged.
 *
 * Set PAYLOAD_API_URL at build time (e.g., http://127.0.0.1:3000/api) to
 * fetch from the admin-next Payload instance.
 *
 * Usage (in any .astro page):
 *
 *   import { getTestimonials } from '../data/testimonials-from-cms.ts';
 *   const testimonials = await getTestimonials();
 */
import { testimonials as fallback, type Testimonial } from './testimonials';

type PayloadResponse = {
  docs: Array<{
    quote: string;
    source: string;
    origin?: string;
    displayOrder?: number;
  }>;
};

export async function getTestimonials(): Promise<readonly Testimonial[]> {
  const base = import.meta.env['PAYLOAD_API_URL'] ?? process.env['PAYLOAD_API_URL'];
  if (!base) return fallback;
  try {
    const res = await fetch(
      `${base.replace(/\/$/, '')}/testimonials?limit=200&where[_status][equals]=published&sort=displayOrder`,
      { headers: { Accept: 'application/json' } },
    );
    if (!res.ok) {
      console.warn(`Payload fetch failed (${res.status}); falling back to static testimonials`);
      return fallback;
    }
    const body = (await res.json()) as PayloadResponse;
    return body.docs.map((d) => ({
      quote: d.quote,
      source: d.source,
      origin: d.origin,
    }));
  } catch (err) {
    console.warn(`Payload fetch errored; falling back: ${err instanceof Error ? err.message : String(err)}`);
    return fallback;
  }
}
