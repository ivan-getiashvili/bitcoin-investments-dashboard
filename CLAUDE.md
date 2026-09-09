# BTC Investor Dashboard

A Bitcoin on-chain + market dashboard, intended to become a paid subscription product.
Owner: Ivan. Beginner at web dev — explain concepts when introducing them, don't just emit code.

## Current stage

M1 — single-file prototype (`index.html`). Next: M2 (data layer + adapters), M3 (Next.js on Vercel).
Full plan: `docs/PLAN.md`.

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
