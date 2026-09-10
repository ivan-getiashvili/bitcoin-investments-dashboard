/**
 * Collect the built files into _site/ — the folder both hosts publish.
 *
 * Run:  node scripts/assemble.ts   (or: npm run build:site, which runs it last)
 *
 * Kept as a script rather than shell `cp` so it behaves identically on your
 * Mac, on GitHub's Linux runners, and on Vercel's build image.
 */
import { copyFile, mkdir, writeFile } from 'node:fs/promises';

await mkdir('_site', { recursive: true });

// index.html is what a web server serves when someone visits the bare domain.
await copyFile('dist/dashboard.html', '_site/index.html');

// The fallback feed, for viewers who cannot reach Binance directly.
await copyFile('data/live.json', '_site/live.json');

// Tells GitHub Pages to serve the files as-is instead of running Jekyll over them.
await writeFile('_site/.nojekyll', '');

// Cloudflare Pages reads _headers from the output directory. The page bakes in
// data that changes once a day, so it must not sit in a CDN cache for longer
// than that — revalidate on every view, and let the CDN serve a stale copy
// briefly while it fetches a fresh one.
await writeFile(
  '_site/_headers',
  [
    '/',
    '  Cache-Control: public, max-age=0, must-revalidate',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '',
    '/live.json',
    '  Cache-Control: public, max-age=30',
    '',
  ].join('\n'),
);

console.log('Assembled _site/ — index.html, live.json, _headers');
