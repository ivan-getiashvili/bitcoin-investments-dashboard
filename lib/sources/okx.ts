/**
 * OKX public API — the derivatives source a build server can actually reach.
 *
 * Probed from a GitHub runner (see .github/workflows/diagnose-sources.yml):
 * Binance futures answer HTTP 451 to cloud IP ranges, Bybit 403; OKX, Deribit,
 * BitMEX and Kraken answer 200. OKX's BTC-USDT-SWAP is the closest analogue to
 * Binance's BTCUSDT perpetual — USDT-margined, linear, 8-hour funding — and
 * over 276 shared settlements the two differed by 0.26 bp on average (max 0.95).
 *
 * So this is the build-time fallback. It exists so that the page's static HTML —
 * the only thing an AI fetcher, a crawler or a no-JavaScript reader ever sees —
 * carries all five signals rather than four. A visitor's browser still upgrades
 * to Binance live, and every figure is labelled with its venue.
 *
 * OKX retains roughly three months of funding history, 100 rows per page.
 */
import { getJson, type Point } from './types.ts';

const BASE = 'https://www.okx.com/api/v5/public';
const INST = 'BTC-USDT-SWAP';

/** Most recent settled funding rate, as a raw rate (not basis points). */
export async function fetchOkxFundingLatest(): Promise<number> {
  const json = await getJson(`${BASE}/funding-rate-history?instId=${INST}&limit=1`);
  const row = json.data?.[0];
  const v = Number(row?.realizedRate || row?.fundingRate);
  if (!Number.isFinite(v)) throw new Error('OKX returned no funding rate');
  return v;
}

/** Daily mean funding in basis points, as far back as OKX keeps it (~92 days). */
export async function fetchOkxFundingHistory(): Promise<Point[]> {
  const rows: any[] = [];
  let after = '';
  for (let page = 0; page < 14; page++) {
    const json = await getJson(
      `${BASE}/funding-rate-history?instId=${INST}&limit=100${after ? `&after=${after}` : ''}`,
    );
    const batch = json.data ?? [];
    if (!batch.length) break;
    rows.push(...batch);
    after = batch[batch.length - 1].fundingTime;
  }
  const byDate = new Map<string, number[]>();
  for (const r of rows) {
    const date = new Date(Number(r.fundingTime)).toISOString().slice(0, 10);
    const v = Number(r.realizedRate || r.fundingRate) * 10_000;
    if (!Number.isFinite(v)) continue;
    (byDate.get(date) ?? byDate.set(date, []).get(date)!).push(v);
  }
  return [...byDate.entries()]
    .map(([date, vs]) => ({ date, value: vs.reduce((a, b) => a + b, 0) / vs.length }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Notional open interest in USD on the same instrument. */
export async function fetchOkxOpenInterestUsd(): Promise<number> {
  const json = await getJson(`${BASE}/open-interest?instType=SWAP&instId=${INST}`);
  const v = Number(json.data?.[0]?.oiUsd);
  if (!Number.isFinite(v)) throw new Error('OKX returned no open interest');
  return v;
}
