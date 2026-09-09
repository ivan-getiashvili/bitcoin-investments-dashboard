/**
 * Coin Metrics community API — keyless, free, CC BY-NC.
 *
 * LICENSE: non-commercial only. This file must be replaced before the
 * dashboard charges anyone. Everything downstream reads DailyRow, so the
 * replacement is confined to this file.
 */
import { getJson, type DailyRow } from './types.ts';

const BASE = 'https://community-api.coinmetrics.io/v4/timeseries/asset-metrics';

const METRICS = [
  'PriceUSD',        // close price
  'CapMVRVCur',      // MVRV — market cap / realized cap
  'CapMrktCurUSD',   // market cap
  'SplyCur',         // circulating supply
  'SplyExNtv',       // BTC held on exchanges
  'AdrActCnt',       // active addresses
  'HashRate',        // network hashrate
].join(',');

export async function fetchDailyRows(startTime = '2011-01-01'): Promise<DailyRow[]> {
  const params = new URLSearchParams({
    assets: 'btc',
    metrics: METRICS,
    frequency: '1d',
    start_time: startTime,
    page_size: '10000',
    sort: 'time',
  });

  const raw: any[] = [];
  let url: string | null = `${BASE}?${params}`;
  for (let page = 0; page < 10 && url; page++) {
    const json = await getJson(url);
    raw.push(...(json.data ?? []));
    url = json.next_page_url ?? null;
  }

  const num = (v: unknown) => (v == null ? null : Number(v));

  return raw
    .map((r): DailyRow => ({
      date: r.time.slice(0, 10),
      price: Number(r.PriceUSD),
      mvrv: Number(r.CapMVRVCur),
      marketCap: Number(r.CapMrktCurUSD),
      supply: Number(r.SplyCur),
      exchangeSupply: num(r.SplyExNtv),
      activeAddresses: num(r.AdrActCnt),
      hashRate: num(r.HashRate),
    }))
    // Early history has gaps; a row without price or MVRV is useless to us.
    .filter((r) => Number.isFinite(r.price) && Number.isFinite(r.mvrv) && r.mvrv > 0);
}
