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
 *
 * It also publishes the files that software looks for before it reads a page —
 * robots.txt, sitemap.xml, llms.txt — and a real 404. Before this, the host's
 * single-page fallback answered every one of those URLs with the 740 KB
 * dashboard and a 200 status: a crawler asking for robots.txt received a web
 * page, and a misspelt URL looked like a second copy of the home page.
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

// Written by scripts/prerender.ts out of the rendered page, so the metadata
// below quotes the same figures the page shows.
const summary = JSON.parse(await readFile('dist/summary.json', 'utf8'));
const ord = (n: number) => {
  const t = n % 100;
  return n + (t >= 11 && t <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
};
const usd = (v: number) => '$' + Math.round(v).toLocaleString('en-US');
const READING =
  `As of ${summary.onChainDataAsOf}: ${ord(summary.cyclePosition.percentile)} percentile of its own ` +
  `history (${summary.cyclePosition.label.toLowerCase()}), Bitcoin ${usd(summary.price.usd)}.`;

/** schema.org description of the page and of the figures on it, for search
 *  engines and assistants that read structured data before prose. */
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', '@id': `${SITE}#site`, url: SITE, name: 'BTC Metrics', description: DESC, inLanguage: 'en' },
    {
      '@type': 'WebPage', '@id': `${SITE}#page`, url: SITE, name: TITLE, description: `${DESC} ${READING}`,
      isPartOf: { '@id': `${SITE}#site` }, inLanguage: 'en', dateModified: summary.generatedAt,
      about: { '@type': 'Thing', name: 'Bitcoin', sameAs: 'https://en.wikipedia.org/wiki/Bitcoin' },
      mainEntity: { '@id': `${SITE}#dataset` },
    },
    {
      '@type': 'Dataset', '@id': `${SITE}#dataset`, url: SITE,
      name: 'BTC Metrics: Bitcoin cycle position and its five component signals',
      description:
        'Daily Bitcoin cycle-position reading: five signals (Mayer Multiple, MVRV Z-score, Fear & Greed, ' +
        'perpetual funding rate, miner commitment) each rescaled to 0-100 points, averaged, and ranked ' +
        'against every day since 2011. ' + READING,
      dateModified: summary.generatedAt,
      temporalCoverage: `2011-01-01/${summary.onChainDataAsOf}`,
      isAccessibleForFree: true,
      creator: { '@type': 'Organization', name: 'BTC Metrics', url: SITE },
      distribution: [
        { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${SITE}summary.json` },
        { '@type': 'DataDownload', encodingFormat: 'text/markdown', contentUrl: `${SITE}index.md` },
      ],
      variableMeasured: [
        { '@type': 'PropertyValue', name: 'Cycle position (percentile of history)', value: summary.cyclePosition.percentile, minValue: 0, maxValue: 100, description: summary.cyclePosition.label },
        { '@type': 'PropertyValue', name: 'Bitcoin price, daily close', value: summary.price.usd, unitText: 'USD' },
        ...summary.signals.map((p: any) => ({
          '@type': 'PropertyValue', name: p.label, value: p.reading,
          ...(p.unit === 'bp' ? { unitText: 'basis points per 8 hours' } : p.unit === 'pct' ? { unitText: 'percent' } : {}),
          description: `${Math.round(p.points)} of 100 points: ${p.verdict}`,
        })),
      ],
    },
  ],
};
// `</script>` inside the JSON would end the tag early.
const jsonLdTag = `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/<\//g, '<\\/')}</script>`;

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
<meta name="description" content="${DESC} ${READING}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<link rel="canonical" href="${SITE}">
<link rel="alternate" type="text/markdown" href="${SITE}index.md" title="This page as plain text">
<link rel="alternate" type="application/json" href="${SITE}summary.json" title="Today's readings as JSON">
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
${jsonLdTag}
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

/* ---------- for software: crawlers, link unfurlers, AI assistants ---------- */

// The page again as text, and as data. llms-full.txt is the conventional name
// for "the whole site in one Markdown file"; here that is the same document.
await copyFile('dist/index.md', '_site/index.md');
await copyFile('dist/index.md', '_site/llms-full.txt');
await copyFile('dist/llms.txt', '_site/llms.txt');
await copyFile('dist/summary.json', '_site/summary.json');

// Everything is public and meant to be read. Naming the AI agents adds nothing
// a wildcard does not already grant; it is there so that nobody — a person
// auditing the site, or an agent deciding whether it is welcome — has to infer it.
const AI_AGENTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot',
  'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended',
  'Amazonbot', 'meta-externalagent', 'DuckAssistBot', 'MistralAI-User', 'cohere-ai', 'CCBot', 'Bytespider',
];
await writeFile(
  '_site/robots.txt',
  [
    '# BTC Metrics. Everything here is public and meant to be read, by people and by software.',
    'User-agent: *',
    'Allow: /',
    '',
    '# AI assistants and AI search crawlers are explicitly welcome.',
    `# A short brief written for them: ${SITE}llms.txt`,
    ...AI_AGENTS.map((a) => `User-agent: ${a}`),
    'Allow: /',
    '',
    `Sitemap: ${SITE}sitemap.xml`,
    '',
  ].join('\n'),
);

await writeFile(
  '_site/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}</loc><lastmod>${summary.generatedAt}</lastmod><changefreq>daily</changefreq></url>
</urlset>
`,
);

// A real 404. wrangler.jsonc sets not_found_handling to "404-page", so an
// unknown URL gets this file with a 404 status instead of the dashboard with 200.
await writeFile(
  '_site/404.html',
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found — BTC Metrics</title>
<meta name="robots" content="noindex">
<link rel="icon" href="/assets/favicon-32.png" sizes="32x32" type="image/png">
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px;
         font: 15px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; background: #f6f4ef; color: #161b22; }
  main { max-width: 46ch; }
  h1 { font-size: 22px; margin: 0 0 8px; }
  a { color: inherit; }
  @media (prefers-color-scheme: dark) { body { background: #0f1319; color: #e8e6e1; } }
</style>
</head>
<body>
<main>
  <h1>There is no page at this address.</h1>
  <p>BTC Metrics is a single page. Everything it publishes is at
     <a href="${SITE}">btcmetrics.online</a>, with a plain-text edition at
     <a href="${SITE}index.md">/index.md</a> and today's readings at
     <a href="${SITE}summary.json">/summary.json</a>.</p>
</main>
</body>
</html>
`,
);

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
    // Text editions: say what they are, let any tool fetch them from a browser
    // context, and point search engines at the page they are an edition of.
    ...['/index.md', '/llms-full.txt', '/llms.txt', '/summary.json'].flatMap((path) => [
      path,
      `  Content-Type: ${path.endsWith('.json') ? 'application/json' : path.endsWith('.md') || path === '/llms-full.txt' ? 'text/markdown' : 'text/plain'}; charset=utf-8`,
      '  Cache-Control: public, max-age=0, must-revalidate',
      '  Access-Control-Allow-Origin: *',
      `  Link: <${SITE}>; rel="canonical"`,
      '',
    ]),
    '/assets/*',
    '  Cache-Control: public, max-age=604800',
    '',
  ].join('\n'),
);

const bytes = (await readFile('_site/index.html')).length;
console.log(
  `Assembled _site/ — index.html (${(bytes / 1024).toFixed(0)} KB), assets, live.json, _headers, ` +
  'robots.txt, sitemap.xml, llms.txt, llms-full.txt, index.md, summary.json, 404.html',
);
