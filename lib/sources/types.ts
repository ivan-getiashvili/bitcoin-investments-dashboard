/**
 * The contract every data source must satisfy.
 *
 * The dashboard only ever sees these shapes — never a vendor's raw response.
 * That is what lets us swap Coin Metrics (non-commercial) for a licensed
 * provider later by rewriting one file, instead of hunting vendor field names
 * through the whole codebase.
 */

/** One value on one day. `date` is always ISO `YYYY-MM-DD`, UTC. */
export type Point = { date: string; value: number };

/** A day of Bitcoin fundamentals, normalized across vendors. */
export type DailyRow = {
  date: string;
  price: number;
  mvrv: number;
  marketCap: number;
  supply: number;
  exchangeSupply: number | null;
  activeAddresses: number | null;
  hashRate: number | null;
};

/** Point-in-time readings that have no long history worth shipping. */
export type Snapshot = {
  fearGreed: { value: number; label: string } | null;
  fundingRate: number | null;
  openInterestUsd: number | null;
  /** Which exchange the two figures above came from; they are never mixed. */
  derivativesVenue: 'Binance' | 'OKX' | null;
  hashRateEh: number | null;
  difficulty: number | null;
};

/** Wraps a source call so one dead vendor cannot take down the whole ingest. */
export async function tolerate<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.warn(`  ! ${label} failed: ${(err as Error).message} — continuing without it`);
    return null;
  }
}

/**
 * BLOCK_HOSTS reproduces, on a laptop, what a CI runner experiences. Binance
 * refuses cloud IP ranges, so code that works locally has repeatedly shipped
 * broken: a blank chart, a score missing a component, signals in the wrong
 * order. `BLOCK_HOSTS=fapi.binance.com,api.binance.com npm run build:site`
 * makes those hosts fail here exactly as they fail there.
 */
const BLOCKED = (process.env.BLOCK_HOSTS ?? '').split(',').map((h) => h.trim()).filter(Boolean);

export async function getJson(url: string, timeoutMs = 30_000): Promise<any> {
  if (BLOCKED.includes(new URL(url).host)) {
    throw new Error(`HTTP 451 from ${new URL(url).host} (simulated by BLOCK_HOSTS)`);
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
  return res.json();
}
