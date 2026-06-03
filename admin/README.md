# PearTree Admin

WorkOS AuthKit-backed admin service for Pear Tree Community School.

## What Exists

- Node + Hono TypeScript service.
- WorkOS AuthKit sign-in redirect at `/auth/sign-in`.
- WorkOS callback exchanges the authorization code for a sealed session cookie
  (`pt_admin_session`, HttpOnly, SameSite=Lax, 8-hour TTL).
- **SQLite users table** (better-sqlite3, WAL mode, auto-created at startup) with
  unique `workos_user_id` + `email`, role CHECK constraint, and login-tracking.
- **Bootstrap on first sign-in**: if the users table is empty and the signed-in
  email is in `ADMIN_BOOTSTRAP_EMAILS`, the user is auto-created as `super_admin`.
  After that the DB is the source of truth — env list is ignored.
- Gated `/admin` page renders signed-in user + role from the DB; redirects to
  sign-in if no session, returns 403 if user is not in DB or is disabled.
- `POST /auth/sign-out` clears the cookie and redirects to the public site.
- Fail-closed environment validation.
- Starter RBAC policy for `super_admin`, `admin`, `editor`, `author`, `viewer`.

Next slice: mount Payload CMS at `/cms` behind the same session, first content
collection (News & Events), Astro public site fetches at build time.

## Local Setup

```sh
npm install
cp .env.example .env
npm run validate:env
npm run dev
```

Required WorkOS dashboard settings:

- Sign-in endpoint: `http://127.0.0.1:3000/auth/sign-in`
- Redirect URI: `http://127.0.0.1:3000/auth/callback`
- Production sign-in endpoint: `https://admin.<domain>/auth/sign-in`
- Production redirect URI: `https://admin.<domain>/auth/callback`

## Verification

```sh
npm test -- --run
npm run build
```

Manual sign-in redirect check:

```sh
curl -i http://127.0.0.1:3000/auth/sign-in
```
