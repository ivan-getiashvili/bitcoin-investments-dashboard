/**
 * Collect the built files into _site/ — the folder the host publishes.
 *
 * Run:  node scripts/assemble.ts   (or: npm run build:site, which runs it last)
 *
 * This is also where the page becomes a real HTML document. page/template.html
 * is written as body content with no <head>, because that is what the Artifact
 * platform wants. Served standalone that is a serious bug rather than a nicety:
 * with no viewport meta, phones assume a ~980px layout and scale the whole page
 * down, so every control and label renders far too small to use. The head built
 * here supplies the viewport, the language, and the social metadata that decides
 * whether a shared link shows a preview or a bare URL.
 */
import { copyFile, mkdir, readFile, writeFile, readdir } from 'node:fs/promises';

const SITE = 'https://btcmetrics.online/';
const TITLE = 'BTC Metrics — where Bitcoin sits in its own cycle';
const DESC =
  'Five independent signals — MVRV, price against trend, sentiment, funding and miner ' +
  'commitment — ranked against fifteen years of Bitcoin history. Every metric explained, ' +
  'with its sources and its limits.';

await mkdir('_site/assets', { recursive: true });

let content = await readFile('dist/dashboard.html', 'utf8');

// Hoist the title and the font link out of the body: both belong in the head,
// and a duplicate <title> in the body is ignored by browsers but confuses
// scrapers, which is exactly the audience the metadata is for.
const titleMatch = content.match(/<title>(.*?)<\/title>\s*/s);
if (titleMatch) content = content.replace(titleMatch[0], '');
const fontMatch = content.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>\s*/);
const fontLink = fontMatch ? fontMatch[0].trim() : '';
if (fontMatch) content = content.replace(fontMatch[0], '');

const head = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${TITLE}</title>
<meta name="description" content="${DESC}">
<link rel="canonical" href="${SITE}">
<meta name="theme-color" content="#0f1319" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#f6f4ef" media="(prefers-color-scheme: light)">
<meta name="color-scheme" content="light dark">

<meta property="og:type" content="website">
<meta property="og:site_name" content="BTC Metrics">
<meta property="og:url" content="${SITE}">
<meta property="og:title" content="${TITLE}">
<meta property="og:description" content="${DESC}">
<meta property="og:image" content="${SITE}assets/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="BTC Metrics — a five-segment sentiment dial beside the site name">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${TITLE}">
<meta name="twitter:description" content="${DESC}">
<meta name="twitter:image" content="${SITE}assets/og-image.png">

<link rel="icon" href="assets/favicon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="assets/icon-512.png" sizes="512x512" type="image/png">
<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
${fontLink}
</head>
<body>
`;

await writeFile('_site/index.html', head + content + '\n</body>\n</html>\n');

// static assets
for (const f of await readdir('page/assets')) {
  await copyFile(`page/assets/${f}`, `_site/assets/${f}`);
}

// the fallback feed, for viewers who cannot reach Binance directly
await copyFile('data/live.json', '_site/live.json');

// tells GitHub Pages to serve files as-is instead of running Jekyll over them
await writeFile('_site/.nojekyll', '');

// Cloudflare reads _headers from the output directory. The page bakes in data
// that changes once a day, so it must revalidate rather than sit in a CDN cache.
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
    '/assets/*',
    '  Cache-Control: public, max-age=604800',
    '',
  ].join('\n'),
);

const bytes = (await readFile('_site/index.html')).length;
console.log(`Assembled _site/ — index.html (${(bytes / 1024).toFixed(0)} KB), assets, live.json, _headers`);
