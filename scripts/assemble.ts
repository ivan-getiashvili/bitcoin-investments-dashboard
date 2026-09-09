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

console.log('Assembled _site/ — index.html, live.json');
