# Bitcoin Investments Dashboard

### ▶ &nbsp;[**Open the live dashboard**](https://ivan-getiashvili.github.io/bitcoin-investments-dashboard/)

[![Open the dashboard](https://img.shields.io/badge/live%20dashboard-open-2f6fb0?style=for-the-badge)](https://ivan-getiashvili.github.io/bitcoin-investments-dashboard/)
[![Refresh and deploy](https://github.com/ivan-getiashvili/bitcoin-investments-dashboard/actions/workflows/refresh.yml/badge.svg)](https://github.com/ivan-getiashvili/bitcoin-investments-dashboard/actions/workflows/refresh.yml)
[![Updated daily](https://img.shields.io/badge/on--chain%20data-refreshed%20daily-b8760f)](https://github.com/ivan-getiashvili/bitcoin-investments-dashboard/actions/workflows/refresh.yml)

**https://ivan-getiashvili.github.io/bitcoin-investments-dashboard/**

Where Bitcoin sits in its market cycle — read from the network's on-chain cost basis,
derivatives positioning and market sentiment. Price, funding and open interest update live in
your browser every 15 seconds; the on-chain metrics refresh daily.

No account needed to view it.

---

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

## Hosting

**Live at → https://ivan-getiashvili.github.io/bitcoin-investments-dashboard/**

```
main branch  ──► GitHub Actions (daily 01:25 UTC + on push)
                        │  npm run build:site
                        ├──► deploy branch  ──► Hostinger pulls it ──► the custom domain
                        └──► GitHub Pages   ──► backup URL
```

**Cloudflare Pages** (primary) builds from `main` directly: build command `npm run build:site`,
output directory `_site`, Node pinned by `.node-version`. It redeploys on every push, and
`_site/_headers` sets its cache policy.

**GitHub Pages** runs the same build in Actions and deploys as a second URL — useful as a
fallback and for confirming the daily refresh ran.

The `deploy` branch holds the built site with its root exactly what belongs in `public_html`,
for any host whose Git integration serves committed files without running a build (Hostinger
works this way). Nothing needs it today; it costs nothing to keep publishing.

`main` stays clean source — no generated files are committed to it.

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

---

### ▶ &nbsp;[Open the live dashboard](https://ivan-getiashvili.github.io/bitcoin-investments-dashboard/)

`https://ivan-getiashvili.github.io/bitcoin-investments-dashboard/`
