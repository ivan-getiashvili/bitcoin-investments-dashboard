/**
 * Fetch every source once, compute derived metrics, write data/btc.json.
 *
 * Run:  node scripts/ingest.ts
 *
 * This is the step that makes the dashboard hostable. Instead of every visitor
 * downloading 13 years of history from Coin Metrics, we download it here, once,
 * and ship a small precomputed file.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { fetchDailyRows } from '../lib/sources/coinmetrics.ts';
import { fetchSnapshot } from '../lib/sources/market.ts';
import { fetchFearGreedHistory } from '../lib/sources/feargreed.ts';
import { fetchFundingHistory, fetchOpenInterestHistory } from '../lib/sources/binance.ts';
import { enrich, cycleScore, scoreLabel, marketCapSd, ramp, SCORE_BOUNDS, BANDS } from '../lib/metrics.ts';

const round = (v: number | null, dp = 2) =>
  v == null || !Number.isFinite(v) ? null : Number(v.toFixed(dp));

/**
 * Source health, recorded rather than assumed.
 *
 * Three bugs this project has already shipped had one root: a source the build
 * machine cannot reach returns nothing, the build succeeds anyway, and the site
 * degrades silently while working perfectly on a laptop. Binance genuinely does
 * block CI and CDN IP ranges, so a blanket "fail on any error" would break every
 * deploy. The distinction that matters is required versus optional.
 */
const sourceStatus: Record<string, string> = {};

console.log('Fetching Coin Metrics daily history…');
const rows = enrich(await fetchDailyRows().catch((err) => {
  console.error(`\nFATAL: Coin Metrics is unreachable — ${(err as Error).message}`);
  console.error('Every on-chain metric comes from it, so a page built now would be empty.');
  console.error('Refusing to publish over a working site.\n');
  process.exit(1);
}));
sourceStatus.coinMetrics = 'ok';

// A successful fetch that returns too little is the same failure wearing a
// disguise: the page would render, look fine, and be wrong.
if (rows.length < 5000) {
  console.error(`\nFATAL: Coin Metrics returned only ${rows.length} days; expected 5,000+.`);
  console.error('That is a truncated response, not a short history. Refusing to publish.\n');
  process.exit(1);
}
console.log(`  ${rows.length} days, ${rows[0].date} → ${rows.at(-1)!.date}`);

console.log('Fetching market snapshot…');
const snap = await fetchSnapshot();

// Sentiment history starts 2018-02-01, well after the price series, so it is
// keyed by date and aligned onto the shared axis with nulls before that. Never
// index-align two series that begin on different days.
console.log('Fetching Fear & Greed history…');
const fngByDate = new Map<string, number>();
try {
  for (const p of await fetchFearGreedHistory()) fngByDate.set(p.date, p.value);
  console.log(`  ${fngByDate.size} days of sentiment`);
  sourceStatus.fearGreed = 'ok';
} catch (err) {
  console.warn(`  ! Fear & Greed history failed: ${(err as Error).message} — chart will be omitted`);
  sourceStatus.fearGreed = 'unreachable';
}

const now = rows.at(-1)!;
const prev = rows.at(-2)!;
const back = (days: number) => rows[Math.max(0, rows.length - 1 - days)];
const ret = (days: number) => now.price / back(days).price - 1;

const { score, parts } = cycleScore(now, snap);

// Derivatives history. Funding paginates back years; open interest does not
// exist beyond ~30 days at this source, which the page states rather than hides.
console.log('Fetching derivatives history…');
const fundingByDate = new Map<string, number>();
const oiByDate = new Map<string, number>();
try {
  for (const pt of await fetchFundingHistory(900)) fundingByDate.set(pt.date, pt.value);
  console.log(`  ${fundingByDate.size} days of funding`);
  sourceStatus.binance = 'ok';
} catch (err) {
  // Expected on CI and CDN builders, which Binance blocks by IP. Not fatal:
  // the page fetches this itself from the visitor's browser.
  console.warn(`  ! Binance unreachable from this machine (${(err as Error).message.slice(0, 60)})`);
  console.warn('    Expected on build servers; the browser fetches funding directly.');
  sourceStatus.binance = 'blocked-from-builder';
}
try {
  for (const pt of await fetchOpenInterestHistory()) oiByDate.set(pt.date, pt.value);
  console.log(`  ${oiByDate.size} days of open interest (source retains ~30)`);
} catch (err) {
  console.warn(`  ! open interest history failed: ${(err as Error).message}`);
}

const fngSeries = rows.map((r) => fngByDate.get(r.date) ?? null);
const fundingSeries = rows.map((r) => {
  const v = fundingByDate.get(r.date);
  return v == null ? null : round(v, 3);
});

/** Hashrate in exahash, and the 30/60-day means that form the hash ribbons. */
const hashEh = rows.map((r) => (r.hashRate == null ? null : r.hashRate / 1e6));
const meanOf = (arr: (number | null)[], w: number) => arr.map((_, i) => {
  const s = arr.slice(Math.max(0, i - w + 1), i + 1).filter((v): v is number => v != null);
  return s.length >= Math.ceil(w * 0.8) ? round(s.reduce((a, b) => a + b, 0) / s.length, 1) : null;
});

/** Exchange-held supply as a share of circulating supply — the interpretable form. */
const exchangePct = rows.map((r) =>
  r.exchangeSupply == null ? null : round((r.exchangeSupply / r.supply) * 100, 2));

/**
 * The same score, computed for every day in history, so today's reading can be
 * placed in its own distribution.
 *
 * This matters more than it sounds. Averaging signals that rarely peak together
 * pulls the mean toward the middle: backtested, this score read 66.7 at the 2013
 * top, 66.7 at the 2017 top and 63.4 at the 2021 top, and never once reached the
 * fixed "overheated" band above 80. Meanwhile 74% of all days fell in the two
 * lowest bands. Fixed cutoffs on this number are simply miscalibrated, so the
 * page labels by percentile of history instead.
 *
 * Honest limitation, stated on the page: the early years had fewer components to
 * average (Fear & Greed begins 2018, funding 2023), so a 2013 score and a 2026
 * score are not built from identical evidence.
 */
const B = SCORE_BOUNDS;
const historicalScores: number[] = [];
for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const vals: number[] = [];
  if (r.mayer != null) vals.push(ramp(r.mayer, ...B.mayer));
  if (r.mvrvZ != null) vals.push(ramp(r.mvrvZ, ...B.mvrvZ));
  const fg = fngByDate.get(r.date);
  if (fg != null) vals.push(ramp(fg, ...B.fearGreed));
  const fr = fundingByDate.get(r.date);
  if (fr != null) vals.push(ramp(fr, ...B.funding));
  if (r.hashRibbon != null) vals.push(ramp(r.hashRibbon, ...B.hashRibbon));
  if (vals.length >= 2) historicalScores.push(vals.reduce((a, b) => a + b, 0) / vals.length);
}
historicalScores.sort((a, b) => a - b);

/** 101 ascending breakpoints: index i is the i-th percentile. */
const distribution = Array.from({ length: 101 }, (_, k) =>
  round(historicalScores[Math.min(historicalScores.length - 1, Math.floor((k / 100) * historicalScores.length))], 2));

const percentileOf = (v: number) => {
  let p = 0;
  for (let k = 0; k < distribution.length; k++) if (v >= (distribution[k] ?? 0)) p = k;
  return p;
};

const payload = {
  generatedAt: new Date().toISOString(),
  asOf: now.date,
  cycle: {
    score: round(score, 1),
    percentile: percentileOf(score),
    /** Ascending percentile breakpoints of the score's own history. */
    distribution,
    historyDays: historicalScores.length,
    // From the percentile, not the raw score — the page labels by rank, and a
    // payload whose own label disagreed with the page would be a trap for
    // anyone reading btc.json directly.
    label: (p => p < 20 ? 'Deep value' : p < 40 ? 'Accumulation' : p < 60 ? 'Mid-cycle'
            : p < 80 ? 'Heating up' : 'Overheated')(percentileOf(score)),
    parts: parts.map((p) => ({ key: p.key, label: p.label, raw: round(p.raw, 3), value: round(p.value, 1), lo: p.lo, hi: p.hi, unit: p.unit })),
  },
  latest: {
    price: round(now.price),
    change24h: round(now.price / prev.price - 1, 4),
    mvrv: round(now.mvrv, 3),
    mvrvZ: round(now.mvrvZ, 2),
    realizedPrice: round(now.realizedPrice),
    mayer: round(now.mayer, 3),
    ma200w: round(now.ma200w),
    ma200d: round(now.ma200d),
    ath: round(now.ath),
    drawdown: round(now.drawdown, 4),
    returns: { d7: round(ret(7), 4), d30: round(ret(30), 4), d365: round(ret(365), 4) },
    exchangeSupply: round(now.exchangeSupply, 0),
    activeAddresses: round(now.activeAddresses, 0),
    fearGreed: snap.fearGreed,
    fundingRate: snap.fundingRate,
    openInterestUsd: snap.openInterestUsd,
    hashRateEh: round(snap.hashRateEh, 1),
    difficulty: snap.difficulty,
  },
  /**
   * Slow-moving quantities the browser needs to recompute the fast-moving
   * metrics from a live price. Realized cap changes by a fraction of a percent
   * a day (it only moves when coins actually transact), and the moving
   * averages are 200- and 1400-day windows, so holding them fixed intraday and
   * scaling market cap by the live price gives an honest intraday estimate.
   */
  anchors: {
    marketCap: now.marketCap,
    realizedCap: now.realizedCap,
    capSd: marketCapSd(rows),
    supply: now.supply,
    ma200d: now.ma200d,
    ma200w: now.ma200w,
    priceAtClose: now.price,
  },
  // Bands travel with the data so the browser re-reads them against a live
  // price. JSON has no Infinity, so the catch-all becomes null downstream —
  // the page treats a null upper edge as "no ceiling".
  bands: JSON.parse(JSON.stringify(BANDS, (_k, v) => (v === Infinity ? null : v))),
  series: {
    date: rows.map((r) => r.date),
    price: rows.map((r) => round(r.price)),
    mvrv: rows.map((r) => round(r.mvrv, 3)),
    mvrvZ: rows.map((r) => round(r.mvrvZ, 3)),
    fearGreed: fngSeries,
    funding: fundingSeries,
    openInterest: rows.map((r) => {
      const v = oiByDate.get(r.date);
      return v == null ? null : round(v, 0);
    }),
    hashRate: hashEh.map((v) => round(v, 1)),
    hashRate30: meanOf(hashEh, 30),
    hashRate60: meanOf(hashEh, 60),
    hashRate200: meanOf(hashEh, 200),
    hashRibbon: rows.map((r) => round(r.hashRibbon, 2)),
    exchangePct,
    // The raw index swings several points a day; the 30-day mean is what makes
    // the regime readable. Computed here rather than in the browser so the page
    // stays a renderer.
    //
    // Tolerate a few missing days rather than demanding all 30. The publisher
    // skipped 2018-04-14..16 and 2024-10-26, and requiring a complete window
    // turned each of those into a month-long hole in the average: a data gap of
    // one day became a visible gap of thirty. Averaging 26 of 30 days is a
    // faithful mean; refusing to average at all is not.
    fearGreedMa30: fngSeries.map((_, i) => {
      if (fngSeries[i] == null) return null;   // no reading today, no average today
      const w = fngSeries.slice(Math.max(0, i - 29), i + 1).filter((v): v is number => v != null);
      return w.length >= 25 ? round(w.reduce((a, b) => a + b, 0) / w.length, 1) : null;
    }),
    realizedPrice: rows.map((r) => round(r.realizedPrice)),
    ma50: rows.map((r) => round(r.ma50)),
    ma200d: rows.map((r) => round(r.ma200d)),
    ma200w: rows.map((r) => round(r.ma200w)),
  },
  sourceStatus,
  sources: [
    { name: 'Coin Metrics community API', license: 'CC BY-NC — non-commercial' },
    { name: 'Binance public futures API', license: 'public market data' },
    { name: 'alternative.me', license: 'free' },
    { name: 'mempool.space', license: 'free' },
  ],
};

await mkdir('data', { recursive: true });
await writeFile('data/btc.json', JSON.stringify(payload));

const kb = (JSON.stringify(payload).length / 1024).toFixed(0);
console.log(`\nWrote data/btc.json (${kb} KB)`);
console.log(`  as of ${payload.asOf}  ·  $${payload.latest.price?.toLocaleString('en-US')}`);
console.log(`  MVRV ${payload.latest.mvrv}  ·  cycle score ${payload.cycle.score} (${payload.cycle.label})`);
console.log('  sources: ' + Object.entries(sourceStatus).map(([k, v]) => `${k}=${v}`).join('  '));
