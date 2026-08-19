### 2026-08-18
- **Fixed `www.peartreecs.com`** — it had been throwing a full-page browser certificate warning. Root cause was *not* DNS, which is where it looks like it should be: the www CNAME was correct the whole time and plain HTTP already redirected fine. The actual fault was that GitHub's TLS certificate covered only the apex (`https_certificate.domains: ["peartreecs.com"]`), so HTTPS requests to www fell back to GitHub's `*.github.io` wildcard and failed hostname matching.
- Why it happened: the apex had **1 of the 4 required A records** (only `185.199.108.153`). GitHub auto-requests a cert covering apex + www, but only if DNS validates for both at request time. The domain was set 13 Aug 21:40 UTC and the cert minted 21:52 UTC — www didn't validate inside that window, so GitHub issued apex-only and marked it `approved`, which it never retries.
- Fix: added the three missing A records (`.109`, `.110`, `.111`) at GoDaddy. That alone was sufficient — opening the Pages settings triggered GitHub's DNS re-check, which passed, and GitHub reissued the certificate covering both hostnames automatically. **No downtime.** The remove/re-add of the custom domain that the docs suggest turned out to be unnecessary.
- Verified: cert SAN is now `DNS:peartreecs.com, DNS:www.peartreecs.com`; www returns 301 → apex with a valid cert; HTTPS enforcement still on.
- Ruled out along the way: CAA (apex has none; www's CAA resolves through the CNAME to github.io, which permits Let's Encrypt).
- **Images moved onto Astro's build pipeline** — the 9 images used by v1 moved from `public/` to `src/assets/` and now render through `<Image>`. Everything had been raw `<img>` in `public/`, which bypassed the optimizer entirely. Now WebP, responsive `srcset`, and intrinsic `width`/`height` on every image. **Homepage image payload: 2,332 KB → 401 KB on mobile (-83%), 528 KB on desktop (-77%).**
- Hero was the worst offender: `loading="lazy"` on the LCP element (now `eager` + `fetchpriority="high"`), and the photo was rendered at `opacity-30` under an 80–90% gradient — about 4% visible, which is why the hero read as a flat green block. Scrim is now weighted left so the headline keeps contrast and the photograph shows on the right.
- **SEO**: added `@astrojs/sitemap` (scoped to the 9 real pages, excludes v2/v3), `robots.txt`, canonical tags, `og:image`/`og:url`/`og:site_name` and Twitter card meta. Fixed the schema.org `url`, which pointed at `https://www.peartreecs.com` — i.e. crawlers were being sent to the broken hostname.
- **Accessibility**: skip-to-content link, `aria-expanded`/`aria-controls` + label toggle on the mobile menu, `role="status"`/`role="alert"` on contact form outcomes (success text is now injected rather than unhidden, so screen readers actually announce it).
- **Custom 404 page** (`custom_404` was false, so 404s hit GitHub's unbranded page with no way back).
- **Internal links now carry trailing slashes** — the build emits directory URLs, so every nav click was paying a 301. All 216 internal links verified to resolve with no redirect and no broken targets.
- Four-pillar cards unified onto the brand palette (the orange and blue were Tailwind defaults used nowhere else); sticky header `bg-white/95` → solid, which was letting content ghost through the top edge.

**Open items:**
- **Giving is still a `mailto:`.** The gold "Give" CTA, "Start Monthly Giving" and every tier all route to `admin@peartreecs.com`. No online donation path exists. Blocked on the school providing a processor — worth prioritising given `funding-strategy.md` makes fundraising the central problem.
- **Domain not verified** — `protected_domain_state` is `null` and there's no `_github-pages-challenge-*` TXT record. Leaves subdomain-takeover exposure open.
- **IPv6 missing** — the four AAAA records (`2606:50c0:800{0,1,2,3}::153`) were never added. Optional; nothing depends on them. Batch with the domain-verification TXT to save a GoDaddy 2FA round.
- **Preschool campus ZIP is blank** in `campusInfo.ts` and the footer. Not invented — needs confirming with the school.
- `/v2/` and `/v3/` remain live and indexable by explicit decision. The sitemap excludes them and v1 now has canonicals, but Google can still index all three.

### 2026-07-02
- **Pivoted to a self-contained app** (per Leon): one Node process serves the public site at `/`, the admin at `/admin`, and the API — ready to drop on any host once the school grants hosting access. Commit `e1f58e0`.
- **Click-to-edit**: signed-in editors browsing the site see dashed outlines + Edit buttons on every editable region (testimonials, FAQ, classrooms, stats, mission — 11 regions across all three variants). Clicking opens the exact admin form; saving returns to the page with the change already live.
- **Auto-rebuild**: content saves trigger a coalesced Astro rebuild (~1s); dashboard has a manual "Rebuild site" button + build status.
- **Local WorkOS bypass**: `ADMIN_DEV_BYPASS_EMAIL=<email> npm run dev` fakes that user's session for local testing — hard-guarded to loopback so it can't work on a real host.
- Verified end-to-end in Chrome: edit → save → back on page with change published.
- GitHub Pages build mode untouched (verified; only inert data attributes added). 92 tests passing (15 new).

**Deploy checklist for when hosting access arrives:** Node 20+ host with persistent disk → `npm ci` in site/ + admin/ → run admin with production `.env` (real domain in ADMIN_BASE_URL/WORKOS_REDIRECT_URI, no bypass var) → add redirect URI in WorkOS dashboard → point DNS.

### 2026-07-01
- **Content editing shipped in the Hono admin (`admin/`)** — the admin panel can now edit public-site content, completing the users + audit + content trio. Commit `c7fb183`.
- Six editable collections: Testimonials, Parent FAQ, Classrooms, Stats list (ordered lists) + School stats, Mission statement (singletons). Declarative schema (`content-schema.ts`) with Zod validation drives both forms and API.
- RBAC on content: viewers read, authors create drafts, editors/admins publish. Every create/update/delete/publish/reorder lands in the audit log.
- Idempotent seed from `site/src/data/*.ts` on server start — never overwrites admin edits (seeded 28 items into the live DB).
- Public JSON API `GET /api/content/:slug` (published content only, no auth) for the Astro build.
- Site wired to CMS: new `site/src/data/cms.ts` helpers with static fallback; 9 pages across v1/v2/v3 (parents, about, programs, admissions) now pull from the CMS when `ADMIN_API_URL` is set. **Verified: fallback build and CMS-backed build are byte-identical**, and a DB edit → rebuild round-trip showed the change on the page.
- Tests: 77 passing (29 new).

**Open items:**
- Port 3000 (the WorkOS redirect URI) was occupied by an unrelated TaxApp dev server during this session — admin verified on port 3010 instead. To sign in via WorkOS, free port 3000 and run `npm run dev` in `admin/`.
- `admin-next/` (Payload experiment) still has uncommitted leftovers; decide whether to delete the directory.
- CI/deploy hook: rebuild + publish the site when content changes (currently manual `ADMIN_API_URL=... npm run build`).

### 2026-05-14
- Shipped three new feature areas across all three variants — **27 total live pages now (was 18)**.
- **Tour scheduling (`/tour`, `/v2/tour`, `/v3/tour`)** — native, on-brand form that POSTs to the school's existing Google Form (`formResponse` endpoint) so admin's monitoring workflow stays the same. All 13 field entry IDs extracted from the live form. Date fields split into `_year/_month/_day` for Google Form compatibility. Client-side `fetch` with `mode: 'no-cors'`. Fallback link to the Google Form for users with JS disabled. **Needs a real test submission to confirm the integration works end-to-end** — submit a test from the live site and verify it lands in the Google Form response sheet.
- Swapped all "Schedule a Tour" CTAs (9 total) from `/contact` / `/admissions` to `/tour` / `/v2/tour` / `/v3/tour`.
- **Parent portal (`/parents`, `/v2/parents`, `/v3/parents`)** — quick-link card grid to ParentSquare (Calendar, Messages, Posts, Photos, Forms, Directory), "This Month's Alerts" data-driven section (admin edits `src/data/monthlyAlerts.ts` monthly), and a 12-Q FAQ accordion (`src/data/parentFAQ.ts`). No auth — links bounce to ParentSquare which handles its own login. School ID 22580 baked in.
- **Staff portal (`/staff`, `/v2/staff`, `/v3/staff`)** — work-request form themed per variant. 9 categories (Facilities, Supplies, Tech, Montessori Materials, Plants/Pets, Curriculum, HR, Room Booking, Other). Fields: name, email, location (dropdown of all 5 classrooms + office + outdoors), category, priority (Low/Medium/High/Urgent), description, needed-by, photo upload. Netlify Forms → `admin@peartreecs.com`. "Auth coming soon" banner up top.
- Nav: added Parents and Staff to all 3 variant navs.
- Six new data modules: `tourInfo`, `parentSquareLinks`, `parentFAQ`, `monthlyAlerts`, `staffRequestCategories`. Two new shared components: `TourForm.astro`, `StaffRequestForm.astro`.
- All 27 routes verified live (curl 200).

**Open items / pending user input:**
- Confirm what "Project OS" refers to so we can wire actual staff auth (defaulting to Clerk if no other answer).
- Confirm real ParentSquare URLs for Messages, Forms, Directory (placeholders currently).
- Michele/admin to review FAQ content and the monthly-alerts cadence.
- Smoke-test the tour form against the live Google Form's response sheet.

### 2026-05-07 (later)
- Fully built out V2 and V3 — every variant now has its own about, programs, admissions, contact, and support pages styled to that variant's design language. **18 pages total live (V1: 6, V2: 6, V3: 6).**
- V2 sub-pages: `LayoutB.astro`, neutral/amber editorial palette, full-bleed image heroes, large Playfair serif type, color-blocked pillar cards.
- V3 sub-pages: `LayoutC.astro`, slate/emerald institutional palette, Inter font, clean rounded-xl cards, emerald number badges, metric bars.
- Fixed nav: V2's nav links now stay in `/v2/`, V3's nav stays in `/v3/`. Previously they bounced visitors to V1's earthy pages and broke the design illusion.
- Extracted 12 shared content modules in `site/src/data/` so Michele's bio, school stats, MIRROR framework, classroom names, giving tiers, etc. live in ONE place and all three variants consume them. Editing once updates all three sites.
- All 18 routes verified live (curl 200) at https://peartree-community-school.github.io/peartree-website/

### 2026-05-07
- Pushed sites to GitHub Pages — published at https://peartree-community-school.github.io/peartree-website/
  - V1 (forest theme), V2 (`/v2/`), V3 (`/v3/`) all live
  - Repo transferred to PearTree-Community-School org (public — required for free org Pages)
  - GitHub Actions workflow builds and deploys on every push to main
- Fixed major link bug: 72 hardcoded `href="/about"` style paths across all .astro files were 404ing on the deployed site. Rewrote them all to use `import.meta.env.BASE_URL`. Set `base: '/peartree-website'` in astro.config.mjs.
- Extracted Michele's photo zip (21 photos) into `site/public/images/photos/` with web-safe names. Includes her headshot, MIRROR Framework infographic, classroom photos (DSC*, Dolphin classrooms), and demographic representation photos.
- Pulled Michele's full Medium article list (10 essays) into `site/src/data/medium-articles.ts` as structured data. Saved two full article texts to `site/src/data/article-archive.md`.
- Updated About page:
  - Michele's headshot in Founder section (was a generic teacher photo)
  - Full self-described titles + book + Medium author link
  - Updated quote to her actual signature Baldwin epigraph
  - Added MIRROR Framework infographic image above the 6-card breakdown
  - New "From Michele's Desk" section linking the 6 most recent Medium essays + CTA to her full archive

### 2026-05-06
- Saved context from Michele's emails to `michele-bio-and-photos.md`:
  - Founder bio copy for About/leadership page (titles, books, social links, Baldwin epigraph)
  - Google Drive link to `Website Photos.zip` (approved photo pack, includes MIRROR Framework image)
  - Pending: Michele still needs to add Asia Pacific Islander and SWANA images to the pack

### 2026-03-16
- Built 3 website design variants (Astro + Tailwind) with full sub-pages:
  - **V1 (main)**: Earthy/forest theme with Playfair Display serif + DM Sans
  - **V2**: Bold dark/amber editorial theme with Playfair Display + DM Sans
  - **V3**: Clean minimal slate/emerald theme with Inter
- Each version has: homepage, about, programs, admissions, contact, support pages
- Hosted all 3 via Cloudflare quick tunnels for review
- Emailed 3 design links to Cianan (subject: "Website Ideas") for feedback

### 2026-03-07
- Created comprehensive brand brief (`brand-brief.md`) by extracting content from peartreecs.com and ParentSquare
  - School profile: programs, classrooms, demographics, staff directory (20 people)
  - Deep research on founder Michele Hamilton: MIRROR framework, Seeds to Roots, KPFA interview, London Review of Education feature
  - Parent testimonials from Berkeley Parents Network
  - Current website assessment (strengths/weaknesses)
  - Strategic recommendations for new site architecture
  - Competitive positioning analysis
  - Fundraising history (GoFundMe underperformance)
- Ran 8 parallel research agents on funding strategy:
  1. Education grants for BIPOC schools (50+ foundations cataloged with amounts, deadlines, eligibility)
  2. Donation platforms and mechanisms (Donorbox, Givebutter, GiveCampus comparison; recurring giving; crowdfunding)
  3. Best school fundraising websites (15+ real schools analyzed: Park Day, Head-Royce, Uncommon, KIPP, TFA, DonorsChoose, Punahou)
  4. Government programs (CACFP ~$90K/yr, Measure C, BASIC Fund, Title I equitable services, Head Start)
  5. Development operations (NAIS/CASE benchmarks, annual fund strategy, major gifts, capital campaigns, endowment)
  6. Website fundraising design teardowns (saved to `fundraising-page-best-practices.md`)
  7. Fiscal sponsorship and 501(c)(3) path (LLC conversion steps, fiscal sponsor comparison, "Friends of" model)
  8. Bay Area education philanthropy landscape (local foundations, tech company giving, university partnerships)
- Synthesized all 8 agents into unified funding strategy (`funding-strategy.md`)
  - Phased approach: fiscal sponsorship (immediate) -> 501(c)(3) conversion (6-18 months)
  - Year 1 revenue projection: $180K-$365K beyond tuition
  - Year 3 revenue projection: $567K-$1.29M
  - #1 finding: LLC structure is the single biggest barrier to funding
  - Top priority: CACFP meal reimbursement ($90K/yr), Kenneth Rainin Foundation, Alameda County Measure C
- Project deliverables so far:
  - `brand-brief.md` — school profile, brand strategy, site architecture
  - `fundraising-page-best-practices.md` — website fundraising design research
  - `funding-strategy.md` — comprehensive funding playbook
- Next: Build the actual recruitment website
