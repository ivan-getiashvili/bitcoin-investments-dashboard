# BTC Investor Dashboard

A Bitcoin on-chain + market dashboard, intended to become a paid subscription product.
Owner: Ivan. Beginner at web dev — explain concepts when introducing them, don't just emit code.

## Current stage

**Live URLs**

- GitHub repo: https://github.com/ivan-getiashvili/bitcoin-investments-dashboard
- **Primary (custom domain): https://btcmetrics.online/** — registered at Cloudflare
  Registrar 2026-09-11, attached to the Worker via `routes` in `wrangler.jsonc`
- Cloudflare workers.dev fallback: https://cyclebasis.ivan-getiashvili.workers.dev/
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
- The scheduled run also appends the day's reading to `records/daily-readings.csv` and pushes
  it to `main`. **That commit is what makes Cloudflare rebuild each morning** — Cloudflare only
  builds on a push, so without it btcmetrics.online served data as old as the last code change.
  Consequence: `main` moves every day without you. Always `git pull --rebase origin main`
  before pushing.
- Two refresh tiers: on-chain daily (vendor publishes `1d` only — confirmed against the
  catalog), price/funding/open-interest live in the browser every 15s from Binance

Full plan: `docs/PLAN.md`.

`index.html` is the superseded M1 prototype, kept only as a teaching reference.

## Publishing — standing instruction

Ivan expects **every change published immediately to every destination**, with no asking, and
all copies kept identical — he does not want to track which version is where. After any edit,
run all four steps, in this order:

1. `git add -A && git commit && git pull --rebase origin main && git push origin main`
   (the pull matters: a bot commits the daily reading to `main` every morning)
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

Consequence: **https://btcmetrics.online/ is the only link to share.** Keep republishing the Artifact
as instructed, but never describe it as current for anyone but Ivan.

## Readable without JavaScript — a hard requirement

Ivan will list this site on platforms where an AI reads the link before a person does. The
published HTML must therefore contain every reading, explanation and caveat as plain text,
with no script needed. How that is kept true:

- `scripts/prerender.ts` runs the page's own script in jsdom at build time (network off) and
  publishes the DOM it produced. One renderer, so the static text cannot drift from the live
  page. It also writes `summary.json`, `index.md` / `llms-full.txt` (the whole page as
  Markdown) and `llms.txt`, all read out of that same rendered page.
- `scripts/assemble.ts` adds JSON-LD, `robots.txt` (AI agents named and allowed),
  `sitemap.xml` and a real `404.html`; `wrangler.jsonc` uses `not_found_handling: "404-page"`.
- `scripts/verify-site.ts` is the last step of `npm run build:site`. It parses `_site/` with
  scripts disabled and fails the build if a reading is missing from the HTML or the text
  editions disagree with the page.
- Explainer panels collapse with the class `collapsed`, **never the `hidden` attribute** —
  text extractors drop `hidden` elements, and the explainers are most of the content.
- Anything new that shows a number must render from baked data on first paint (so prerender
  captures it) and, if it is a chart, get a `tableFor(...)` entry in `renderTables()`.
- Test the production shape locally: `BLOCK_HOSTS=fapi.binance.com,api.binance.com npm run
  build:site` makes Binance fail the way it does on every CI/CDN builder (HTTP 451), which
  exercises the OKX fallback in `lib/sources/okx.ts`.

Expect heavy iteration on metrics, data sources and design. Which file to touch:

| To change… | Edit |
|---|---|
| Colours, type, layout, spacing, anything visual | `page/template.html` (tokens at the top) |
| Interpretation text, band thresholds, cycle-score components | `lib/metrics.ts` (`BANDS`, `cycleScore`) |
| Which metrics get fetched, what lands in the payload | `scripts/ingest.ts` + `lib/sources/coinmetrics.ts` |
| Swap or add a data vendor | a file in `lib/sources/` — nothing else should need touching |
| Live-tier endpoints and poll interval | `page/template.html` (`pullBinance`, `POLL_MS`) |

The Artifact link (`claude.ai/code/artifact/351c3c67…`) does **not** auto-update. It only
changes on an explicit republish, so it drifts. btcmetrics.online is canonical.

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
| Binance public API | live price, funding, open interest — **browser only**; returns HTTP 451 to CI/CDN builders | check ToS before commercial redistribution |
| OKX public API | funding + open interest at build time (what the static HTML and the score's fifth signal use in production) | check ToS before commercial redistribution |
| alternative.me | Fear & Greed index | free |
| mempool.space | fetched into `latest`, not shown anywhere on the page | free |

Realized cap is **not** free — derive it: `realizedCap = marketCap / MVRV`,
`realizedPrice = realizedCap / supply`.

## Conventions

- TypeScript over JavaScript from M2 onward.
- Commit before each meaningful change, so "revert that" is always available.
- Run `/code-review` at the end of each milestone; `/security-review` before payments ship.
