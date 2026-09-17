/**
 * Run the page once at build time, so the HTML that gets published already
 * contains every number it shows.
 *
 * Run:  node scripts/prerender.ts   (npm run build:site runs it after `build`)
 *
 * Why this exists. The page fills itself in with JavaScript: the cycle score,
 * the price, the five signals, the as-of date — all empty <div>s until a script
 * runs. A person's browser runs it. A search crawler, a link-preview bot, or an
 * AI assistant handed the URL mostly does not: it downloads the HTML, reads the
 * text, and leaves. Tested against the live site, such a reader came back with
 * the explanations and not one current value. For a page whose entire point is
 * the current values, that is a blank page.
 *
 * The fix is not a second renderer — two renderers drift. It is to execute the
 * page's own script here, in jsdom (a DOM implementation for Node), with the
 * network switched off, and publish the document it produced. What a machine
 * reads is then, by construction, what a person sees before the live tier
 * starts: the daily snapshot, labelled as a snapshot. In a browser the same
 * script runs again over the top and upgrades price and funding to live.
 *
 * Three more files fall out of the same run, all read out of the rendered page
 * rather than recomputed, so they cannot disagree with it:
 *   dist/summary.json  today's readings, structured
 *   dist/index.md      the whole page as Markdown — text, tables, caveats
 *   dist/llms.txt      the short brief for AI assistants (llmstxt.org format)
 */
import { readFile, writeFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';

const SITE = 'https://btcmetrics.online/';
const FILE = 'dist/dashboard.html';

const source = await readFile(FILE, 'utf8');

// The page's script is carried through byte-for-byte, never re-serialized.
const sOpen = source.lastIndexOf('<script>');
const sClose = source.lastIndexOf('</script>');
if (sOpen < 0 || sClose < sOpen) throw new Error(`${FILE} has no <script> block to run`);
const scriptBlock = source.slice(sOpen, sClose + '</script>'.length);

/* ---------- run the page ---------- */

const problems: string[] = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (e: Error) => problems.push(e.stack ?? e.message));
virtualConsole.on('error', (...a: unknown[]) => problems.push(a.map(String).join(' ')));

const dom = new JSDOM(
  `<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body>${source}</body></html>`,
  {
    url: SITE,
    runScripts: 'dangerously',          // it is our own template, run on purpose
    virtualConsole,
    beforeParse(window) {
      // No network. The snapshot must be the baked data and nothing else, and a
      // build must never depend on an exchange answering.
      (window as any).fetch = () => Promise.reject(new Error('network is off during prerender'));
    },
  },
);

// Let the rejected fetches run their handlers before the DOM is read.
await new Promise((r) => setTimeout(r, 150));

const { window } = dom;
const { document } = window;

if (problems.length) {
  console.error('The page script failed while prerendering:\n' + problems.join('\n'));
  process.exit(1);
}

/* ---------- read the day's numbers out of the running page ---------- */

const summary = JSON.parse(window.eval(`(() => {
  const d = derive();
  const rank = percentileOf(d.score);
  const last = k => { const a = (S[k] || []).filter(v => v != null); return a.length ? a[a.length - 1] : null; };
  const bp = d.funding == null ? null : Math.round(d.funding * 1e6) / 100;
  return JSON.stringify({
    site: '${SITE}',
    generatedAt: DATA.generatedAt,
    onChainDataAsOf: DATA.asOf,
    basis: 'Build-time snapshot. Price is the daily close (UTC) of onChainDataAsOf; in a browser the page ' +
           'then updates price, funding and open interest live. On-chain metrics are published once a day.',
    cyclePosition: {
      percentile: rank,
      label: scoreLabel(d.score),
      meaning: 'Rank of today\\'s raw average within its own history, 0-100. Below 20 deep value, 20-40 ' +
               'accumulation, 40-60 mid-cycle, 60-80 heating up, above 80 overheated.',
      rawAverage: Math.round(d.score * 10) / 10,
      signalsAveraged: d.parts.length,
      historyDays: DATA.cycle.historyDays,
    },
    price: {
      usd: d.price,
      change24h: d.change24h,
      allTimeHighUsd: d.ath,
      drawdownFromAllTimeHigh: Math.round(d.drawdown * 10000) / 10000,
    },
    signals: d.parts.map(p => ({
      key: p.key, label: p.label, reading: Math.round(p.raw * 1000) / 1000, unit: p.unit ?? null,
      points: Math.round(p.value * 10) / 10, verdict: levelLabel(p.value),
      scoresZeroAt: p.lo, scoresHundredAt: p.hi,
    })),
    valuation: {
      mvrv: Math.round(d.mvrv * 1000) / 1000,
      mvrvZScore: Math.round(d.mvrvZ * 100) / 100,
      realizedPriceUsd: Math.round(d.realizedPrice),
      mayerMultiple: d.mayer == null ? null : Math.round(d.mayer * 1000) / 1000,
      ma50Usd: last('ma50'), ma200dUsd: last('ma200d'), ma200wUsd: last('ma200w'),
    },
    sentiment: {
      fearGreedIndex: L.fearGreed ? L.fearGreed.value : last('fearGreed'),
      fearGreedLabel: L.fearGreed ? L.fearGreed.label : null,
      fearGreed30DayAverage: last('fearGreedMa30'),
    },
    leverage: {
      venue: venue.now,
      fundingRateBpPer8h: bp,
      fundingAnnualisedPct: bp == null ? null : Math.round(annualise(bp) * 10) / 10,
      openInterestUsd: d.oi == null ? null : Math.round(d.oi),
      fundingHistoryVenue: venue.history,
    },
    network: {
      hashRateEhPerSec: last('hashRate'),
      hashRate30DayMean: last('hashRate30'),
      hashRate60DayMean: last('hashRate60'),
      hashRibbonSpreadPct: last('hashRibbon'),
      coinsOnExchangesPctOfSupply: last('exchangePct'),
    },
    sources: DATA.sources,
    disclaimer: 'Information only, not investment advice. Heuristics drawn from four Bitcoin cycles.',
  });
})()`));

/* ---------- the published HTML ---------- */

// Stands in for the page script while the markup around it is rewritten.
const SCRIPT_SLOT = '<!--prerender:script-->';

// Charts are geometry for a screen: tens of kilobytes of path data that says
// nothing to a text reader, and the browser redraws them at the real container
// width anyway. Everything beside them — readouts, legends, tables — stays.
for (const id of ['c-price', 'c-mvrv', 'c-fng', 'c-lev', 'c-net']) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`chart mount #${id} is missing from the template`);
  el.innerHTML = '';
}

let html = document.body.innerHTML;
const rOpen = html.lastIndexOf('<script>');
const rClose = html.lastIndexOf('</script>');
html = html.slice(0, rOpen) + SCRIPT_SLOT + html.slice(rClose + '</script>'.length);

// Serializing turns &mdash; back into a literal character. Put every non-ASCII
// character back as a numeric entity, so the file still reads correctly on a
// host that serves it without a charset (the Artifact mirror has done that).
// <style> is raw text where entities are not decoded, so it is left alone.
html = html
  .split(/(<style[\s\S]*?<\/style>)/)
  .map((chunk, i) => (i % 2 ? chunk : chunk.replace(/[^\x00-\x7F]/gu, (c) => `&#${c.codePointAt(0)};`)))
  .join('')
  .replace(SCRIPT_SLOT, () => scriptBlock);

await writeFile(FILE, html.trim() + '\n');

/* ---------- the page as Markdown ---------- */

const SKIP = new Set(['SCRIPT', 'STYLE', 'SVG', 'svg', 'BUTTON', 'NOSCRIPT', 'LINK', 'TITLE']);
const SKIP_CLASS = ['controls', 'legend', 'rail-track', 'pill', 'seg', 'ranges'];
const clean = (s: string) => s.replace(/\s+/g, ' ');

function inline(node: any): string {
  if (node.nodeType === 3) return clean(node.textContent ?? '');
  if (node.nodeType !== 1 || SKIP.has(node.tagName)) return '';
  if (SKIP_CLASS.some((c) => node.classList.contains(c))) return '';
  const kids = () => [...node.childNodes].map(inline).join('');
  switch (node.tagName) {
    case 'B': case 'STRONG': { const t = kids().trim(); return t ? `**${t}**` : ''; }
    case 'I': case 'EM': { const t = kids().trim(); return t ? `*${t}*` : ''; }
    case 'CODE': return '`' + kids().trim() + '`';
    case 'A': return `[${kids().trim()}](${node.getAttribute('href')})`;
    case 'BR': return ' ';
    case 'HR': return ' — ';
    case 'SPAN':
      if (node.classList.contains('cap')) return ` **${kids().trim()}:** `;
      if (node.classList.contains('big')) return `**${kids().trim()}** `;
      return kids();
    default: return kids();
  }
}
const para = (node: any) => clean(inline(node)).replace(/ +([.,;:])/g, '$1').trim();

function table(node: any): string {
  const rows = [...node.querySelectorAll('tr')].map((tr: any) =>
    [...tr.children].map((c: any) => para(c).replace(/\|/g, '\\|') || ' '));
  if (!rows.length) return '';
  const width = Math.max(...rows.map((r) => r.length));
  const out: string[] = [];
  const cap = node.querySelector('caption');
  if (cap) out.push(para(cap), '');
  rows.forEach((r, i) => {
    while (r.length < width) r.push(' ');
    out.push(`| ${r.join(' | ')} |`);
    if (i === 0) out.push(`|${' --- |'.repeat(width)}`);
  });
  return out.join('\n');
}

const BLOCK = new Set(['DIV', 'SECTION', 'P', 'UL', 'OL', 'TABLE', 'H1', 'H2', 'H3', 'DETAILS', 'ASIDE', 'FOOTER', 'MAIN']);

function block(node: any, out: string[]): void {
  if (node.nodeType !== 1 || SKIP.has(node.tagName)) return;
  if (SKIP_CLASS.some((c) => node.classList.contains(c))) return;
  const cl = node.classList;
  const push = (s: string) => { if (s.trim()) out.push(s.trim()); };

  if (node.tagName === 'H1') return push(`# ${para(node)}`);
  if (node.tagName === 'H2') return push(`## ${para(node)}`);
  if (node.tagName === 'H3') return push(`### ${para(node)}`);
  if (node.tagName === 'TABLE') return push(table(node));
  if (node.tagName === 'UL' || node.tagName === 'OL') {
    return push([...node.children].map((li: any) => `- ${para(li)}`).join('\n'));
  }
  if (node.tagName === 'DETAILS') {
    const t = node.querySelector('table');
    return t ? push(table(t)) : undefined;
  }
  if (cl.contains('board')) {
    const rows = [...node.querySelectorAll('.board-row')].map((r: any) => {
      const s = [...r.children].map((c: any) => para(c));
      return `| ${s[0]} | ${s[1]} | ${s[3]} | ${s[4]} |`;
    });
    return push(['| Signal | Reading today | Points (0-100) | Its own verdict |', '| --- | --- | --- | --- |', ...rows].join('\n'));
  }
  if (cl.contains('score-block') || cl.contains('price-block')) {
    const [label, ...rest] = [...node.children].map((c: any) => para(c)).filter(Boolean);
    return push(`**${label}:** ${rest.join(' — ')}`);
  }
  if (cl.contains('rail-scale')) {
    return push('Scale, low to high: ' + [...node.children].map((c: any) => para(c)).join(' → '));
  }
  if (cl.contains('readout')) {
    return push('Latest on the chart: ' + [...node.children].map((c: any) => para(c)).filter(Boolean).join(' · '));
  }
  const hasBlockChild = [...node.children].some((c: any) => BLOCK.has(c.tagName));
  if (hasBlockChild) { for (const c of node.children) block(c, out); return; }
  push(para(node));
}

const mdParts: string[] = [];
block(document.querySelector('main'), mdParts);

const stamp = summary.generatedAt.slice(0, 16).replace('T', ' ') + ' UTC';
const preface =
  `> Plain-text edition of ${SITE} — the same page, generated from the same data in the same build, ` +
  `for readers that do not render JavaScript. Snapshot built ${stamp}; on-chain data as of ` +
  `${summary.onChainDataAsOf}. Price here is that day's close (UTC). In a browser the page also updates ` +
  `price, funding and open interest live; this file does not. Structured version: ${SITE}summary.json`;
const h1 = mdParts.findIndex((l) => l.startsWith('# '));
if (h1 < 0) throw new Error('the page has no <h1>; the Markdown edition would have no title');
mdParts.unshift(...mdParts.splice(h1, 1), preface);   // title first, then what this file is
await writeFile('dist/index.md', mdParts.join('\n\n') + '\n');

/* ---------- llms.txt: the short brief ---------- */

const s = summary;
const usd = (v: number | null) => (v == null ? 'n/a' : '$' + Math.round(v).toLocaleString('en-US'));
const pct = (v: number | null, dp = 1) => (v == null ? 'n/a' : (v >= 0 ? '+' : '') + (v * 100).toFixed(dp) + '%');
const num = (v: number | null, dp = 2) => (v == null ? 'n/a' : v.toFixed(dp));
const ord = (n: number) => {
  const t = n % 100;
  return n + (t >= 11 && t <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
};
const unit = (p: any) => (p.unit === 'bp' ? ' bp' : p.unit === 'pct' ? '%' : '');

const llms = `# BTC Metrics

> A Bitcoin cycle-position dashboard. Five independent signals — price against its 200-day trend (Mayer Multiple), MVRV Z-score, the Fear & Greed index, perpetual funding, and miner commitment (hashrate 30-day vs 60-day mean) — are each rescaled to 0-100 points, averaged without weights, and the average is ranked against every day of Bitcoin history since 2011. Every metric is charted, explained in plain language, and published with its sources and its limits. Information only, not investment advice.

Snapshot built ${stamp}. On-chain data as of ${s.onChainDataAsOf} (the vendor publishes once a day). Prices below are that day's close, UTC. The web page also updates price, funding and open interest live in the browser; files do not. When quoting a figure, quote its date.

## Current readings

- Cycle position: **${ord(s.cyclePosition.percentile)} percentile — ${s.cyclePosition.label}**. Raw average ${s.cyclePosition.rawAverage} of ${s.cyclePosition.signalsAveraged} signals, ranked against ${s.cyclePosition.historyDays.toLocaleString('en-US')} days of history. Labels: below 20 deep value, 20-40 accumulation, 40-60 mid-cycle, 60-80 heating up, above 80 overheated.
- Bitcoin price: ${usd(s.price.usd)} (${pct(s.price.change24h)} on the day); all-time high ${usd(s.price.allTimeHighUsd)}, drawdown ${pct(s.price.drawdownFromAllTimeHigh)}.
${s.signals.map((p: any) => `- Signal — ${p.label}: ${num(p.reading, p.unit === 'index' ? 0 : 2)}${unit(p)} → ${p.points.toFixed(0)} points, "${p.verdict}" (0 points at ${p.scoresZeroAt}, 100 points at ${p.scoresHundredAt}).`).join('\n')}
- Valuation: MVRV ${num(s.valuation.mvrv)}, MVRV Z-score ${num(s.valuation.mvrvZScore)}, realized price ${usd(s.valuation.realizedPriceUsd)}, Mayer Multiple ${num(s.valuation.mayerMultiple)}; 50-day MA ${usd(s.valuation.ma50Usd)}, 200-day MA ${usd(s.valuation.ma200dUsd)}, 200-week MA ${usd(s.valuation.ma200wUsd)}.
- Sentiment: Fear & Greed ${s.sentiment.fearGreedIndex ?? 'n/a'}${s.sentiment.fearGreedLabel ? ` (${s.sentiment.fearGreedLabel})` : ''}; 30-day average ${num(s.sentiment.fearGreed30DayAverage, 0)}.
- Leverage${s.leverage.venue ? ` (${s.leverage.venue} BTC perpetual)` : ''}: funding ${num(s.leverage.fundingRateBpPer8h)} bp per 8 hours, about ${num(s.leverage.fundingAnnualisedPct, 0)}% a year; open interest ${s.leverage.openInterestUsd == null ? 'n/a' : '$' + (s.leverage.openInterestUsd / 1e9).toFixed(2) + 'B'}.
- Network: hashrate ${num(s.network.hashRateEhPerSec, 0)} EH/s; 30-day mean ${num(s.network.hashRate30DayMean, 0)} vs 60-day mean ${num(s.network.hashRate60DayMean, 0)} EH/s (spread ${num(s.network.hashRibbonSpreadPct)}%); coins on exchanges ${num(s.network.coinsOnExchangesPctOfSupply)}% of supply (context only, not in the score).

## Read more

- [The dashboard](${SITE}): all five blocks with interactive charts. Every current value is present in the HTML itself; no JavaScript is needed to read it.
- [The whole page as Markdown](${SITE}index.md): every reading, explanation and caveat, plus each chart as a table (month-ends for the last year, year-ends back to 2011).
- [Today's readings as JSON](${SITE}summary.json): the figures above, structured.
- [Source code](https://github.com/ivan-getiashvili/bitcoin-investments-dashboard): how every number is fetched and derived.

## Things worth knowing before quoting it

- The headline is a percentile rank, not the raw average. Averaging signals that rarely peak together compresses the result toward the middle, so the raw average never exceeded about 67 even at the 2013, 2017 and 2021 tops; ranked against its own history those tops land in the 90th percentile.
- It is descriptive, not predictive, and rests on four market cycles.
- Two of the five signals (MVRV Z-score, Mayer Multiple) are correlated at about 0.8; the page says so.
- On-chain data comes from the Coin Metrics community API under CC BY-NC (non-commercial).
`;
await writeFile('dist/llms.txt', llms);
await writeFile('dist/summary.json', JSON.stringify(summary, null, 2) + '\n');

window.close();   // the page sets a polling interval; without this Node never exits

console.log(
  `Prerendered ${FILE} (${(html.length / 1024).toFixed(0)} KB) — ` +
  `${ord(s.cyclePosition.percentile)} percentile, ${s.cyclePosition.label}, ${usd(s.price.usd)}, ` +
  `${s.signals.length} signals, funding via ${s.leverage.venue ?? 'nobody'}`,
);
console.log(`  wrote dist/index.md (${(mdParts.join('\n\n').length / 1024).toFixed(0)} KB), dist/llms.txt, dist/summary.json`);
