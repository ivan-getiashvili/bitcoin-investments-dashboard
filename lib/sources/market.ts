/**
 * Point-in-time market readings from three free sources.
 *
 * Each is optional: if a vendor is down, the dashboard hides that tile rather
 * than failing. None of these carry long history worth shipping to the client.
 */
import { getJson, tolerate, type Snapshot } from './types.ts';
import { fetchFearGreedLatest } from './feargreed.ts';
import { fetchOkxFundingLatest, fetchOkxOpenInterestUsd } from './okx.ts';

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

/** mempool.space reports hashrate in H/s; we present exahash. */
async function mining(): Promise<{ hashRateEh: number; difficulty: number }> {
  const json = await getJson('https://mempool.space/api/v1/mining/hashrate/3d');
  return {
    hashRateEh: Number(json.currentHashrate) / 1e18,
    difficulty: Number(json.currentDifficulty),
  };
}

export async function fetchSnapshot(): Promise<Snapshot> {
  const [fng, mine] = await Promise.all([
    tolerate('Fear & Greed', fetchFearGreedLatest),
    tolerate('mempool.space mining', mining),
  ]);

  // Derivatives: Binance where it answers, OKX where it does not (every CI and
  // CDN builder). Funding and open interest always come from the same venue —
  // mixing a Binance rate with an OKX position size would describe no market.
  let venue: Snapshot['derivativesVenue'] = null;
  let funding = await tolerate('Binance funding rate', fundingRate);
  let oi: number | null = null;
  if (funding != null) {
    venue = 'Binance';
    oi = await tolerate('Binance open interest', openInterestUsd);
  } else {
    funding = await tolerate('OKX funding rate', fetchOkxFundingLatest);
    if (funding != null) {
      venue = 'OKX';
      oi = await tolerate('OKX open interest', fetchOkxOpenInterestUsd);
    }
  }

  return {
    fearGreed: fng,
    fundingRate: funding,
    openInterestUsd: oi,
    derivativesVenue: venue,
    hashRateEh: mine?.hashRateEh ?? null,
    difficulty: mine?.difficulty ?? null,
  };
}
