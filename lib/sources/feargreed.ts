/**
 * Crypto Fear & Greed Index — alternative.me, free and keyless.
 *
 * The only sentiment input on the dashboard, and the only one that is not
 * derived from price or the chain. It is a composite the publisher builds from
 * volatility, momentum, volume, social media and market dominance; the exact
 * weighting is not disclosed, which is worth knowing before leaning on it.
 *
 * History starts 2018-02-01 — later than every other series here, so it is
 * aligned onto the shared date axis with nulls before that.
 */
import { getJson, type Point } from './types.ts';

const BASE = 'https://api.alternative.me/fng/';

const toDate = (unixSeconds: string | number) =>
  new Date(Number(unixSeconds) * 1000).toISOString().slice(0, 10);

/** `limit=0` asks for the entire history in one response (~300 KB). */
export async function fetchFearGreedHistory(): Promise<Point[]> {
  const json = await getJson(`${BASE}?limit=0&format=json`);
  return (json.data ?? [])
    .map((r: any) => ({ date: toDate(r.timestamp), value: Number(r.value) }))
    .filter((p: Point) => Number.isFinite(p.value))
    .sort((a: Point, b: Point) => a.date.localeCompare(b.date));
}

export async function fetchFearGreedLatest(): Promise<{ value: number; label: string }> {
  const json = await getJson(`${BASE}?limit=1`);
  return { value: Number(json.data[0].value), label: json.data[0].value_classification };
}
