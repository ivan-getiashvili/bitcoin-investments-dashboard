/**
 * Derived metrics &mdash; computed once at ingest, never in the browser.
 *
 * The one piece of arithmetic worth knowing: realized cap is paywalled at every
 * vendor, but MVRV is defined as marketCap / realizedCap, so rearranging gives
 * it away for free:
 *     realizedCap   = marketCap / mvrv
 *     realizedPrice = realizedCap / supply
 */
import type { DailyRow, Snapshot } from './sources/types.ts';

export type EnrichedRow = DailyRow & {
  realizedCap: number;
  realizedPrice: number;
  ma200d: number | null;
  ma200w: number | null;
  mayer: number | null;
  mvrvZ: number;
  ath: number;
  drawdown: number;
};

/** Simple moving average; null until `window` samples exist. */
export function movingAverage(values: number[], window: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= window) sum -= values[i - window];
    if (i >= window - 1) out[i] = sum / window;
  }
  return out;
}

export function enrich(rows: DailyRow[]): EnrichedRow[] {
  const prices = rows.map((r) => r.price);
  const ma200d = movingAverage(prices, 200);
  const ma200w = movingAverage(prices, 1400); // 200 weeks ≈ 1400 days

  // MVRV Z-score measures the gap between market cap and realized cap in
  // standard deviations of market cap's own history.
  const caps = rows.map((r) => r.marketCap);
  const mean = caps.reduce((a, b) => a + b, 0) / caps.length;
  const sd = Math.sqrt(caps.reduce((a, c) => a + (c - mean) ** 2, 0) / caps.length);

  let ath = 0;
  return rows.map((r, i) => {
    const realizedCap = r.marketCap / r.mvrv;
    ath = Math.max(ath, r.price);
    return {
      ...r,
      realizedCap,
      realizedPrice: realizedCap / r.supply,
      ma200d: ma200d[i],
      ma200w: ma200w[i],
      mayer: ma200d[i] ? r.price / ma200d[i]! : null,
      mvrvZ: (r.marketCap - realizedCap) / sd,
      ath,
      drawdown: r.price / ath - 1,
    };
  });
}

/* ------------------------------------------------------------------------ */
/* Interpretation &mdash; the layer that turns numbers into a product              */
/* ------------------------------------------------------------------------ */

export type Reading = { note: string; temp: 'cold' | 'cool' | 'neutral' | 'warm' | 'hot' };

export function readMVRV(v: number): Reading {
  if (v < 1.0) return { note: 'Below the network&rsquo;s cost basis &mdash; the average holder is underwater. Historically bottom territory.', temp: 'cold' };
  if (v < 1.5) return { note: 'Accumulation zone. Modest unrealized profit across the network.', temp: 'cool' };
  if (v < 2.4) return { note: 'Mid-cycle. Real profit held, well short of historical froth.', temp: 'neutral' };
  if (v < 3.7) return { note: 'Elevated &mdash; late-cycle territory in previous bull markets.', temp: 'warm' };
  return { note: 'Historically frothy. Past readings above 3.7 clustered near cycle tops.', temp: 'hot' };
}

export function readZ(v: number): Reading {
  if (v < 0) return { note: 'Negative &mdash; market cap sits below realized cap. Deep value historically.', temp: 'cold' };
  if (v < 2) return { note: 'Low. Considerable headroom before cycle-top readings.', temp: 'cool' };
  if (v < 5) return { note: 'Mid-range.', temp: 'neutral' };
  if (v < 7) return { note: 'Elevated &mdash; approaching the zone that preceded past tops.', temp: 'warm' };
  return { note: 'Extreme. Prior readings above 7 marked cycle peaks.', temp: 'hot' };
}

export function readMayer(v: number): Reading {
  if (v < 0.8) return { note: 'Far below the 200-day average &mdash; historically rare.', temp: 'cold' };
  if (v < 1.0) return { note: 'Trading below its 200-day average.', temp: 'cool' };
  if (v < 1.5) return { note: 'Normal range above the 200-day average.', temp: 'neutral' };
  if (v < 2.4) return { note: 'Extended above trend.', temp: 'warm' };
  return { note: 'Very extended &mdash; 2.4&times; the 200-day average is a classic overheat marker.', temp: 'hot' };
}

export function readFunding(v: number): Reading {
  const bp = v * 10_000;
  if (bp < -1) return { note: 'Negative &mdash; shorts are paying longs. Crowded bearish positioning.', temp: 'cold' };
  if (bp < 1) return { note: 'Flat. Leverage is not leaning hard either way.', temp: 'neutral' };
  if (bp < 5) return { note: 'Mildly positive &mdash; longs paying to hold. Normal in an uptrend.', temp: 'neutral' };
  return { note: 'Longs paying up heavily. Crowded, and prone to violent unwinds.', temp: 'hot' };
}

/**
 * Composite cycle score, 0 (frozen) to 100 (overheated).
 *
 * Deliberately simple and legible: each component is mapped onto 0–100 by a
 * linear ramp between historically meaningful bounds, then averaged over
 * whichever components are available. It is a heuristic, not a prediction, and
 * the page says so.
 */
export function cycleScore(row: EnrichedRow, snap: Snapshot): { score: number; parts: { label: string; value: number }[] } {
  const ramp = (v: number, lo: number, hi: number) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));

  const parts: { label: string; value: number }[] = [
    { label: 'MVRV Z-score', value: ramp(row.mvrvZ, 0, 7) },
    { label: 'MVRV', value: ramp(row.mvrv, 0.8, 3.7) },
  ];
  if (row.mayer != null) parts.push({ label: 'Mayer Multiple', value: ramp(row.mayer, 0.7, 2.4) });
  if (row.ma200w != null) parts.push({ label: 'Price vs 200w MA', value: ramp(row.price / row.ma200w, 1, 5) });
  if (snap.fearGreed) parts.push({ label: 'Fear & Greed', value: snap.fearGreed.value });

  const score = parts.reduce((a, p) => a + p.value, 0) / parts.length;
  return { score, parts };
}

export function scoreLabel(score: number): string {
  if (score < 20) return 'Deep value';
  if (score < 40) return 'Accumulation';
  if (score < 60) return 'Mid-cycle';
  if (score < 80) return 'Heating up';
  return 'Overheated';
}
