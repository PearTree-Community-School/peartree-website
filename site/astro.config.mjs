import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// Two build modes, both served from the site root:
// - default: GitHub Pages on the custom domain peartreecs.com (output to dist/)
// - SITE_SELF_HOSTED=1: the self-contained admin app serves the site at /
//   (output to dist-app/, edit overlay script included)
const selfHosted = process.env.SITE_SELF_HOSTED === '1';

export default defineConfig({
  integrations: [tailwind()],
  site: selfHosted
    ? (process.env.SITE_URL ?? 'http://127.0.0.1:3000')
    : 'https://peartreecs.com',
  base: '/',
  outDir: selfHosted ? './dist-app' : './dist',
});
