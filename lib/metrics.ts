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
  ma50: number | null;
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

/**
 * Standard deviation of market cap over the full history — the denominator of
 * the MVRV Z-score. Exported so the browser can recompute Z from a live price
 * without shipping the whole history.
 */
export function marketCapSd(rows: DailyRow[]): number {
  const caps = rows.map((r) => r.marketCap);
  const mean = caps.reduce((a, b) => a + b, 0) / caps.length;
  return Math.sqrt(caps.reduce((a, c) => a + (c - mean) ** 2, 0) / caps.length);
}

export function enrich(rows: DailyRow[]): EnrichedRow[] {
  const prices = rows.map((r) => r.price);
  const ma50 = movingAverage(prices, 50);
  const ma200d = movingAverage(prices, 200);
  const ma200w = movingAverage(prices, 1400); // 200 weeks &asymp; 1400 days

  // MVRV Z-score measures the gap between market cap and realized cap in
  // standard deviations of market cap's own history.
  const sd = marketCapSd(rows);

  let ath = 0;
  return rows.map((r, i) => {
    const realizedCap = r.marketCap / r.mvrv;
    ath = Math.max(ath, r.price);
    return {
      ...r,
      realizedCap,
      realizedPrice: realizedCap / r.supply,
      ma50: ma50[i],
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

export type Temp = 'cold' | 'cool' | 'neutral' | 'warm' | 'hot';
export type Band = { below: number; temp: Temp; note: string };
export type Reading = { note: string; temp: Temp };

/**
 * Interpretation bands as DATA, not code.
 *
 * They ship to the browser inside data/btc.json so the page can re-read a band
 * when a live price moves a metric across a threshold. If these lived only as
 * server-side `if` statements, a live MVRV of 2.5 could sit under a note that
 * still said "mid-cycle" — the number and the sentence would contradict each
 * other. One source of truth, evaluated in both places.
 *
 * `below: Infinity` is the catch-all top band.
 */
export const BANDS = {
  mvrv: [
    { below: 1.0, temp: 'cold', note: 'Below the network&rsquo;s cost basis &mdash; the average holder is underwater. Historically bottom territory.' },
    { below: 1.5, temp: 'cool', note: 'Accumulation zone. Modest unrealized profit across the network.' },
    { below: 2.4, temp: 'neutral', note: 'Mid-cycle. Real profit held, well short of historical froth.' },
    { below: 3.7, temp: 'warm', note: 'Elevated &mdash; late-cycle territory in previous bull markets.' },
    { below: Infinity, temp: 'hot', note: 'Historically frothy. Past readings above 3.7 clustered near cycle tops.' },
  ],
  mvrvZ: [
    { below: 0, temp: 'cold', note: 'Negative &mdash; market cap sits below realized cap. Deep value historically.' },
    { below: 2, temp: 'cool', note: 'Low. Considerable headroom before cycle-top readings.' },
    { below: 5, temp: 'neutral', note: 'Mid-range.' },
    { below: 7, temp: 'warm', note: 'Elevated &mdash; approaching the zone that preceded past tops.' },
    { below: Infinity, temp: 'hot', note: 'Extreme. Prior readings above 7 marked cycle peaks.' },
  ],
  mayer: [
    { below: 0.8, temp: 'cold', note: 'Far below the 200-day average &mdash; historically rare.' },
    { below: 1.0, temp: 'cool', note: 'Trading below its 200-day average.' },
    { below: 1.5, temp: 'neutral', note: 'Normal range above the 200-day average.' },
    { below: 2.4, temp: 'warm', note: 'Extended above trend.' },
    { below: Infinity, temp: 'hot', note: 'Very extended &mdash; 2.4&times; the 200-day average is a classic overheat marker.' },
  ],
  /** Funding bands are in basis points, not the raw rate. */
  fundingBp: [
    { below: -1, temp: 'cold', note: 'Negative &mdash; shorts are paying longs. Crowded bearish positioning.' },
    { below: 1, temp: 'neutral', note: 'Flat. Leverage is not leaning hard either way.' },
    { below: 5, temp: 'neutral', note: 'Mildly positive &mdash; longs paying to hold. Normal in an uptrend.' },
    { below: Infinity, temp: 'hot', note: 'Longs paying up heavily. Crowded, and prone to violent unwinds.' },
  ],
} satisfies Record<string, Band[]>;

export function readBand(bands: Band[], v: number): Reading {
  const b = bands.find((x) => v < x.below) ?? bands[bands.length - 1];
  return { note: b.note, temp: b.temp };
}

/**
 * Composite cycle score, 0 (frozen) to 100 (overheated).
 *
 * Deliberately simple and legible: each component is mapped onto 0–100 by a
 * linear ramp between historically meaningful bounds, then averaged over
 * whichever components are available. It is a heuristic, not a prediction, and
 * the page says so.
 */
export type ScorePart = {
  /** Which live quantity drives it, so the browser can recompute intraday. */
  key: 'mvrvZ' | 'mvrv' | 'mayer' | 'vs200w' | 'static';
  label: string;
  value: number;
  lo: number;
  hi: number;
};

export const ramp = (v: number, lo: number, hi: number) =>
  Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));

export function cycleScore(row: EnrichedRow, snap: Snapshot): { score: number; parts: ScorePart[] } {
  const parts: ScorePart[] = [
    { key: 'mvrvZ', label: 'MVRV Z-score', value: ramp(row.mvrvZ, 0, 7), lo: 0, hi: 7 },
    { key: 'mvrv', label: 'MVRV', value: ramp(row.mvrv, 0.8, 3.7), lo: 0.8, hi: 3.7 },
  ];
  if (row.mayer != null) parts.push({ key: 'mayer', label: 'Mayer Multiple', value: ramp(row.mayer, 0.7, 2.4), lo: 0.7, hi: 2.4 });
  if (row.ma200w != null) parts.push({ key: 'vs200w', label: 'Price vs 200w MA', value: ramp(row.price / row.ma200w, 1, 5), lo: 1, hi: 5 });
  if (snap.fearGreed) parts.push({ key: 'static', label: 'Fear & Greed', value: snap.fearGreed.value, lo: 0, hi: 100 });

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
