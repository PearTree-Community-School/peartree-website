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
