/**
 * Read _site/ the way a machine does — no JavaScript, no CSS, just the bytes —
 * and fail the build if it could not answer "what does this site say today?".
 *
 * Run:  node scripts/verify-site.ts   (npm run build:site runs it last)
 *
 * This is the regression test for a bug that was invisible from a browser. The
 * page looked perfect to every person who opened it and was blank to every
 * crawler and AI assistant, because the numbers only existed after a script
 * ran. Nothing a human does while checking the site would ever catch that
 * again, so the build checks it instead, on every deploy.
 *
 * It checks structure and agreement, never wording: the headline can be
 * rewritten freely, but an empty score, a fourth copy of the price that
 * disagrees with the other three, or a robots.txt that is secretly an HTML
 * page all stop the deploy.
 */
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const failures: string[] = [];
const check = (ok: unknown, message: string) => { if (!ok) failures.push(message); };
const read = (f: string) => readFile(`_site/${f}`, 'utf8').catch(() => '');

const html = await read('index.html');
check(html.length > 100_000, `index.html is ${html.length} bytes — the data did not bake in`);
check(html.includes('const DATA = {'), 'index.html has no data blob for the charts');

// Parsed, not executed: jsdom runs no scripts unless asked to.
const { document } = new JSDOM(html).window;
const text = (id: string) => (document.getElementById(id)?.textContent ?? '').replace(/\s+/g, ' ').trim();

/* ---------- every reading is in the HTML itself ---------- */

const score = text('score');
check(/^\d{1,3}$/.test(score) && Number(score) <= 100, `#score should be a 0-100 rank without JavaScript, got "${score}"`);
check(['Deep value', 'Accumulation', 'Mid-cycle', 'Heating up', 'Overheated'].includes(text('scoreLabel')),
  `#scoreLabel is "${text('scoreLabel')}"`);
check(/^\$\d/.test(text('price')), `#price is "${text('price')}"`);
check(/\d{4}-\d{2}-\d{2}/.test(text('asof')), `#asof carries no date: "${text('asof')}"`);
check(/\d{4}-\d{2}-\d{2}/.test(text('chg')), '#chg does not say which day the static price belongs to');

const rows = [...document.querySelectorAll('#signal-board .board-row')];
check(rows.length >= 4, `the signal board has ${rows.length} rows without JavaScript; expected 4 or 5`);
check(rows.every((r) => [...r.children].filter((c) => c.textContent!.trim()).length >= 4),
  'a signal row is missing its reading, points or verdict');

for (const id of ['scoreSub', 'verdict-line', 'divergence', 'score-calc', 'calc-note', 'ro-price', 'price-src',
  'ro-mvrv', 'mvrv-src', 'fng-now', 'fng-src', 'lev-now', 'lev-src', 'net-now', 'net-src', 'net-exch-context', 'srcs']) {
  check(text(id).length > 10, `#${id} is empty without JavaScript`);
}
for (const id of ['tb-price', 'tb-mvrv', 'tb-fng', 'tb-lev', 'tb-net']) {
  const n = document.querySelectorAll(`#${id} tbody tr`).length;
  check(n >= 3, `#${id}: the chart-as-table has ${n} rows`);
}

// Explainers must be reachable by a reader that ignores CSS. The `hidden`
// attribute is the one thing such readers do honour, so it must not be on them.
const panels = [...document.querySelectorAll('.info-panel')];
check(panels.length >= 6, `expected 6 explainer panels, found ${panels.length}`);
check(panels.every((p) => !p.hasAttribute('hidden')), 'an explainer panel carries the hidden attribute; text extractors will drop it');
check(panels.every((p) => (p.textContent ?? '').length > 400), 'an explainer panel is nearly empty');

/* ---------- the head ---------- */

check(document.documentElement.getAttribute('lang') === 'en', '<html> has no lang');
check(document.querySelector('meta[name="viewport"]'), 'no viewport meta');
check((document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '').length > 80, 'meta description missing or thin');
check(document.querySelector('link[rel="canonical"]'), 'no canonical link');
check(!/noindex/i.test(document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? ''), 'the page is marked noindex');
check(document.querySelectorAll('h1').length === 1, `expected exactly one <h1>, found ${document.querySelectorAll('h1').length}`);
check(document.querySelector('main'), 'no <main> landmark');

let ld: any = null;
try { ld = JSON.parse(document.querySelector('script[type="application/ld+json"]')?.textContent ?? ''); } catch { /* reported below */ }
check(ld?.['@graph']?.some((n: any) => n['@type'] === 'Dataset'), 'JSON-LD is missing or does not parse');

/* ---------- the files software asks for ---------- */

const robots = await read('robots.txt');
check(/^User-agent: \*$/m.test(robots) && /^Sitemap: https:\/\//m.test(robots), 'robots.txt is missing, or has no wildcard group or sitemap line');
check(!/^Disallow: \/\s*$/m.test(robots), 'robots.txt disallows the whole site');
check(!/<html/i.test(robots), 'robots.txt is an HTML page');

const sitemap = await read('sitemap.xml');
check(sitemap.startsWith('<?xml') && sitemap.includes('<loc>https://'), 'sitemap.xml is missing or malformed');

const notFound = await read('404.html');
check(notFound.includes('noindex') && notFound.length < 5000, '404.html is missing, indexable, or suspiciously large');

const llms = await read('llms.txt');
const md = await read('index.md');
check(llms.startsWith('# ') && llms.includes('## Current readings'), 'llms.txt is missing or not in the expected shape');
check(md.startsWith('# ') && md.length > 15_000, `index.md is ${md.length} characters — the Markdown edition is incomplete`);
check((await read('llms-full.txt')) === md, 'llms-full.txt differs from index.md');

/* ---------- and they all tell the same story ---------- */

let summary: any = null;
try { summary = JSON.parse(await read('summary.json')); } catch { /* reported below */ }
check(summary, 'summary.json is missing or does not parse');
if (summary) {
  const price = '$' + Math.round(summary.price.usd).toLocaleString('en-US');
  check(String(summary.cyclePosition.percentile) === score, `summary.json says rank ${summary.cyclePosition.percentile}, the page says ${score}`);
  check(summary.cyclePosition.label === text('scoreLabel'), 'summary.json and the page disagree on the label');
  check(text('price') === price, `summary.json price ${price} is not the page's ${text('price')}`);
  check(summary.signals.length === rows.length, `summary.json lists ${summary.signals.length} signals, the page shows ${rows.length}`);
  check(llms.includes(price) && md.includes(price), 'llms.txt or index.md does not carry the same price as the page');
  check(llms.includes(summary.onChainDataAsOf) && md.includes(summary.onChainDataAsOf), 'a text edition does not state its as-of date');
  check(summary.signals.every((p: any) => md.includes(p.label)), 'index.md is missing one of the signals');
}

if (failures.length) {
  console.error(`\n_site/ is not readable without JavaScript — ${failures.length} problem(s):`);
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log(
  `Verified _site/ as a machine reads it: rank ${score} (${text('scoreLabel')}), ${text('price')}, ` +
  `${rows.length} signals, ${panels.length} explainers, 5 chart tables, robots/sitemap/llms/summary/404 consistent.`,
);
