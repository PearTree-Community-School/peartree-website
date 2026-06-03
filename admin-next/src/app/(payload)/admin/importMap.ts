/**
 * Payload importMap.
 *
 * Normally generated via `payload generate:importmap`. That CLI hits Node ESM
 * resolution friction in our setup, and a manual importMap with @payloadcms/ui/rsc
 * + @payloadcms/next/rsc components breaks client rendering.
 *
 * Keeping this empty leaves "Loading…" cosmetic placeholders in some Updated At
 * / Created At cells but the admin otherwise works fully. Tracked as a known
 * follow-up in STATUS.md.
 */
export const importMap = {};
