# Bitcoin Investments Dashboard

Where Bitcoin sits in its market cycle — read from the network's on-chain cost basis,
derivatives positioning and market sentiment.

## What it shows

A composite **cycle score** (0 = deep value, 100 = overheated) built from MVRV, MVRV Z-score,
the Mayer Multiple, price against the 200-week moving average, and the Fear & Greed index —
each normalized on a stated range, then averaged. Underneath it, the individual metrics with a
plain-English reading of where each one sits historically.

## How the data flows

```
scheduled ingest  ──►  data/btc.json  ──►  baked into the page  ──►  _site/index.html
(once a day)           on-chain metrics

browser fetch     ──────────────────────────────────────────────►  live, every 15s
(no server)            price, funding, open interest
```

Two tiers, because the sources genuinely differ in cadence:

**Daily** — MVRV, realized cap, exchange balances, active addresses, hashrate. Every on-chain
metric is published once a day (verified against the vendor catalog: `CapMVRVCur` offers `1d`
and nothing faster). Realized cap requires walking the UTXO set, so no provider computes it
more often at any reasonable price.

**Live** — price, 24h change, funding rate and open interest, fetched straight from Binance in
the browser every 15 seconds. Those endpoints are CORS-open, so no server sits in the path.
From the live price the page also re-derives MVRV, MVRV Z-score, the Mayer Multiple, drawdown
and the cycle score, holding realized cap and the moving averages at their daily close. Figures
produced that way are labelled with the close they started from.

Realized cap is paywalled at every vendor, but MVRV is defined as `marketCap / realizedCap` —
so rearranging recovers it for free.

## Running it locally

```bash
npm run build:site   # fetch, compute, bake, assemble into _site/
npm run serve        # http://localhost:4173
```

`npm run refresh` re-fetches without rebuilding the page; `npm run build` rebakes the page from
whatever is already in `data/`.

## Layout

| Path | What it is |
|---|---|
| `lib/sources/` | One adapter per vendor. All return normalized shapes, so swapping a vendor touches one file. |
| `lib/metrics.ts` | Derived metrics, interpretation bands, cycle score. |
| `scripts/ingest.ts` | Daily tier — fetches history, writes `data/btc.json`. |
| `scripts/ingest-live.ts` | Fast tier fallback — writes a 170-byte `data/live.json`. |
| `page/template.html` | The page itself. Edit design here. |
| `scripts/build-page.ts` | Bakes the data into the template. |
| `scripts/assemble.ts` | Collects the output into `_site/`. |
| `index.html` | Superseded first prototype, kept as a reference. |

## Data sources and licensing

| Source | Used for | License |
|---|---|---|
| [Coin Metrics community API](https://docs.coinmetrics.io/packages/coin-metrics-community-data) | on-chain metrics | **CC BY-NC — non-commercial only** |
| Binance public API | price, funding, open interest | public market data |
| [alternative.me](https://alternative.me/crypto/fear-and-greed-index/) | Fear & Greed index | free |
| [mempool.space](https://mempool.space/docs/api) | hashrate, difficulty | free |

> **The on-chain data cannot be used commercially as licensed.** Charging for access requires
> replacing Coin Metrics with a licensed provider first. The adapter layer exists so that is a
> one-file change — see `CLAUDE.md`.

## Disclaimer

Information only, not investment advice. These metrics are heuristics drawn from historical
patterns, and Bitcoin has had four cycles — a small sample to generalize from.
