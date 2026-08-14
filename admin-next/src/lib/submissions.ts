/**
 * Shared plumbing for the public submission endpoints.
 *
 * These are the only routes on this app that an unauthenticated stranger can
 * write through, so the guards live here rather than being repeated per route:
 * an origin allowlist, a honeypot, and a per-IP rate limit.
 */

/** Origins permitted to POST submissions and read CORS responses. */
const ALLOWED_ORIGINS: readonly string[] = [
  'https://peartreecs.com',
  'https://www.peartreecs.com',
  'http://localhost:4321', // astro dev
  'http://127.0.0.1:4321',
];

export function isAllowedOrigin(origin: string | null): boolean {
  return Boolean(origin && ALLOWED_ORIGINS.includes(origin));
}

export function corsHeaders(origin: string | null): Record<string, string> {
  // Only echo an origin we actually trust — never reflect an arbitrary one.
  const allowed = isAllowedOrigin(origin) ? origin! : ALLOWED_ORIGINS[0]!;
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

/**
 * Bots fill in every field they find. A real browser leaves this one empty
 * because it is hidden, so any value at all means discard.
 */
export function isHoneypotTripped(body: Record<string, unknown>): boolean {
  const v = body['website'];
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * Per-IP sliding window, held in memory.
 *
 * Deliberately simple: this app runs as a single machine, so a shared store
 * would be over-engineering. The tradeoff is that counters reset on deploy,
 * which is acceptable for slowing casual abuse — it is not a defence against
 * a determined distributed attacker.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

export function clientIp(headers: Headers): string {
  return (
    headers.get('fly-client-ip') ??
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);

  // Opportunistic cleanup so the map cannot grow without bound.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return false;
}

/** Trim and cap a free-text field; returns undefined for empty input. */
export function str(value: unknown, maxLen: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLen);
}
