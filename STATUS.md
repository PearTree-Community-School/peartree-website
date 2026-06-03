# Overnight Build Status — 2026-06-03

Built while you slept. Read top-to-bottom; the TL;DR is at the very bottom.

## What Changed

The previous `admin/` (Hono baseline) is **untouched and still works**. A new
`admin-next/` (Next.js + Payload CMS) is the rebuild. Both run on port 3000
(can't run simultaneously). Switch by running `npm run dev` in whichever
directory you want.

```
website/
├── admin/             ← Hono baseline (unchanged, still 48/48 tests passing)
├── admin-next/        ← NEW: Next.js 16 + Payload CMS + SQLite (this rebuild)
├── site/              ← Astro public site (unchanged; only ONE new file added)
└── STATUS.md          ← this file
```

## What's Verified Live

Booted the admin-next server, smoke-tested every endpoint:

| Endpoint                              | Status | Notes                                       |
| ------------------------------------- | ------ | ------------------------------------------- |
| `GET  /health`                        | 200    | `{ok:true, service:"peartree-admin-next"}`  |
| `GET  /auth/sign-in`                  | 307    | Redirects to WorkOS AuthKit correctly       |
| `GET  /admin`                         | 200    | Payload admin UI loads (title "Dashboard")  |
| `GET  /api/testimonials?limit=4`      | 200    | 4 seeded testimonials, `_status=published`  |
| `GET  /api/parent-faq?limit=2`        | 200    | 12 seeded FAQ entries                       |
| `GET  /api/globals/school-stats`      | 200    | Global with 7-item statsList                |

SQLite DB at `admin-next/data/admin.sqlite` populated automatically on first
boot via Payload's `onInit` hook reading `site/src/data/*.ts`.

23/23 unit tests passing.

## What Needs Your Hands

Three things I genuinely cannot verify alone — all need a human to log in
through the WorkOS hosted page:

1. **End-to-end sign-in flow** — visit
   `http://127.0.0.1:3000/auth/sign-in`, complete WorkOS login as
   `andrew.leon.johnson@gmail.com`, and confirm you land at `/admin` with
   super_admin role. Bootstrap-on-first-login should fire because the DB starts
   empty for that user.

2. **WorkOS webhook signature verification** — the previous cloudflared tunnel
   was killed. To re-test webhooks:
   - Restart cloudflared in a separate terminal: `cloudflared tunnel --url http://127.0.0.1:3000`
   - In WorkOS dashboard → Webhooks → edit the existing endpoint → change the URL to the new tunnel URL
   - Copy the signing secret into `admin-next/.env` as `WORKOS_WEBHOOK_SECRET`
   - Restart `npm run dev`
   - Sign in to trigger an event, then check `/api/audit-log?limit=5`

3. **Payload admin gating** — once you sign in via WorkOS, confirm the
   `/admin` Payload UI recognizes your user from our custom auth strategy
   (`workosAuthStrategy` in `src/lib/payload-auth.ts`). If it doesn't,
   that's where I'd expect the only real auth-bridge surprise.

## Stack Decisions

| Question                   | Choice                                                |
| -------------------------- | ----------------------------------------------------- |
| Framework                  | Next.js 16.2.7 (App Router) + React 19                |
| CMS                        | Payload v3.85                                         |
| DB                         | SQLite via `@payloadcms/db-sqlite`                    |
| Rich text editor           | Lexical via `@payloadcms/richtext-lexical`            |
| Auth                       | WorkOS AuthKit via custom Payload `AuthStrategy`      |
| Session                    | Sealed cookie (`pt_admin_session`, HttpOnly, Lax, 8h) |
| Env validation             | Zod (`src/lib/env.ts`)                                |
| Audit log                  | Payload collection with `externalId` UNIQUE for idempotency |
| Astro public site          | Unchanged. One **optional** new file added (next section). |

## Collections + Globals Defined

### Collections (multi-doc)

- **`users`** — workosUserId, email, role, status, firstName, lastName, lastLoginAt.
  Auth via WorkOS only (Payload's local strategy disabled). Hooks for audit on
  create/update/delete.
- **`audit-log`** — append-only. Action, actorEmail, targetEmail, summary,
  externalId. Update/delete blocked by access control.
- **`testimonials`** — quote, source, origin, displayOrder. Drafts enabled.
- **`parent-faq`** — question, answer, displayOrder. Drafts enabled.
- **`classrooms`** — name, level, campus (preschool/elementary), displayOrder.
  Drafts enabled.

### Globals (single-doc)

- **`school-stats`** — founded, studentsOfColor, familiesReceivingAid,
  exceedLiteracyBenchmarks, staffCount, preschoolMinAge, elementaryGrades,
  statsList (array of label/value).
- **`mission-statement`** — tagline, shortMission, fullMission,
  missionContext, baldwinQuote (quote/source).

### What I Did NOT Migrate

Out of the 19 modules in `site/src/data/`, I migrated 5 of the most useful.
The rest still live as TS files and can be migrated later when needed:

  admissionProcess, campusInfo, educationalPhilosophy, givingTiers, medium-articles,
  mirrorFramework, monthlyAlerts, monthlyGivingTiers, parentSquareLinks,
  recognition, staffRequestCategories, summerCamp, tourInfo

Pattern is identical: add a CollectionConfig or GlobalConfig, add to
`payload.config.ts`, optionally extend `seedFromSiteData` in `src/lib/seed.ts`.

## How Seeding Works (Important)

I tried to write a standalone seed script (`scripts/seed.ts`) but hit
Node ESM/Payload tsx friction — the `payload run` CLI couldn't resolve
TypeScript imports cleanly from outside the Next.js bundle context.

**Pivoted to Payload's `onInit` hook** in `src/payload.config.ts`. This:

- Runs once on every server boot (cheap when already seeded).
- Reads `site/src/data/*.ts` as text and parses with a tolerant
  JSON parser (handles unquoted keys, single quotes, template literals,
  trailing commas, line/block comments).
- Idempotent — skips rows whose natural key already exists.
- Upserts globals unconditionally (latest TS data wins).
- Disable with `ADMIN_NEXT_SKIP_SEED=1` if you ever want a clean DB.

`scripts/seed.ts` is kept as a stub for the eventual "real" seed CLI but is
not the live path. The `npm run seed` script will fail; ignore for now.

## Astro Public Site

**Untouched** — your three theme variants (v1, v2, v3) and all 9 pages render
exactly the same. The only addition is one new file:

- `site/src/data/testimonials-from-cms.ts` — a *documented, unused* helper.
  Drop-in replacement for `testimonials.ts` for any page that wants
  CMS-backed testimonials. Falls back to the static TS file if
  `PAYLOAD_API_URL` is not set or the fetch fails. Activate with
  `PAYLOAD_API_URL=http://127.0.0.1:3000/api` at build time.

You decide if/when to wire pages to Payload. Until then, the site builds
identically to before.

## Test Coverage (23/23 passing)

- `test/policy.test.ts` — 5 tests on the RBAC matrix.
- `test/env.test.ts` — 3 tests on env validation (fail-closed, no secret echo).
- `test/workos-webhooks.test.ts` — 5 tests on event → audit-entry mapping.
- `test/provision.test.ts` — 7 tests on bootstrap, link-by-email, returning user,
  disabled, email-conflict, no-bootstrap-when-table-populated.
- `test/seed-parser.test.ts` — 3 tests against the real `site/src/data/*.ts`
  files, confirming the parser extracts arrays cleanly.

## Calls I Made Without Asking

These are the judgment calls I logged here so you can audit:

1. **Next.js 16 + React 19** — Payload supports both Next 15 (with caveats)
   and Next 16. Went with 16 for forward-compat.
2. **Sealed cookies, not Payload's JWT** — Payload's local strategy is
   disabled. The session lives in our WorkOS sealed cookie. Cleaner
   separation but means Payload's "logged in user" comes entirely from our
   custom auth strategy.
3. **Bootstrap-on-empty + bootstrap-emails env** — same pattern as the Hono
   baseline. First sign-in by a bootstrap-listed email auto-creates a
   super_admin.
4. **Audit hooks on Users collection** — added `afterChange` and `afterDelete`
   hooks. Editing a user in Payload's admin writes to `audit-log`.
   `actorEmail` comes from `req.user.email` (the signed-in editor).
5. **Drafts enabled on content collections** — testimonials, parent-faq,
   classrooms all version-tracked with drafts. Seeded items marked
   `_status: 'published'` so they show up via the public API immediately.
6. **5 of 19 data modules migrated** — picked the most-used cross-page
   content (testimonials, FAQ, classrooms, stats, mission). The rest are
   straightforward follow-ups using the same pattern.
7. **`scripts/seed.ts` stub left in place but unused** — kept for when we
   solve the ESM/Payload CLI friction. Live seeding is in `onInit`.

## How to Run admin-next

```bash
cd admin-next
cp .env.example .env
# Generate two secrets:
#   PAYLOAD_SECRET=$(openssl rand -hex 32)
#   WORKOS_COOKIE_PASSWORD=$(openssl rand -hex 32)
# Fill the rest from your existing admin/.env (WORKOS_API_KEY, etc.)
npm install
npm run dev          # starts on :3000
# Visit http://127.0.0.1:3000/admin → should redirect to sign-in if no session
# Visit http://127.0.0.1:3000/auth/sign-in → WorkOS hosted login
```

My `.env` for testing is already populated in `admin-next/.env` with the
WORKOS_CLIENT_ID and WORKOS_API_KEY from earlier. **Rotate that API key
again** since this conversation history captured it.

## Cutover Path When You're Ready

1. Sign in via WorkOS, confirm Payload admin recognizes you, edit a
   testimonial in the Payload UI to prove the editor works.
2. Set `PAYLOAD_API_URL=http://127.0.0.1:3000/api` in `site/`'s build env.
3. Change `site/src/pages/index.astro` (or wherever testimonials render) to
   import from `testimonials-from-cms.ts` instead of `testimonials.ts`.
4. Build the public site — testimonials now come from Payload.
5. Repeat for other collections as appetite permits.
6. When confident, delete the corresponding `site/src/data/*.ts` file (or
   leave as a fallback — Astro will keep building either way).

## Git History

```
admin-next: content collections, seed-on-init, Astro fetch helper
admin-next: tests for policy, env, webhooks, provision (20/20 passing)
admin-next: scaffold Next.js 16 + Payload v3 + SQLite
Hono admin baseline: WorkOS auth + users + audit + webhooks
```

Each commit is independently reviewable and revertable.

## TL;DR

- `admin-next/` is the Payload-backed rebuild. **Builds, boots, serves all
  routes, and has 23/23 unit tests passing.**
- Content from `site/src/data/*.ts` is seeded into SQLite on every boot
  (idempotent). 5 of 19 modules migrated; the other 14 stay as TS files.
- Astro public site is untouched. One opt-in helper file added.
- **What needs you:** sign in once to verify the WorkOS → Payload auth
  bridge works end-to-end. That's the only thing I couldn't smoke-test.
- The old Hono `admin/` is preserved and still works. Cutover is your call.
