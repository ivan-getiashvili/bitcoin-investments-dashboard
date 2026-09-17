# Bitcoin Investments Dashboard

### ▶ &nbsp;[**Open the live dashboard**](https://btcmetrics.online/)

[![Open the dashboard](https://img.shields.io/badge/live%20dashboard-open-2f6fb0?style=for-the-badge)](https://btcmetrics.online/)
[![Refresh and deploy](https://github.com/ivan-getiashvili/bitcoin-investments-dashboard/actions/workflows/refresh.yml/badge.svg)](https://github.com/ivan-getiashvili/bitcoin-investments-dashboard/actions/workflows/refresh.yml)
[![Updated daily](https://img.shields.io/badge/on--chain%20data-refreshed%20daily-b8760f)](https://github.com/ivan-getiashvili/bitcoin-investments-dashboard/actions/workflows/refresh.yml)

**https://btcmetrics.online/**

Mirrors: <https://cyclebasis.ivan-getiashvili.workers.dev/> &middot; <https://ivan-getiashvili.github.io/bitcoin-investments-dashboard/>

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

**Live at → https://btcmetrics.online/**

```
main branch  ──► GitHub Actions (daily 01:25 UTC + on push)
                        │  npm run build:site
                        └──► GitHub Pages   ──► mirror URL

main branch  ──► Cloudflare build ──► npx wrangler deploy ──► the live site
```

**Cloudflare** (primary) builds from `main` on every push: `npm run build:site`, then
`npx wrangler deploy` ships `_site/` as static assets per `wrangler.jsonc`. `.node-version`
pins Node 22, and `_site/_headers` sets the cache policy.

**GitHub Pages** runs the same build in Actions and deploys as a second URL — useful as a
fallback and for confirming the daily refresh ran.

The `deploy` branch holds the built site with its root exactly what belongs in `public_html`,
for any host whose Git integration serves committed files without running a build. Nothing
uses it today; it costs nothing to keep publishing.

`main` stays clean source — no generated files are committed to it.

## Running it locally

```bash
npm ci               # once: installs jsdom, used to prerender the page at build time
npm run build:site   # fetch, compute, bake, prerender, assemble into _site/, verify
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
| `scripts/prerender.ts` | Runs the page once at build time so the published HTML already contains every reading; also writes `summary.json`, `index.md` and `llms.txt`. |
| `scripts/assemble.ts` | Collects the output into `_site/`, with the HTML head, JSON-LD, `robots.txt`, `sitemap.xml` and a real `404.html`. |
| `scripts/verify-site.ts` | Reads `_site/` with JavaScript off and fails the build if a reading is missing or the text editions disagree with the page. |
| `records/daily-readings.csv` | Append-only log of what the site said each day, committed by the scheduled run. |
| `index.html` | Superseded first prototype, kept as a reference. |

## Readable by software, not only by browsers

Every current reading, explanation and caveat is in the HTML itself — no JavaScript needed — so
a search crawler, a link preview or an AI assistant given the URL reads the same page a person
does. The same build also publishes:

| URL | What it is |
|---|---|
| [`/llms.txt`](https://btcmetrics.online/llms.txt) | Short brief for AI assistants, with today's readings |
| [`/index.md`](https://btcmetrics.online/index.md) (also `/llms-full.txt`) | The whole page as Markdown, including each chart as a table |
| [`/summary.json`](https://btcmetrics.online/summary.json) | Today's readings, structured |
| `/robots.txt`, `/sitemap.xml` | Everything allowed; AI agents named explicitly |

## Data sources and licensing

| Source | Used for | License |
|---|---|---|
| [Coin Metrics community API](https://docs.coinmetrics.io/packages/coin-metrics-community-data) | on-chain metrics | **CC BY-NC — non-commercial only** |
| Binance public API | live price, funding, open interest — fetched by the visitor's browser (Binance refuses build servers) | public market data |
| OKX public API | funding and open interest recorded at build time | public market data |
| [alternative.me](https://alternative.me/crypto/fear-and-greed-index/) | Fear & Greed index | free |

> **The on-chain data cannot be used commercially as licensed.** Charging for access requires
> replacing Coin Metrics with a licensed provider first. The adapter layer exists so that is a
> one-file change — see `CLAUDE.md`.

## Disclaimer

Information only, not investment advice. These metrics are heuristics drawn from historical
patterns, and Bitcoin has had four cycles — a small sample to generalize from.

---

### ▶ &nbsp;[Open the live dashboard](https://btcmetrics.online/)

`https://btcmetrics.online/`
