# PearTree Admin Panel & Backend — Plan

Status: WorkOS AuthKit + SQLite users table + bootstrap-on-first-login shipped (2026-06-02). DB choice: **SQLite** via raw better-sqlite3 (drizzle deferred until 2+ tables).

## Goal

Add a backend and admin panel to the PearTree website (currently a static Astro site at `site/`). Admin panel must support:

1. **Authentication** — staff log in securely (WorkOS preferred).
2. **Authorization** — fine-grained control over what each user can do and which parts of the site they can access.
3. **User management** — add / remove users, assign roles, audit activity.
4. **Content editing** — non-technical staff edit site content (programs, news, photos, donation copy, etc.) without touching code.

Constraints / preferences:
- Use industry standards. Security-first.
- Model after sites that do this well (Sanity Studio, Payload, Linear, Vercel).
- Keep operational burden low — PearTree is a small nonprofit, not a SaaS company.

## Current State

- Astro 5 static site in `site/`
- Tailwind 3
- No backend, no DB, no auth
- Content is hard-coded in `.astro` files and `content/` markdown
- Deploy target: static hosting (presumably Netlify/Vercel/Cloudflare)

## Three Architectural Forks (decide before UI design)

### Fork 1 — Auth product

| Option | Fit | Notes |
|---|---|---|
| **WorkOS AuthKit** ✅ recommended | Right-sized for ~5–20 internal staff | Hosted login, MFA, passkeys, magic links, audit logs. ~$0 free tier covers a nonprofit. |
| WorkOS SSO (enterprise SAML/SCIM) | Overkill | Only if PearTree itself becomes a B2B platform with org-based customers. |
| Auth.js / Lucia / Clerk | Viable alternatives | Clerk is the closest competitor; pick WorkOS if "standards + security posture" is the deciding factor. |

**Decision: WorkOS AuthKit.** The repo now includes a minimal Node/Hono admin service in `admin/` that generates the AuthKit sign-in redirect server-side with `@workos-inc/node`.

### Fork 2 — Permissions model

| Option | Fit | Notes |
|---|---|---|
| **RBAC + resource scoping** ✅ recommended | Matches mental model staff already have | Roles: `SuperAdmin`, `Admin`, `Editor`, `Author`, `Viewer`. Editors can be scoped to a section (e.g., "Programs only"). |
| ReBAC (WorkOS FGA / OpenFGA) | Powerful, overkill for v1 | "Alice can edit *this specific page*". Worth revisiting if per-page ownership becomes a real need. |
| Pure ACLs | Don't | Hard to reason about, hard to audit. |

**Decision: RBAC + section scoping.** The first role/permission contract is implemented in `admin/src/policy.ts`. Keep WorkOS FGA as a future upgrade only if per-page or relationship-based ownership becomes necessary.

#### Proposed roles (starting point)

| Role | Can do |
|---|---|
| **SuperAdmin** | Everything, including managing other admins, role definitions, billing, integrations. ≤2 people. |
| **Admin** | Manage users (non-admin), publish all content, view audit log. |
| **Editor** | Create / edit / publish content within assigned sections. Cannot manage users. |
| **Author** | Create / edit drafts. Cannot publish. Submits for review. |
| **Viewer** | Read-only access to admin (e.g., board members, donors with reporting access). |

Section scoping (Editor/Author): `Programs`, `News & Events`, `About / Team`, `Donate`, `Media Library`, `Site Settings`.

### Fork 3 — Backend + CMS architecture

| Option | Pros | Cons |
|---|---|---|
| **(a) Headless CMS — Payload** ✅ recommended | TS, self-hosted, first-class RBAC + field-level access control, WorkOS plugs in cleanly, admin UI is gold-standard. SQLite adapter supported. | Single Node process to host. |
| (a′) Headless CMS — Sanity | Hosted, no DB to run, great editor UX. | Pricing scales with users/content; less control. |
| (b) Build it ourselves | Maximum control. | Most engineering work; we'd be reinventing what Payload gives free. |
| (c) Git-based CMS — Decap / Tina | Content stays in repo, PR workflow. | Weak for non-technical editors; weak permissions; weak media. |

**Decision: Payload CMS for the content backend, implemented after the AuthKit vertical slice.** The current scaffold does not claim CMS editing is done; it establishes the authenticated admin service boundary that Payload will attach to.

## Recommended Stack (if all three recommendations adopted)

```
┌─────────────────────────────────────────────────────────────┐
│  Browser                                                    │
│   ├─ peartreechristian.org  (Astro static site, public)     │
│   └─ admin.peartreechristian.org  (Payload admin UI)        │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
               ▼                          ▼
       ┌───────────────┐         ┌──────────────────┐
       │  Astro build  │◄────────┤  Payload CMS     │
       │  (static)     │  fetch  │  (Node + SQLite) │
       └───────────────┘  at     │  on a Fly volume │
                          build  │                  │
                                 │  Auth via WorkOS │
                                 │  AuthKit         │
                                 └──────────────────┘
                                          │
                                          ▼
                                  ┌──────────────────┐
                                  │  litestream →    │
                                  │  Cloudflare R2   │
                                  │  (live backup)   │
                                  └──────────────────┘
```

- **Frontend (public)**: Astro stays as-is, fetches content from Payload at build time → still deploys as static HTML. Fast, cacheable, cheap.
- **Admin service**: `admin/` Node + Hono + TypeScript. First routes: `/health`, `/auth/sign-in`, `/auth/callback`, `/admin`.
- **Backend/CMS**: Payload (Node) + **SQLite** (`@payloadcms/db-sqlite`) on a single Fly.io machine with a persistent volume. ~$3–5/mo. Continuous backup via **litestream → Cloudflare R2**. Single-writer model is fine for ~5–20 staff. Migration to Postgres is a one-line adapter swap if we ever outgrow it.
- **Auth**: WorkOS AuthKit. The sign-in route calls `workos.userManagement.getAuthorizationUrl({ provider: 'authkit', ... })` server-side. Payload's user collection will mirror WorkOS user IDs in the CMS slice.
- **Permissions**: Payload's built-in access control functions, driven by the user's WorkOS role claim.
- **Media**: Payload media uploads → S3-compatible bucket (Cloudflare R2 — cheap, no egress fees).
- **Deploys**: Public site rebuilds on content publish via webhook → Netlify/Vercel.

## Admin UI — Screens (sketch)

```
┌── Sidebar ──────────────┐  ┌── Main ───────────────────────────┐
│ ▸ Dashboard             │  │                                   │
│ ▸ Content               │  │  [contextual to selection]        │
│   ├ Programs            │  │                                   │
│   ├ News & Events       │  │                                   │
│   ├ Team                │  │                                   │
│   ├ Donate page         │  │                                   │
│   └ Site settings       │  │                                   │
│ ▸ Media library         │  │                                   │
│ ▸ Users & roles         │  │                                   │
│ ▸ Audit log             │  │                                   │
│ ▸ My account            │  │                                   │
└─────────────────────────┘  └───────────────────────────────────┘
```

### Screens to design (priority order)

1. **Login** (handled by WorkOS AuthKit — minimal custom work).
2. **Dashboard** — "what's new since you last logged in," draft count, recent publishes, who's online.
3. **Content list view** (per collection) — table + filters + status pills (`Draft`, `In review`, `Published`).
4. **Content editor** — Payload's default editor (Lexical-based, rich text + structured fields). Live preview pane.
5. **Users list** — table: name, email, role, last login, status. Bulk invite, deactivate.
6. **User detail / invite drawer** — assign role, scope sections, send WorkOS invite.
7. **Role permissions matrix** — readable grid: rows = roles, cols = capabilities, cells = ✓/✗. Editable by SuperAdmin only.
8. **Audit log** — append-only feed: who did what, when, from where. Filterable.
9. **My account** — profile, password/passkey, MFA, sessions, API tokens.

### Exemplars to copy (verbatim where possible)

| Pattern | Steal from |
|---|---|
| Content editing UX | **Sanity Studio** |
| Permissions UI + field-level access | **Payload admin** |
| User & role management | **Linear settings → Members** |
| Invite flow + audit log | **Vercel team settings** |
| What to *avoid* | WordPress role/plugin sprawl |

## Security Requirements (non-negotiable)

- MFA required for `Admin` and `SuperAdmin` (enforced by WorkOS).
- All admin actions logged to immutable audit log.
- Session: short-lived JWTs + refresh tokens; rotate on privilege change.
- CSRF tokens on all state-changing requests.
- Content-Security-Policy headers on admin domain.
- Rate limiting on login + invite endpoints.
- Secrets in env vars only, never in repo. `.env.example` checked in.
- SQLite continuously replicated via litestream → R2; restore drill documented; 30-day retention.
- Principle of least privilege — Editors default to one section only.
- Public site and admin on separate subdomains, separate origins.
- Webhook signatures verified (Payload → Netlify/Vercel rebuild trigger).

## Implemented in This Pass

- `admin/package.json` — isolated admin service package.
- `admin/src/config.ts` — Zod-based environment parsing with fail-closed error messages that name missing fields without echoing secret values.
- `admin/src/server.ts` — Hono app with WorkOS AuthKit sign-in redirect.
- `admin/src/policy.ts` — starter RBAC contract: `super_admin`, `admin`, `editor`, `author`, `viewer`.
- `admin/.env.example` — required WorkOS/admin configuration keys.
- `admin/test/*.test.ts` — test-first coverage for sign-in redirect, env validation, and role permissions.

The current callback route intentionally stops at `202 Accepted` after verifying a code is present. The next vertical slice should exchange the code for a sealed WorkOS session cookie, then protect `/admin`.

## Open Questions

1. How many staff will use this? (drives WorkOS organization/member setup)
2. Does the board need the `viewer` role for reports, or should it be removed before launch?
3. Is there a donor/parent-facing portal in scope later, or is this purely staff-internal? (affects whether we should think about a customer auth track now)
4. Where will it be hosted? (Fly.io vs Railway vs Render vs Vercel functions)
5. Image/media volume — small (KBs of program photos) or large (event galleries, video)?
6. Workflow: do edits go through a review/approval step, or do Editors publish directly?

## Next Steps

1. Configure WorkOS dashboard:
   - Redirect URI: `https://admin.<domain>/auth/callback`
   - Sign-in endpoint: `https://admin.<domain>/auth/sign-in`
   - Local redirect URI: `http://127.0.0.1:3000/auth/callback`
   - Roles/permissions matching `admin/src/policy.ts`
2. Complete the AuthKit callback/session slice:
   - Exchange `code` with `authenticateWithCode`
   - Seal session with `WORKOS_COOKIE_PASSWORD`
   - Set secure `wos-session` cookie
   - Protect `/admin`
3. Add CSRF protection for logout and future state-changing admin routes.
4. Stand up Payload locally with SQLite (`@payloadcms/db-sqlite`) and wire access control to WorkOS role/permission claims.
5. Define the content model from the existing site data modules and pages.
6. Migrate one content section end-to-end as the first CMS vertical slice.
7. Add user-management UI, audit log ingestion, media storage, publish webhooks, and deployment.

## Recommendation Summary (TL;DR for Codex)

- **Auth**: WorkOS AuthKit
- **Permissions**: RBAC (5 roles) + section scoping; WorkOS FGA as future upgrade
- **Backend/CMS**: Payload CMS (self-hosted, **SQLite + litestream → R2**, Node)
- **Frontend**: keep Astro as static, fetch from Payload at build time
- **Hosting**: Single Fly.io machine with persistent volume for Payload+SQLite; Cloudflare R2 for media + litestream backups; Netlify/Vercel for public site
- **Security posture**: MFA required for admins, immutable audit log, least-privilege defaults, separate admin subdomain
