/**
 * Binance public futures data — keyless, CORS-open.
 *
 * Two very different retention policies, and the difference dictates what the
 * dashboard can honestly show:
 *
 *   fundingRate        paginates back years, 8h settlements
 *   openInterestHist   ONLY ~30 days, full stop
 *
 * So funding gets a real history chart and open interest cannot have one. That
 * is a property of the source, not a gap we can engineer around without paying
 * a vendor.
 */
import { getJson, type Point } from './types.ts';

const FAPI = 'https://fapi.binance.com';

/**
 * Funding, collapsed to a daily mean of its three 8-hour settlements.
 *
 * Daily is the right grain here: the series is aligned onto the same date axis
 * as everything else, and an 8-hour tick is noise at the scale this page shows.
 */
export async function fetchFundingHistory(days = 900): Promise<Point[]> {
  const perDay = 3;                       // settlements at 00:00, 08:00, 16:00 UTC
  const wanted = days * perDay;
  const rows: any[] = [];
  let endTime = Date.now();

  // Walk backwards a page at a time; Binance caps a page at 1000 rows.
  for (let page = 0; page < 12 && rows.length < wanted; page++) {
    const batch = await getJson(
      `${FAPI}/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1000&endTime=${endTime}`,
    );
    if (!batch.length) break;
    rows.unshift(...batch);
    const oldest = batch[0].fundingTime;
    if (oldest >= endTime) break;         // no progress, stop rather than loop
    endTime = oldest - 1;
  }

  // average the settlements within each UTC day
  const byDate = new Map<string, number[]>();
  for (const r of rows) {
    const date = new Date(r.fundingTime).toISOString().slice(0, 10);
    const v = Number(r.fundingRate);
    if (!Number.isFinite(v)) continue;
    (byDate.get(date) ?? byDate.set(date, []).get(date)!).push(v);
  }
  return [...byDate.entries()]
    .map(([date, vs]) => ({ date, value: (vs.reduce((a, b) => a + b, 0) / vs.length) * 10_000 }))
    .sort((a, b) => a.date.localeCompare(b.date));   // in basis points
}

/** Open interest in USD. Binance keeps roughly 30 days of this and no more. */
export async function fetchOpenInterestHistory(): Promise<Point[]> {
  const rows = await getJson(
    `${FAPI}/futures/data/openInterestHist?symbol=BTCUSDT&period=1d&limit=500`,
  );
  return rows
    .map((r: any) => ({
      date: new Date(r.timestamp).toISOString().slice(0, 10),
      value: Number(r.sumOpenInterestValue),
    }))
    .filter((p: Point) => Number.isFinite(p.value))
    .sort((a: Point, b: Point) => a.date.localeCompare(b.date));
}
