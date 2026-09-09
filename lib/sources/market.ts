/**
 * Point-in-time market readings from three free sources.
 *
 * Each is optional: if a vendor is down, the dashboard hides that tile rather
 * than failing. None of these carry long history worth shipping to the client.
 */
import { getJson, tolerate, type Snapshot } from './types.ts';

/** Perpetual funding rate — positive means longs pay shorts (bullish crowding). */
async function fundingRate(): Promise<number> {
  const rows = await getJson('https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1');
  return Number(rows[0].fundingRate);
}

/** Notional USD value of open perpetual futures positions. */
async function openInterestUsd(): Promise<number> {
  const rows = await getJson(
    'https://fapi.binance.com/futures/data/openInterestHist?symbol=BTCUSDT&period=1d&limit=1',
  );
  return Number(rows[0].sumOpenInterestValue);
}

async function fearGreed(): Promise<{ value: number; label: string }> {
  const json = await getJson('https://api.alternative.me/fng/?limit=1');
  return { value: Number(json.data[0].value), label: json.data[0].value_classification };
}

/** mempool.space reports hashrate in H/s; we present exahash. */
async function mining(): Promise<{ hashRateEh: number; difficulty: number }> {
  const json = await getJson('https://mempool.space/api/v1/mining/hashrate/3d');
  return {
    hashRateEh: Number(json.currentHashrate) / 1e18,
    difficulty: Number(json.currentDifficulty),
  };
}

export async function fetchSnapshot(): Promise<Snapshot> {
  const [fng, funding, oi, mine] = await Promise.all([
    tolerate('Fear & Greed', fearGreed),
    tolerate('Binance funding rate', fundingRate),
    tolerate('Binance open interest', openInterestUsd),
    tolerate('mempool.space mining', mining),
  ]);

  return {
    fearGreed: fng,
    fundingRate: funding,
    openInterestUsd: oi,
    hashRateEh: mine?.hashRateEh ?? null,
    difficulty: mine?.difficulty ?? null,
  };
}
