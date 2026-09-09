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
import { enrich, cycleScore, scoreLabel, marketCapSd, BANDS } from '../lib/metrics.ts';

const round = (v: number | null, dp = 2) =>
  v == null || !Number.isFinite(v) ? null : Number(v.toFixed(dp));

console.log('Fetching Coin Metrics daily history…');
const rows = enrich(await fetchDailyRows());
console.log(`  ${rows.length} days, ${rows[0].date} → ${rows.at(-1)!.date}`);

console.log('Fetching market snapshot…');
const snap = await fetchSnapshot();

const now = rows.at(-1)!;
const prev = rows.at(-2)!;
const back = (days: number) => rows[Math.max(0, rows.length - 1 - days)];
const ret = (days: number) => now.price / back(days).price - 1;

const { score, parts } = cycleScore(now, snap);

const payload = {
  generatedAt: new Date().toISOString(),
  asOf: now.date,
  cycle: {
    score: round(score, 1),
    label: scoreLabel(score),
    parts: parts.map((p) => ({ key: p.key, label: p.label, value: round(p.value, 1), lo: p.lo, hi: p.hi })),
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
    realizedPrice: rows.map((r) => round(r.realizedPrice)),
    ma200w: rows.map((r) => round(r.ma200w)),
  },
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
