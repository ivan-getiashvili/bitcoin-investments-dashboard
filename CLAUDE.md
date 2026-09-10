# BTC Investor Dashboard

A Bitcoin on-chain + market dashboard, intended to become a paid subscription product.
Owner: Ivan. Beginner at web dev — explain concepts when introducing them, don't just emit code.

## Current stage

M2 done — adapters in `lib/sources/`, derived metrics in `lib/metrics.ts`, ingest writes
`data/btc.json`, build bakes it into `dist/dashboard.html`. Published as an Artifact:
https://claude.ai/code/artifact/351c3c67-80ea-46f6-8710-9e9777553107

Refresh the published page:

```bash
node scripts/ingest.ts && node scripts/build-page.ts
```

then republish `dist/dashboard.html` to that same URL (pass it as `url`) so the link is kept.

**Live URLs**

- GitHub repo: https://github.com/ivan-getiashvili/bitcoin-investments-dashboard
- GitHub Pages (live, auto-deployed): https://ivan-getiashvili.github.io/bitcoin-investments-dashboard/
- Artifact snapshot (no live tier — outbound requests blocked there):
  https://claude.ai/code/artifact/351c3c67-80ea-46f6-8710-9e9777553107

M3/M4 done for GitHub Pages; Hostinger still to be connected. GitHub is source of truth:

- `main` holds source only; generated files are gitignored
- `.github/workflows/refresh.yml` runs daily at 01:25 UTC and on push: builds `_site/`,
  verifies the page is non-empty and has data baked in, pushes it to the `deploy` branch,
  and deploys GitHub Pages as a backup URL
- Hostinger's Git integration serves repo contents verbatim (no build step), so it is
  connected to the `deploy` branch → `public_html`
- Two refresh tiers: on-chain daily (vendor publishes `1d` only — confirmed against the
  catalog), price/funding/open-interest live in the browser every 15s from Binance

Hostinger is paid hosting, which also removes the non-commercial restriction that free tiers
like Vercel Hobby carry. The Coin Metrics CC BY-NC constraint still stands and is unaffected.

Full plan: `docs/PLAN.md`.

`index.html` is the superseded M1 prototype, kept only as a teaching reference.

## Publishing — standing instruction

Ivan expects **every change published immediately**, with no asking. After any edit:

1. `git add -A && git commit && git push origin main`
2. The push triggers `.github/workflows/refresh.yml`, which redeploys GitHub Pages in ~25s
3. **Verify the live URL afterwards** — load it and check the change is actually there. Do not
   report a change as shipped on the strength of a green workflow alone.

Expect heavy iteration on metrics, data sources and design. Which file to touch:

| To change… | Edit |
|---|---|
| Colours, type, layout, spacing, anything visual | `page/template.html` (tokens at the top) |
| Interpretation text, band thresholds, cycle-score components | `lib/metrics.ts` (`BANDS`, `cycleScore`) |
| Which metrics get fetched, what lands in the payload | `scripts/ingest.ts` + `lib/sources/coinmetrics.ts` |
| Swap or add a data vendor | a file in `lib/sources/` — nothing else should need touching |
| Live-tier endpoints and poll interval | `page/template.html` (`pullBinance`, `POLL_MS`) |

The Artifact link (`claude.ai/code/artifact/351c3c67…`) does **not** auto-update. It only
changes on an explicit republish, so it drifts. GitHub Pages is canonical.

## Hard rules

1. **Never call a third-party API from browser code in production.** Data flows:
   scheduled ingest → stored data → our API → UI. `index.html` deliberately breaks this
   rule as a throwaway prototype; from M2 on it does not.
2. **Every data source lives behind an adapter** in `lib/sources/`, exposing a fixed shape
   (e.g. `getMVRV(): {date, value}[]`). The UI must never know which vendor a number came from.
   This is what lets us swap non-commercial free data for licensed data before charging money.
3. **No secrets in the repo.** Keys go in `.env.local`, which is gitignored. Anything in
   client-side code is public — assume users will read it.
4. **Derived metrics are computed once at ingest**, not on every page load.
5. **Stale data must be labelled stale.** A dashboard that quietly shows yesterday's number
   as today's is worse than one that says "data is 26h old".

## Data sources (current, all free)

| Source | Used for | License note |
|---|---|---|
| Coin Metrics community API (keyless) | MVRV `CapMVRVCur`, `PriceUSD`, `CapMrktCurUSD`, `SplyCur`, `SplyExNtv`, `FlowIn/OutExUSD`, `AdrActCnt`, `HashRate`, `ROI30d`, `ROI1yr` | **CC BY-NC — non-commercial only. Must be replaced before charging money.** |
| Binance public futures API | funding rate, open interest | check ToS before commercial redistribution |
| alternative.me | Fear & Greed index | free |
| mempool.space | hashrate, difficulty | free |

Realized cap is **not** free — derive it: `realizedCap = marketCap / MVRV`,
`realizedPrice = realizedCap / supply`.

## Conventions

- TypeScript over JavaScript from M2 onward.
- Commit before each meaningful change, so "revert that" is always available.
- Run `/code-review` at the end of each milestone; `/security-review` before payments ship.
