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
  mvrvZ: number | null;
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
 * Expanding (cumulative) population standard deviation: at each index, the
 * deviation of everything up to and including that day.
 *
 * This is the denominator the MVRV Z-score is defined with, and the distinction
 * is not academic. Market cap has grown exponentially, so the deviation of the
 * *whole* sample is dominated by recent values. Divide 2013 by that number and
 * the largest MVRV reading in Bitcoin's history scores 0.03 — the metric stops
 * detecting the very tops it exists to detect. With an expanding window the
 * same day scores 7.2, and 2017 scores 8.6, which is what published charts show.
 *
 * Uses Welford's method rather than sum-of-squares: market cap squared is ~1e24,
 * and subtracting two near-equal numbers that large loses significant digits.
 *
 * Returns null until `minSamples` days exist, because the deviation of a handful
 * of early days is tiny and produces meaningless spikes.
 */
export function expandingSd(values: number[], minSamples = 365): (number | null)[] {
  const out: (number | null)[] = [];
  let mean = 0, m2 = 0;
  values.forEach((x, i) => {
    const n = i + 1;
    const d = x - mean;
    mean += d / n;
    m2 += d * (x - mean);
    const sd = Math.sqrt(Math.max(0, m2 / n));
    out.push(n < minSamples || sd <= 0 ? null : sd);
  });
  return out;
}

/**
 * The expanding deviation as of the most recent day — which, at the end of the
 * series, is the same number as the full-sample deviation. The browser needs
 * exactly this one value to recompute today's Z from a live price.
 */
export function marketCapSd(rows: DailyRow[]): number {
  const sd = expandingSd(rows.map((r) => r.marketCap));
  return sd[sd.length - 1] ?? 0;
}

export function enrich(rows: DailyRow[]): EnrichedRow[] {
  const prices = rows.map((r) => r.price);
  const ma50 = movingAverage(prices, 50);
  const ma200d = movingAverage(prices, 200);
  const ma200w = movingAverage(prices, 1400); // 200 weeks &asymp; 1400 days

  // MVRV Z-score measures the gap between market cap and realized cap in
  // standard deviations of market cap's history *up to that day*.
  const sd = expandingSd(rows.map((r) => r.marketCap));

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
      mvrvZ: sd[i] == null ? null : (r.marketCap - realizedCap) / sd[i]!,
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
  /**
   * Boundaries taken from the publisher's own labels rather than invented:
   * every one of the 3,142 published readings falls in exactly these buckets.
   */
  fearGreed: [
    { below: 26, temp: 'cold', note: 'Extreme fear. Historically the zone where selling pressure was closest to exhausted.' },
    { below: 47, temp: 'cool', note: 'Fear. Sentiment is negative but not capitulating.' },
    { below: 55, temp: 'neutral', note: 'Neutral. Sentiment is not leaning either way.' },
    { below: 76, temp: 'warm', note: 'Greed. Optimism is running ahead of caution.' },
    { below: Infinity, temp: 'hot', note: 'Extreme greed. Historically clustered near local tops, though it can persist for weeks.' },
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
 * The raw number is not the headline: five signals that rarely peak together
 * average toward the middle, so a fixed 0-100 band understates extremes badly.
 * Backtested, this average read 63-67 at every cycle top and never reached the
 * "overheated" band at all. The page therefore reports where today's score sits
 * in the distribution of its own history, which is what makes a reading legible.
 *
 * Deliberately simple and legible: each component is mapped onto 0–100 by a
 * linear ramp between historically meaningful bounds, then averaged over
 * whichever components are available. It is a heuristic, not a prediction, and
 * the page says so.
 */
export type ScorePart = {
  /** Which live quantity drives it, so the browser can recompute intraday. */
  key: 'mvrvZ' | 'mayer' | 'funding' | 'static';
  label: string;
  /** The measurement itself, before normalising — shown so the score is auditable. */
  raw: number;
  /** The measurement mapped onto 0-100 by a linear ramp between lo and hi. */
  value: number;
  lo: number;
  hi: number;
  /** How to render `raw`, since these are ratios, multiples and plain indices. */
  unit: 'ratio' | 'index' | 'bp' | 'pct';
};

export const ramp = (v: number, lo: number, hi: number) =>
  Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));

/**
 * One component per kind of evidence, deliberately.
 *
 * An earlier version averaged MVRV with its own Z-score and the Mayer Multiple
 * with price-against-the-200-week-average. Measured over the full history those
 * pairs correlate at r=0.98 and r=0.71 — the first is the same number twice, and
 * both inflate whatever the price-versus-history factor happens to say by
 * counting it two or three times. Averaging correlated inputs does not make an
 * estimate more robust; it makes one opinion sound like several.
 *
 * What survives, and why each is a different question:
 *   MVRV Z-score  what the market pays against what holders actually paid (on-chain)
 *   Mayer         where price sits against its own trend (pure price)
 *   Fear & Greed  what people say (sentiment; r=0.68 against MVRV)
 *   Funding       what leveraged traders are paying to hold a side (r=0.38
 *                 against MVRV Z — by far the most independent input available)
 *
 * MVRV Z is kept over raw MVRV because it is normalised for era: the raw ratio's
 * peak fell from 4.7 to 2.8 across cycles, so a fixed threshold on it silently
 * stopped meaning the same thing. Mayer is kept over price-vs-200-week because
 * it is the more responsive of the two and correlates less with MVRV Z.
 *
 * Network health — hashrate, exchange balances — is deliberately NOT here. Both
 * are worth watching, but neither answers "is this expensive?", and adding
 * inputs that do not speak to the question only dilutes the ones that do.
 */
/** The bounds each component is scored across — one definition, used by both
 *  today's score and the historical series the percentile is measured against. */
export const SCORE_BOUNDS = {
  mayer: [0.7, 2.4] as const,
  mvrvZ: [0, 7] as const,
  fearGreed: [0, 100] as const,
  funding: [-1, 5] as const,
};

export function cycleScore(row: EnrichedRow, snap: Snapshot): { score: number; parts: ScorePart[] } {
  // Order deliberately mirrors the order of the blocks on the page, so a reader
  // moving down the dashboard meets the signals in the same sequence.
  const parts: ScorePart[] = [];

  if (row.mayer != null) {
    parts.push({ key: 'mayer', label: 'Mayer Multiple', raw: row.mayer, value: ramp(row.mayer, 0.7, 2.4), lo: 0.7, hi: 2.4, unit: 'ratio' });
  }
  if (row.mvrvZ != null) {
    parts.push({ key: 'mvrvZ', label: 'MVRV Z-score', raw: row.mvrvZ, value: ramp(row.mvrvZ, 0, 7), lo: 0, hi: 7, unit: 'ratio' });
  }
  if (snap.fearGreed) {
    parts.push({ key: 'static', label: 'Fear & Greed', raw: snap.fearGreed.value, value: snap.fearGreed.value, lo: 0, hi: 100, unit: 'index' });
  }
  if (snap.fundingRate != null) {
    // basis points per 8-hour settlement. -1bp means shorts are paying to stay
    // short; 5bp sustained has marked crowded long positioning.
    const bp = snap.fundingRate * 10_000;
    parts.push({ key: 'funding', label: 'Funding rate', raw: bp, value: ramp(bp, -1, 5), lo: -1, hi: 5, unit: 'bp' });
  }
  // Exchange-held supply was tried here and removed. It is genuinely the most
  // independent series on the page (r = -0.07 against MVRV Z), but independence
  // is not the same as signal. Backtested against known turning points it called
  // the 2013 and 2017 tops "maximally cheap" (0 points) and the March 2020 crash
  // low "maximally hot" (95), because the share carries a strong secular trend —
  // exchanges grew from nothing to 17% of supply, then shrank as self-custody and
  // ETFs took over — and a fixed band measures that trend, not the cycle. Scoring
  // its 90-day change instead fared no better: right at two tops, wrong at three
  // lows and at the 2021 top. A component that is wrong more often than it is
  // right does not become useful by being uncorrelated.
  //
  // It stays on the page as context in the network block, where direction over
  // time is readable and no false precision is claimed.

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
