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

export async function getJson(url: string, timeoutMs = 30_000): Promise<any> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
  return res.json();
}
