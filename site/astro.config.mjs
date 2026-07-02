import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// Two build modes:
// - default: GitHub Pages (base /peartree-website, output to dist/)
// - SITE_SELF_HOSTED=1: the self-contained admin app serves the site at /
//   (base /, output to dist-app/, edit overlay script included)
const selfHosted = process.env.SITE_SELF_HOSTED === '1';

export default defineConfig({
  integrations: [tailwind()],
  site: selfHosted
    ? (process.env.SITE_URL ?? 'http://127.0.0.1:3000')
    : 'https://peartree-community-school.github.io',
  base: selfHosted ? '/' : '/peartree-website',
  outDir: selfHosted ? './dist-app' : './dist',
});
