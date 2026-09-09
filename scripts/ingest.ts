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
import {
  enrich, cycleScore, scoreLabel,
  readMVRV, readZ, readMayer, readFunding,
} from '../lib/metrics.ts';

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
    parts: parts.map((p) => ({ label: p.label, value: round(p.value, 1) })),
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
  readings: {
    mvrv: readMVRV(now.mvrv),
    mvrvZ: readZ(now.mvrvZ),
    mayer: now.mayer ? readMayer(now.mayer) : null,
    funding: snap.fundingRate != null ? readFunding(snap.fundingRate) : null,
  },
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
