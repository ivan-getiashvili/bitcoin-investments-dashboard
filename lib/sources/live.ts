/**
 * The fast tier: readings that genuinely change minute to minute.
 *
 * Kept separate from the daily on-chain tier because the refresh cadences are
 * an order of magnitude apart, and mixing them would mean re-downloading 13
 * years of history to learn that the price moved $40.
 *
 * Binance allows direct browser access (`access-control-allow-origin: *`), so
 * the published page polls the ticker itself and does not wait on this script.
 * This script exists for the readings a browser should not be polling per
 * viewer — funding and open interest.
 */
import { getJson, tolerate } from './types.ts';

export type Live = {
  fetchedAt: string;
  price: number | null;
  change24h: number | null;
  volume24hUsd: number | null;
  fundingRate: number | null;
  openInterestUsd: number | null;
};

async function ticker() {
  const t = await getJson('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
  return {
    price: Number(t.lastPrice),
    change24h: Number(t.priceChangePercent) / 100,
    volume24hUsd: Number(t.quoteVolume),
  };
}

async function fundingRate() {
  const rows = await getJson('https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1');
  return Number(rows[0].fundingRate);
}

async function openInterestUsd() {
  const rows = await getJson(
    'https://fapi.binance.com/futures/data/openInterestHist?symbol=BTCUSDT&period=5m&limit=1',
  );
  return Number(rows[0].sumOpenInterestValue);
}

export async function fetchLive(): Promise<Live> {
  const [t, funding, oi] = await Promise.all([
    tolerate('Binance ticker', ticker),
    tolerate('Binance funding', fundingRate),
    tolerate('Binance open interest', openInterestUsd),
  ]);

  return {
    fetchedAt: new Date().toISOString(),
    price: t?.price ?? null,
    change24h: t?.change24h ?? null,
    volume24hUsd: t?.volume24hUsd ?? null,
    fundingRate: funding,
    openInterestUsd: oi,
  };
}
