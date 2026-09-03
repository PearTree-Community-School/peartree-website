# Pear Tree Community School — improved site

Changes from the September 2026 site review, applied to the production site.
Same stack (Astro 5 + Tailwind 3), same content, same URLs.

## What changed

**Performance**
- Lora and Inter are self-hosted via `@fontsource` (imported in `src/layouts/Layout.astro`).
  Removes the render-blocking Google Fonts request that cost ~900 ms on mobile.
- The 15 MB `public/images` folder is gone. The eight photos now used on interior page
  headers live in `src/assets/images/heroes/` and go through Astro's image pipeline.
- `public/og-image.jpg` is a 1200×630 social card (was a 470 KB full-size JPEG).
- The first photo below the fold on Home and Programs loads eagerly so it never appears as a beige box.

**Accessibility**
- `earth-600` darkened to `#835a34` so body copy passes 4.5:1 on cream, forest-50 and pear-50.
- Small copy that used `earth-500`/`earth-400` on light backgrounds now uses `earth-700`.
- Tier amounts use `pear-800`; the Give button uses charcoal text on gold (6.4:1 instead of 2.2:1).
- Footer headings are `h3`, tour page headings are `h2`: no skipped levels.
- Visible `:focus-visible` ring on every link, button and form control.
- Mobile menu closes on Escape (returning focus to the button) and on a tap outside the header.
- Phone and email links on the tour page meet the 44 px touch-target size (`.tap-link`).

**Functional**
- Support page: every giving tier and amount is a link. `src/data/donation.ts` holds
  `DONATION_URL`; paste a Zeffy / Givebutter / Stripe Payment Link there and the buttons
  carry amount and frequency into it. Until then they open a pre-filled email.
  `FISCAL_SPONSOR` fills in the tax-deductibility note once the sponsor confirms wording.
- Privacy-friendly analytics (Plausible, no cookies, no consent banner) in `src/data/site.ts`.
  Register `peartreecs.com` at plausible.io to start collecting; set `domain: ''` to remove.
- Founder photo on About uses a 4:5 crop anchored to the top, so the head is no longer clipped.
- Footer copyright reads "Pear Tree Community School" (singular).
- Schema.org markup now includes `logo`, `image` and `sameAs`.

**Visual**
- New `src/components/PageHero.astro`: every interior page has a photograph with the same
  left-weighted scrim as the homepage, instead of a flat green block.
- Tour page: the request card is first and full-width; the two info cards sit side by side beneath it.

**Removed**
- `/v2/` and `/v3/` design prototypes (were live, indexable and duplicated the content).
- `TourForm.astro` and `StaffRequestForm.astro` (unused since the pages link to Google Forms).

## Hosting note

`public/_headers` sets security headers and a one-year cache for hashed assets. GitHub Pages
ignores this file; Cloudflare Pages and Netlify read it. Everything else works on GitHub Pages as before.

## Run

```
npm install
npm run dev      # http://localhost:4321
npm run build && npm run preview
```
