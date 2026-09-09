# BTC Investor Dashboard — Build & Learning Plan

## Context

Ivan wants a Bitcoin investor dashboard: on-chain and market metrics (MVRV, price action, and a set we choose together), presented as an interactive website he can eventually **sell access to**. He is a total beginner at web development and wants to learn to build it *with Claude Code* — so this plan is a curriculum as much as a build spec. Budget starts at **$0**, moving to paid data only once the product earns.

Two findings from research shape everything below:

1. **MVRV and ~30 other BTC metrics are free today.** Verified live against the Coin Metrics community API: BTC `CapMVRVCur` = 1.4749 (2026-09-08), plus market cap, supply, exchange flows, exchange balance, hashrate, active addresses. Funding rate and open interest are free from Binance's public futures API; Fear & Greed from alternative.me; hashrate/difficulty from mempool.space. All four endpoints tested and returning data.
2. **Free ≠ sellable.** Coin Metrics community data is CC BY-**NC** (non-commercial). CoinGecko's free tier excludes a commercial license; CoinMarketCap's Basic tier is personal-use only. The moment money changes hands, the data sources must be swapped for licensed ones. This is a solved problem — but only if the code is structured for it from day one (see Adapter Rule below).

**Intended outcome:** a live, public URL showing a working BTC dashboard within the first few sessions, built on free data, structured so that adding accounts, payments, and licensed data later is a swap rather than a rewrite.

---

## Product shape

A single-page dashboard answering two questions an investor actually has:

- **Where are we in the cycle?** (valuation vs. the network's cost basis)
- **How leveraged and how emotional is the market right now?** (derivatives + sentiment)

Every tile shows the number, a sparkline, and a plain-English state ("MVRV 1.47 — mid-cycle, above cost basis, historically not frothy"). Raw numbers are commoditized and available free on a dozen sites; **the interpretation layer and the composite score are the product**. That is the honest commercial read, and it drives the design.

---

## Metrics — v1 (all free and verified)

**Cycle position** — the core of the product
| Metric | Source | Reads as |
|---|---|---|
| MVRV ratio | `CapMVRVCur`, Coin Metrics | Market cap ÷ cost basis. >3.7 historically frothy, <1 = underwater |
| MVRV Z-Score | derived: (MC − RC) / σ(MC) | Classic cycle top/bottom oscillator |
| Realized price | derived: RC ÷ supply | What the average coin last moved at |
| Mayer Multiple | derived: price ÷ 200DMA | Simple over/under-extension |
| 200-week MA + distance | derived from price history | Historical cycle floor |
| Drawdown from ATH | derived | Where we sit vs. the peak |
| Pi Cycle Top | derived: 111DMA vs 2×350DMA | Well-known top-timing signal |

**Flows & network**
| Metric | Source |
|---|---|
| Exchange balance | `SplyExNtv` / `SplyExUSD`, Coin Metrics |
| Exchange net flow | `FlowInExUSD` − `FlowOutExUSD`, Coin Metrics |
| Active addresses | `AdrActCnt`, Coin Metrics |
| Hashrate & difficulty | Coin Metrics `HashRate` + mempool.space |

**Leverage & sentiment**
| Metric | Source |
|---|---|
| Perp funding rate | Binance `fapi/v1/fundingRate` (free) |
| Open interest + OI/market-cap | Binance `futures/data/openInterestHist` (free) |
| Fear & Greed Index | alternative.me (free) |
| Realized volatility 30d | derived from price |
| Returns 24h/7d/30d/1y | `ROI30d`, `ROI1yr` + derived |

**Composite Cycle Score (0–100)** — normalize MVRV Z, Mayer, 200W distance, funding, and F&G into one headline number. This is the tile people screenshot and the reason they subscribe.

**Deferred to "when it earns"** (these need paid data — BGeometrics ~cheap, CryptoQuant, or Glassnode Pro): SOPR / STH-SOPR, NUPL, LTH vs STH MVRV, HODL waves, Puell Multiple, hash ribbons, ETF net flows, liquidation heatmaps.

---

## Architecture

**The one rule that matters:** never call a third-party API from the browser. Keys leak, rate limits die under real traffic, and you can't cache. Instead:

```
scheduled job  →  your stored data  →  your API  →  your UI
(once a day)      (JSON, then DB)     (Next.js)    (charts)
```

**Phase A storage — a JSON file in the repo.** BTC-only daily metrics is roughly 6,000 rows: a file, not a database. A GitHub Action runs the ingest script daily and commits the result. No DB to learn, no server to pay for, instant page loads. This is a deliberate beginner simplification, not a shortcut we'll regret — Phase B swaps it for Postgres when accounts arrive.

**The Adapter Rule.** Every source lives behind one small module in `lib/sources/` exposing a fixed shape (`getMVRV(): {date, value}[]`). The dashboard never knows where a number came from. Swapping Coin Metrics for a licensed provider before launch becomes a one-file change instead of a rewrite. This single decision is what makes the "$0 now, pay when it earns" path work.

**Stack:** Next.js + TypeScript, deployed on Vercel (free tier, built-in cron), charts via Recharts, data ingest in TypeScript so there's only one language to learn. Supabase Postgres + auth arrive in Phase B.

---

## Milestones

Each milestone is one working session, ends with something visibly working, and teaches specific Claude Code skills.

**M0 — Real project, safety net.** Move out of the throwaway scratch workspace into a permanent folder (I'll call `request_directory` so you pick it). Install Node, `git init`, write `CLAUDE.md`.
*You learn:* why the project folder matters, git as an undo button, what `CLAUDE.md` does for every future session.

**M1 — One chart, in your browser, in an hour.** A single HTML file pulling live BTC price and MVRV, rendered as a chart, opened in the Browser pane.
*You learn:* the edit → run → look → fix loop; reading an error back to me instead of guessing.

**M2 — The data layer.** Ingest script hits all four verified sources, normalizes them, writes `data/btc.json`; derived metrics (Z-score, Mayer, 200W, Pi Cycle) computed here, not in the UI. Sources go behind adapters.
*You learn:* ingest/store/serve, `.env.local` and never committing secrets, why derived-once beats derived-on-every-page-load.

**M3 — Real app, public URL.** Next.js dashboard with tiles, sparklines, and the interpretation strings. Deployed to Vercel. **You get a link you can send someone.**
*You learn:* deployment, env vars in production vs. local, `/code-review`.

**M4 — It updates itself.** GitHub Action on a daily cron. Graceful handling when a source is down — stale data labeled as stale, never silently wrong.
*You learn:* scheduled jobs, failure modes, why a dashboard that lies quietly is worse than one that admits it's stale.

**M5 — The product layer.** Composite Cycle Score, historical bands, plain-English state per metric, mobile layout.
*You learn:* turning data into a product; where the actual value sits.

**M6 — Accounts and paywall.** Supabase auth + Postgres, free vs. paid tiers, payments. Paid-tier data moves behind an authenticated API route (a static JSON anyone can curl is fine for a free beta, not for a paid tier).
*You learn:* auth, webhooks, `/security-review` before real money touches the code.

**M7 — Launch reality.** Swap CC BY-NC sources for licensed ones. Disclaimer ("information, not investment advice"), terms of service, analytics, email alerts as the retention hook.

---

## Claude Code curriculum (woven through the milestones)

- **Plan mode** (shift+tab) — what we just did. Use it for anything bigger than a one-line change.
- **`CLAUDE.md`** — project conventions that load into every session automatically.
- **Git as the undo button** — commit before each change; "revert that" beats re-explaining.
- **Context hygiene** — `/clear` between unrelated tasks; one goal per session.
- **Verification over trust** — I run the dev server and check the page myself; you don't debug on my behalf.
- **Secrets** — `.env.local`, `.gitignore`, and why a key in the browser bundle is public.
- **`/code-review`** after each milestone, **`/security-review`** before payments go live.
- **Scheduled tasks** for the daily ingest.
- **Subagents** for wide searches once the codebase outgrows one head.

---

## Commercial reality (flagged now, acted on at M7)

- **Data licensing:** Coin Metrics community is non-commercial. Before charging, swap to a licensed source — CoinGecko Analyst (~$129/mo, commercial license), CoinPaprika (free tier permits commercial use), BGeometrics/bitcoin-data.com for on-chain, CoinGlass Hobbyist ($29/mo) for derivatives. Budget ~$50–160/mo at launch. The adapter layer makes this a config change.
- **Payments:** you deferred this. For a solo operator selling subscriptions internationally, a merchant of record (Paddle, Lemon Squeezy, Whop) handles VAT/sales tax for you at a higher fee; Stripe gives more control but leaves tax on you. Decide at M6, not now.
- **Disclaimers:** a paid financial-information product needs a visible "not investment advice" disclaimer and terms of service. Non-negotiable, cheap to add, painful to retrofit.

---

## Verification

- **M1–M3:** I run the dev server and inspect the rendered page in the Browser pane — checking that MVRV matches the API response directly, not just that the page renders.
- **Data correctness:** spot-check derived metrics against known references (MVRV Z-score and Mayer Multiple are published free on several sites; the numbers should line up).
- **M4:** trigger the Action manually, confirm the committed JSON changes and the live site reflects it.
- **M6:** `/security-review`, plus manual tests — logged out, free tier, paid tier — confirming paid data is genuinely unreachable without a subscription.

---

## First session

After approval: pick the project folder, set up git + `CLAUDE.md`, then go straight to M1 — a live BTC price and MVRV chart in your browser before the session ends.
