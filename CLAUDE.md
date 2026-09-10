# BTC Investor Dashboard

A Bitcoin on-chain + market dashboard, intended to become a paid subscription product.
Owner: Ivan. Beginner at web dev — explain concepts when introducing them, don't just emit code.

## Current stage

**Live URLs**

- GitHub repo: https://github.com/ivan-getiashvili/bitcoin-investments-dashboard
- Cloudflare (primary, auto-deployed): https://cyclebasis.ivan-getiashvili.workers.dev/
- GitHub Pages (mirror, auto-deployed): https://ivan-getiashvili.github.io/bitcoin-investments-dashboard/
- Artifact snapshot (no live tier — outbound requests blocked there):
  https://claude.ai/code/artifact/351c3c67-80ea-46f6-8710-9e9777553107

Hosting is **Cloudflare** (a Worker serving static assets, configured by `wrangler.jsonc`),
with GitHub as source of truth. Hostinger and Hetzner were considered and dropped — Hostinger
has no free tier, and the Hetzner account is cancelled and in arrears.

- `main` holds source only; generated files are gitignored
- Cloudflare builds from `main` on every push: `npm run build:site`, then `npx wrangler deploy`
  ships `_site/` as static assets. `.node-version` pins Node 22 (type stripping needs >=22.6)
- `.github/workflows/refresh.yml` runs daily at 01:25 UTC and on push: builds `_site/`, verifies
  the page is non-empty and has data baked in, deploys GitHub Pages, and pushes the built site
  to the `deploy` branch for any host that serves committed files without building
- Two refresh tiers: on-chain daily (vendor publishes `1d` only — confirmed against the
  catalog), price/funding/open-interest live in the browser every 15s from Binance

Full plan: `docs/PLAN.md`.

`index.html` is the superseded M1 prototype, kept only as a teaching reference.

## Publishing — standing instruction

Ivan expects **every change published immediately to every destination**, with no asking, and
all copies kept identical — he does not want to track which version is where. After any edit,
run all four steps, in this order:

1. `git add -A && git commit && git push origin main`
2. The push triggers `.github/workflows/refresh.yml`, which redeploys GitHub Pages in ~25s
3. `bash scripts/sync-artifact.sh` — waits for the deploy, then downloads the **live** page
   into `dist/dashboard.html`. It refuses to mirror a failed deploy or an empty page.
4. Republish the Artifact from `dist/dashboard.html`, passing the existing artifact URL so the
   link is preserved.

Order matters: the Artifact goes **last**. Publishing it before the deploy settles mirrors the
previous version. Mirroring from the live page rather than a local build is deliberate — the
Actions runner does its own data fetch, so a local build would differ by whatever price did in
between.

Then **verify the live URL** — load it and confirm the change is really there. A green workflow
is not evidence the page changed.

Two differences that republishing cannot fix, both properties of the Artifact platform:

1. **The Artifact viewer blocks outbound requests**, so it shows the daily snapshot and reads
   "Snapshot", while Pages polls Binance and reads "Live". Same file, different sandbox.
2. **Anyone Ivan shared the Artifact link with sees a pinned earlier version**, not the latest
   republish. Only Ivan can move that pin, in the artifact's own version UI. So the Artifact
   link cannot be kept in sync for other people by anything done from here.

Consequence: **the Cloudflare URL is the only link to share.** Keep republishing the Artifact
as instructed, but never describe it as current for anyone but Ivan.

Expect heavy iteration on metrics, data sources and design. Which file to touch:

| To change… | Edit |
|---|---|
| Colours, type, layout, spacing, anything visual | `page/template.html` (tokens at the top) |
| Interpretation text, band thresholds, cycle-score components | `lib/metrics.ts` (`BANDS`, `cycleScore`) |
| Which metrics get fetched, what lands in the payload | `scripts/ingest.ts` + `lib/sources/coinmetrics.ts` |
| Swap or add a data vendor | a file in `lib/sources/` — nothing else should need touching |
| Live-tier endpoints and poll interval | `page/template.html` (`pullBinance`, `POLL_MS`) |

The Artifact link (`claude.ai/code/artifact/351c3c67…`) does **not** auto-update. It only
changes on an explicit republish, so it drifts. Cloudflare is canonical.

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
