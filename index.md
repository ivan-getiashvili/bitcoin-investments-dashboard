# BTC Metrics

> Plain-text edition of https://btcmetrics.online/ — the same page, generated from the same data in the same build, for readers that do not render JavaScript. Snapshot built 2026-09-26 06:16 UTC; on-chain data as of 2026-09-25. Price here is that day's close (UTC). In a browser the page also updates price, funding and open interest live; this file does not. Structured version: https://btcmetrics.online/summary.json

Bitcoin · on-chain and market metrics

On-chain data as of 2026-09-25 · those metrics settle once a day

## Where the cycle stands today

5 independent measurements, each rescaled to 0–100 points and averaged. They do not all agree, so each one's own verdict is shown below. Open the **ℹ** for the arithmetic.

**Cycle position:** 48 — Mid-cycle — 48th percentile of 5,548 days · raw average 37.7 from 5 signals

**Bitcoin:** $84,062 — -0.4% 24h · daily close, 2026-09-25 UTC

Scale, low to high: Deep value → Accumulation → Mid-cycle → Heating → Overheated

Position is this reading's rank against every day since 2011, not the raw average.

| Signal | Reading today | Points (0-100) | Its own verdict |
| --- | --- | --- | --- |
| Mayer Multiple | 1.19 | 29 | Accumulation |
| MVRV Z-score | 0.99 | 14 | Deep value |
| Fear & Greed | 74 | 74 | Heating up |
| Funding rate | 0.17 bp | 20 | Deep value |
| Miner commitment | 1.29% | 52 | Mid-cycle |

The signals are spread across 4 different verdicts, with **Fear & Greed** furthest from the middle at 74. Mean **38** but median **29** — a gap that size means one component is dragging the average, so the rows above are more informative than the headline.

### How the signals become one number

Each signal is a different kind of measurement — a ratio, a multiple, an index — so they cannot be added up as they stand. Each is rescaled onto a common 0–100 points scale and those point values are averaged. No weighting, no model, nothing fitted.

**The average is not the headline.** Signals rarely peak together, so averaging them pulls the result toward the middle: backtested, this average read 66.7 at the 2013 top, 66.7 at the 2017 top and 63.4 at the 2021 top, and never once crossed 80. Meanwhile 74% of all days sat below 40. A fixed scale on this number is simply miscalibrated. So the headline reports where today's average ranks against every day of its own history, and on that basis all three cycle tops land in the 90th percentile, where they belong.

The limitation, stated rather than hidden: the early years had fewer inputs to average — Fear & Greed starts in 2018 and funding only from 2026-06 — so a 2013 reading and a 2026 reading are not built from identical evidence. The signal count is shown beside the score for that reason.

| Signal | Its reading today | Reading that scores 0 pts | Reading that scores 100 pts | Points it contributes |
| --- | --- | --- | --- | --- |
| Mayer Multiple | **1.19** | 0.7 | 2.4 | 29 |
| MVRV Z-score | **0.99** | 0 | 7 | 14 |
| Fear & Greed | **74** | 0 | 100 | 74 |
| Funding rate | **0.17 bp** | -1 | 5 | 20 |
| Miner commitment | **1.29%** | -6 | 8 | 52 |
| Average of the 5 point values | 37.7 |   |   |   |

The two middle columns are the **scale**, not readings. Take the first row: Mayer Multiple reads **1.19** today; 0.7 is the reading that would score 0 points and 2.4 the reading that would score 100. Today's reading sits 29% of the way between them, so it contributes **29 points** to the average.

### What happens when the signals disagree

Nothing clever happens. Disagreement is not resolved, it is averaged — and that is precisely where a composite score can mislead, because one extreme component drags the result even when everything else agrees.

So the board above gives each signal its own verdict rather than only the total, and both the **mean** and the **median** are reported. The median ignores the outlier. When the two numbers diverge, the mean is being pulled by one component and the total deserves less weight than the individual rows.

### Where the bounds come from

Judgement calls anchored to previous cycles, not derived constants. Each high bound is roughly where that metric sat at past cycle peaks — the MVRV Z-score near 7, the Mayer Multiple near 2.4 — and each low bound roughly where it sat at cycle lows. With four cycles of history these are reference points and nothing stronger.

### What is wrong with this method

- **Equal weighting is a choice, not a finding.** Sentiment counts as much as MVRV, despite being a reading of mood rather than a balance sheet — and despite being partly derived from price itself.
- **Two of the components are correlated.** The MVRV Z-score and the Mayer Multiple both rise with price (a correlation of 0.81 over the full history). Averaging them is closer to counting one thing twice than to combining independent evidence.
- **It is descriptive, not predictive.** A low score says today resembles past accumulation phases on these measures. It implies nothing about next week, and every threshold rests on four events.

Labels, by percentile of history: below 20 deep value · 20–40 accumulation · 40–60 mid-cycle · 60–80 heating up · above 80 overheated.

## Bitcoin price, with the moving averages that define trend

Daily closes since 2011, with the moving averages most often used to judge trend and cycle position. Log scale by default — open the **ℹ** to see why that matters.

Latest on the chart: 2026-09-25 · Price **$84,062** · 50-day MA **$75,313** · 200-day MA **$70,926** · 200-week MA **$65,657** · Realized price **$53,526**

Source: daily closes from the Coin Metrics community API (CC BY-NC). Moving averages and realized price are computed from that series at ingest, not by a third party. 5,747 daily observations, 2011-01-01 to 2026-09-25.

Bitcoin price in US dollars at the close of each period, with the moving averages and realized price drawn on the chart.

| Period | Price | 50-day MA | 200-day MA | 200-week MA | Realized price |
| --- | --- | --- | --- | --- | --- |
| 2026-09-25 (latest) | $84,062 | $75,313 | $70,926 | $65,657 | $53,526 |
| 2026-08 (month end) | $78,534 | $67,561 | $69,426 | $64,550 | $53,076 |
| 2026-07 (month end) | $62,875 | $63,376 | $71,467 | $63,447 | $52,838 |
| 2026-06 (month end) | $58,525 | $68,486 | $75,361 | $62,471 | $53,070 |
| 2026-05 (month end) | $73,600 | $77,229 | $79,539 | $61,603 | $54,022 |
| 2026-04 (month end) | $76,300 | $72,201 | $84,221 | $60,353 | $54,078 |
| 2026-03 (month end) | $68,215 | $68,700 | $90,609 | $59,295 | $54,162 |
| 2026-02 (month end) | $66,966 | $78,236 | $97,387 | $58,457 | $54,552 |
| 2026-01 (month end) | $78,702 | $89,406 | $104,165 | $57,902 | $55,849 |
| 2025-12 (month end) | $87,517 | $89,839 | $107,011 | $56,831 | $56,103 |
| 2025-11 (month end) | $90,608 | $102,057 | $109,734 | $55,768 | $56,420 |
| 2025-10 (month end) | $109,554 | $114,096 | $109,491 | $54,588 | $55,906 |
| 2025-09 (month end) | $113,972 | $113,646 | $104,747 | $53,154 | $53,943 |
| 2024 (year end) | $93,390 | $96,474 | $71,535 | $42,723 | $40,946 |
| 2023 (year end) | $42,217 | $40,493 | $31,934 | $29,758 | $21,952 |
| 2022 (year end) | $16,524 | $16,778 | $19,729 | $24,385 | $19,784 |
| 2021 (year end) | $46,355 | $53,045 | $47,840 | $18,666 | $24,483 |
| 2020 (year end) | $29,023 | $20,371 | $13,390 | $7,786 | $9,240 |
| 2019 (year end) | $7,167 | $7,488 | $9,285 | $5,053 | $5,570 |
| 2018 (year end) | $3,687 | $4,076 | $5,999 | $3,211 | $4,540 |
| 2017 (year end) | $13,921 | $12,541 | $6,161 | $1,366 | $4,995 |
| 2016 (year end) | $969 | $790 | $674 | $405 | $432 |
| 2015 (year end) | $430 | $392 | $297 | $259 | $301 |
| 2014 (year end) | $321 | $356 | $457 | $190 | $320 |
| 2013 (year end) | $730 | $758 | $284 | — | $269 |
| 2012 (year end) | $14 | $13 | $11 | — | $8 |
| 2011 (year end) | $5 | $3 | $8 | — | $5 |

### Why the vertical axis is logarithmic by default

On a **linear** scale every equal vertical distance is an equal number of dollars: the gap from $10k to $20k looks the same as $70k to $80k. On a **logarithmic** scale every equal vertical distance is an equal *percentage* move, so a doubling looks the same whether it happens at $100 or $100,000.

That distinction matters more for Bitcoin than for almost any other asset, because the price has moved across five orders of magnitude. On a linear chart of the full history, everything before 2017 is a flat line pressed against the bottom — the entire 2013 cycle, a move of more than 100×, becomes invisible. Log scale makes cycles comparable to each other, which is the whole point of looking at fifteen years at once.

Use linear when you care about absolute dollars — sizing a position, reading a drawdown in money rather than percent, or zooming into a few weeks where the percentage range is small anyway. Switch with the Scale control above.

### The moving averages, and what each is for

A moving average is the mean of the last N daily closes, recalculated each day. It strips out daily noise so the underlying trend is visible. All three here are simple averages (`SMA`), equally weighting every day in the window.

- **50-day** — medium-term trend. Reacts within weeks, so it turns early but also whipsaws in choppy markets.
- **200-day** — the standard long-term trend line across all of finance. Price above it is conventionally read as a bull regime, below it as a bear regime. The **Mayer Multiple** shown further down this page is simply price divided by this line.
- **200-week** (1,400 days) — a Bitcoin-specific cycle floor. Price has spent only a handful of days below it in Bitcoin's history, all at the deepest bear-market lows. It rises almost monotonically, which is why it works as a floor rather than a signal.
- **Realized price** — not a moving average at all. It is the average price at which every coin in existence last moved on-chain: the network's aggregate cost basis. When price falls below it, the average holder is underwater.

When the 50-day crosses above the 200-day it is called a **golden cross**, and below it a **death cross**. Both are widely watched and both are lagging by construction — they confirm a move that has already happened rather than predicting one.

The honest caveat: moving averages describe the past. They are smoothing, not forecasting. They are most useful for answering "what regime are we in?" and least useful for "what happens next week?"

### Further reading

- [Glassnode Academy — Realized Price](https://academy.glassnode.com/market/mvrv/realized-price) (what cost basis means on-chain)
- [LookIntoBitcoin — 200-Week MA Heatmap](https://www.lookintobitcoin.com/charts/200-week-moving-average-heatmap/) (the cycle-floor behaviour, charted)
- [Binance Academy — Moving Averages Explained](https://academy.binance.com/en/articles/moving-averages-explained)
- [Investopedia — Moving Average](https://www.investopedia.com/terms/m/movingaverage.asp) · [Logarithmic vs. Linear Scale](https://www.investopedia.com/ask/answers/05/logvslinear.asp)
- [Glassnode — MVRV metric guide](https://docs.glassnode.com/guides-and-tutorials/metric-guides/mvrv)

## MVRV — what the market pays versus what holders paid

Market value divided by realised value — the price every coin last actually moved at. It measures how much unrealised profit the whole network is holding, which is the closest thing on-chain data has to a valuation. Switch between the raw ratio and its Z-score below; open the **ℹ** for how to read either.

Latest on the chart: 2026-09-25 · MVRV ratio **1.57**

Source: Coin Metrics community API, metric `CapMVRVCur` (CC BY-NC). The Z-score is computed here at ingest as (market value − realised value) divided by the expanding standard deviation of market value — an expanding window, not the whole sample, which is what makes older cycles comparable. 5,747 daily observations.

MVRV ratio and MVRV Z-score at the close of each period.

| Period | MVRV ratio | MVRV Z-score |
| --- | --- | --- |
| 2026-09-25 (latest) | 1.57 | 0.99 |
| 2026-08 (month end) | 1.48 | 0.83 |
| 2026-07 (month end) | 1.19 | 0.33 |
| 2026-06 (month end) | 1.10 | 0.18 |
| 2026-05 (month end) | 1.36 | 0.64 |
| 2026-04 (month end) | 1.41 | 0.73 |
| 2026-03 (month end) | 1.26 | 0.47 |
| 2026-02 (month end) | 1.23 | 0.41 |
| 2026-01 (month end) | 1.41 | 0.77 |
| 2025-12 (month end) | 1.56 | 1.06 |
| 2025-11 (month end) | 1.61 | 1.17 |
| 2025-10 (month end) | 1.96 | 1.87 |
| 2025-09 (month end) | 2.11 | 2.16 |
| 2024 (year end) | 2.28 | 2.56 |
| 2023 (year end) | 1.92 | 1.38 |
| 2022 (year end) | 0.83 | -0.23 |
| 2021 (year end) | 1.89 | 1.60 |
| 2020 (year end) | 3.14 | 4.57 |
| 2019 (year end) | 1.29 | 0.48 |
| 2018 (year end) | 0.81 | -0.29 |
| 2017 (year end) | 2.79 | 4.43 |
| 2016 (year end) | 2.24 | 2.32 |
| 2015 (year end) | 1.43 | 0.65 |
| 2014 (year end) | 1.00 | 0.00 |
| 2013 (year end) | 2.71 | 2.82 |
| 2012 (year end) | 1.80 | 1.51 |
| 2011 (year end) | 0.96 | -0.04 |

### What MVRV actually compares

There are two ways to put a value on the whole Bitcoin network, and MVRV is the ratio between them.

- **Market value** — today's price multiplied by every coin in existence. What the market says the network is worth right now.
- **Realised value** — take every coin individually, value it at the price it last moved on-chain, and add those up. Roughly what the network collectively paid for its coins: an aggregate cost basis.

MVRV is the first divided by the second. An MVRV of **2.0** means the average coin is worth twice what it last changed hands for — the network is holding 100% unrealised profit. An MVRV **below 1.0** means the average holder is underwater.

Why anyone cares: unrealised profit is the fuel for selling. When almost everyone is deep in profit there is a lot of incentive to take some, which is the condition that has historically existed near tops. When most coins are held at a loss, the sellers have largely already sold — the condition near bottoms.

### Reading the chart

The shaded zones mark levels that mattered historically. In **Ratio** view:

- **Below 1.0** (blue) — the average holder is underwater. Every such period so far has been a bear-market low.
- **1.0–1.5** — accumulation. Modest profit, no froth.
- **1.5–2.4** — mid-cycle.
- **2.4–3.7** — elevated; late-cycle territory in past bull markets.
- **Above 3.7** (red) — historically frothy. Readings here clustered near tops.

### Why there is a Z-score version

The raw ratio has a problem: its extremes have shrunk each cycle as the market matured. The 2013 peak reached 4.7, but the 2021 peak only 2.8 — so "above 3.7 means a top" quietly stopped being true.

The **Z-score** rescales the gap between market and realised value by how volatile market cap has been up to that point, which makes different eras comparable. On this data the 2013 peak scores **7.2** and the 2017 peak **8.6**, while the November 2022 low scores **−0.3**. Above roughly 7 has meant a cycle peak; below 0 has meant a cycle bottom.

Note what the Z-score chart shows about the last two cycles: each peak has been markedly lower than the one before it (8.6, then 3.4). Whether that is Bitcoin maturing or simply two data points is genuinely unsettled.

### What it cannot tell you

- **Four cycles is a tiny sample.** Every threshold on this page is a description of four events, not a law. Treat them as context, not signals.
- **Realised value counts any movement as a purchase.** When a coin moves between wallets or onto an exchange, its cost basis resets to that day's price even though nobody bought anything. Heavy on-chain activity therefore drags realised value up on its own.
- **Lost coins distort it.** Coins from the earliest years that will never move again are still valued at a few cents, holding realised value down and MVRV up. Estimates of how much supply is permanently lost vary widely, and none of them are in this number.
- **It says nothing about timing.** MVRV sat in "frothy" territory for months before the 2017 top and for weeks before the 2021 one.

### Further reading

- [Glassnode — MVRV metric guide](https://docs.glassnode.com/guides-and-tutorials/metric-guides/mvrv)
- [Glassnode — MVRV Z-Score](https://docs.glassnode.com/guides-and-tutorials/metric-guides/mvrv/mvrv-z-score)
- [Glassnode Academy — Realised Price](https://academy.glassnode.com/market/mvrv/realized-price) (the cost-basis idea underneath all of this)
- [LookIntoBitcoin — MVRV Z-Score chart](https://www.lookintobitcoin.com/charts/mvrv-zscore/) (for comparing against another implementation)
- [Coin Metrics — `CapMVRVCur`](https://docs.coinmetrics.io/asset-metrics/market/capmvrvcur) (the exact metric this page uses)

## Fear & Greed — market sentiment, 0 to 100

A daily composite of volatility, momentum, volume, social activity and dominance, published since February 2018 — the only reading here not calculated from price or the chain. The dial shows today; the chart shows how the mood got here. Open the **ℹ** for what feeds it and why it is partly circular.

Latest on the chart: 2026-09-25 · 30-day average **67**

Today the index reads **74** — **greed**. The 30-day average is **67**, which is greed territory and the more reliable read of the two. Colour runs green at the fear end and red at the greed end, matching how the rest of this page treats risk. The index's own dial colours it the other way round.

Source: alternative.me Crypto Fear & Greed Index (free, keyless). Band labels are the publisher’s own; the 30-day average is computed here at ingest. 3,155 daily readings from 2018-02-01 — the shortest history on this page.

Crypto Fear & Greed Index, 0 (extreme fear) to 100 (extreme greed), at the close of each period.

| Period | Index that day | 30-day average |
| --- | --- | --- |
| 2026-09-25 (latest) | 71 | 67 |
| 2026-08 (month end) | 62 | 46 |
| 2026-07 (month end) | 25 | 26 |
| 2026-06 (month end) | 15 | 16 |
| 2026-05 (month end) | 28 | 35 |
| 2026-04 (month end) | 29 | 23 |
| 2026-03 (month end) | 11 | 14 |
| 2026-02 (month end) | 11 | 11 |
| 2026-01 (month end) | 20 | 32 |
| 2025-12 (month end) | 21 | 22 |
| 2025-11 (month end) | 28 | 21 |
| 2025-10 (month end) | 29 | 44 |
| 2025-09 (month end) | 50 | 48 |
| 2024 (year end) | 64 | 76 |
| 2023 (year end) | 67 | 71 |
| 2022 (year end) | 25 | 27 |
| 2021 (year end) | 28 | 29 |
| 2020 (year end) | 95 | 92 |
| 2019 (year end) | 38 | 27 |
| 2018 (year end) | 26 | 20 |

### What the number is

A single score from 0 to 100 meant to capture how the crypto market is feeling. Low is fearful, high is greedy. The publisher labels the ranges, and those labels are what the shaded zones on the chart use — they are not thresholds we invented:

- **0–25** Extreme fear · **26–46** Fear · **47–54** Neutral · **55–75** Greed · **76–100** Extreme greed

It is built from a weighted mix of inputs the publisher describes as volatility, market momentum and trading volume, social media activity, Bitcoin's share of total crypto market cap, and search trends. The exact weights are the publisher's and are not independently verifiable.

### How it is meant to be used

As a **contrarian** gauge. The idea, which the publisher states outright, is that extreme fear tends to appear when an asset is oversold and people are selling irrationally, and extreme greed when a correction is overdue.

Historically the extremes have been the informative part: readings at or below 25 have clustered around local and cycle lows, and readings at or above 76 around local tops. The middle of the range says very little.

Turn on the 30-day average. The raw index can swing fifteen points in a week, and single-day readings are mostly noise — the regime is what matters, not the tick.

### What it cannot tell you

- **It is partly circular.** Volatility and momentum are price-derived inputs, so a large part of "sentiment is fearful" is really "price fell". It is not an independent signal in the way an on-chain metric is.
- **It has no timing precision.** The index sat in extreme greed for weeks before some tops and only days before others. It can stay pinned at an extreme far longer than a position can be held against it.
- **The methodology is undisclosed and has changed.** Weights have been adjusted over the index's life, so a 2018 reading of 80 is not strictly the same measurement as a 2026 one.
- **Social inputs can be gamed.** Any index reading public posting activity is exposed to coordinated posting and bots.
- **Short history.** It begins in February 2018, so it has seen one complete cycle and parts of two others — less history than anything else on this page.

### Further reading

- [alternative.me — the index itself](https://alternative.me/crypto/fear-and-greed-index/) (the publisher, including its own description of the inputs)
- [Binance Academy — What Is the Crypto Fear & Greed Index?](https://academy.binance.com/en/articles/what-is-the-crypto-fear-and-greed-index)
- [Investopedia — Fear and Greed Index](https://www.investopedia.com/terms/f/fear-and-greed-index.asp) (the original equities version the crypto one is modelled on)

## Leverage — what traders are paying to hold a position

The funding rate is the fee perpetual-futures traders pay each other every eight hours. It is the cleanest read on whether the crowd is leaning long or short, and how dearly it is paying to do so. Open the **ℹ** for how to size the number.

Latest on the chart: 2026-09-25 · 30-day average **0.55 bp**

**Funding now · OKX:** **0.17 bp** ≈ **2% a year** to hold the crowded side. Near the exchange baseline — quiet. — **Open interest · OKX:** **$2.39B** **0.14%** of Bitcoin's market value sits in open perpetual positions on this one exchange.

Source: OKX perpetual swap (BTC-USDT-SWAP), public API, 96 days, recorded when this page was built. Binance, the larger venue, refuses requests from build servers; a browser that can reach it loads its longer history and this chart switches over. Across 276 settlements the two venues differed by 0.26 bp on average and never by more than 1 bp. Funding is the mean of the three daily settlements, in basis points. Open interest has no long history at either exchange, so only its current value is shown.

Perpetual funding rate on OKX, in basis points per 8-hour settlement, at the close of each period.

| Period | Daily mean | 7-day average | 30-day average |
| --- | --- | --- | --- |
| 2026-09-25 (latest) | 0.34 bp | 0.63 bp | 0.55 bp |
| 2026-08 (month end) | 0.74 bp | 0.62 bp | 0.63 bp |
| 2026-07 (month end) | 0.77 bp | 0.44 bp | 0.47 bp |
| 2026-06 (month end) | 0.67 bp | 0.31 bp | — |

### What the funding rate actually is

A perpetual future never expires, so nothing naturally drags its price back to spot. The funding rate does that job: every eight hours, whichever side is crowded pays the other. When the perpetual trades above spot, **longs pay shorts**. When it trades below, **shorts pay longs**.

So the sign tells you which side is crowded, and the size tells you how much that crowd is willing to pay to stay there.

### How big is big? Annualise it

The chart is in **basis points per settlement**, where 1 bp = 0.01%. That sounds like nothing until you remember it is charged three times a day:

- `1 bp × 3 × 365 ≈ **11% per year**`
- 3 bp ≈ 33% per year · 5 bp ≈ **55% per year** · 7 bp ≈ 77% per year

At 5 bp a leveraged long is paying more than half its position value annually just to keep the trade open. That is why sustained high funding rarely lasts: it is expensive, and the positions paying it are the ones that get liquidated first when price dips.

### The scale, and what each level has meant

- **Below 0** — shorts are paying longs. The crowd is positioned bearish. Historically clustered around local lows, because a market where everyone is already short has few sellers left.
- **0 to 1 bp** — quiet. 0.01% (1 bp) is the exchange's own baseline rate, so this is as close to neutral as the market gets.
- **1 to 3 bp** — a normal, healthy uptrend. Longs pay a modest premium.
- **3 to 5 bp** — crowded. 33–55% annualised is a real cost and signals eager, leveraged buying.
- **Above 5 bp** — very crowded. Historically the zone that precedes long squeezes, where a modest price fall liquidates leveraged positions and accelerates the move.

For scale, over the 96 days on record here funding has ranged from **-0.53 bp** to **1.00 bp** (roughly -6% to 11% a year).

### Open interest, and why it has no history here

Open interest is the total value of futures positions currently open — how much money is in the game, as distinct from which way it is leaning. Rising open interest with rising price means new leveraged money entering; rising open interest with flat price means fragility building; a sharp fall usually means positions were liquidated.

The exchange only retains about 30 days of it, so this page shows the current value and a short window rather than years. That is a limit of the free source, not an omission.

### What it cannot tell you

- **One venue only.** This is **OKX**'s BTC perpetual contract. A single venue is not the whole market, and positioning elsewhere — other exchanges, DEXs — is invisible here.
- **Extremes persist.** Funding can stay crowded for weeks. It describes positioning, not timing.
- **It is a fast signal in a slow dashboard.** Everything else here moves over months; funding can flip within a day.

### Further reading

- [Binance — how perpetual funding rates are calculated](https://www.binance.com/en/support/faq/detail/360033525031)
- [Binance Academy — perpetual futures explained](https://academy.binance.com/en/articles/what-are-perpetual-futures-contracts)
- [Investopedia — Open Interest](https://www.investopedia.com/terms/o/openinterest.asp)

## Network health — miner commitment and coins ready to sell

Two measures of what participants are doing rather than saying: how much computing power miners are willing to run, and how much supply is sitting on exchanges where it could be sold today. Miner behaviour feeds the cycle score; exchange balances are context. Open the **ℹ** for why it is that way round.

Latest on the chart: 2026-09-25 · 30-day mean **931 EH/s** · 60-day mean **919 EH/s**

**Hashrate:** **884 EH/s** The 30-day average sits **above** the 60-day: miners are still adding capacity. — **Coins on exchanges:** **13.37%** of all mined bitcoin. The peak on record was **17.17%** in 2020-03, so today sits well below that mark.

Source: Coin Metrics community API — `HashRate` and `SplyExNtv` (CC BY-NC). The 30- and 60-day means and the exchange share of circulating supply are computed here at ingest. 5,747 days of hashrate, 5,634 days of exchange balances.

Hashrate means in exahashes per second, the spread between them that feeds the score, and the share of mined bitcoin held on exchanges.

| Period | Hashrate 30-day mean | Hashrate 60-day mean | 30-day vs 60-day | Coins on exchanges |
| --- | --- | --- | --- | --- |
| 2026-09-25 (latest) | 931 EH/s | 919 EH/s | +1.29% | 13.37% |
| 2026-08 (month end) | 905 EH/s | 904 EH/s | +0.12% | 13.47% |
| 2026-07 (month end) | 898 EH/s | 910 EH/s | -1.35% | 13.28% |
| 2026-06 (month end) | 922 EH/s | 953 EH/s | -3.33% | 13.23% |
| 2026-05 (month end) | 985 EH/s | 971 EH/s | +1.41% | 13.13% |
| 2026-04 (month end) | 958 EH/s | 968 EH/s | -1.02% | 12.88% |
| 2026-03 (month end) | 978 EH/s | 997 EH/s | -1.93% | 13.07% |
| 2026-02 (month end) | 1012 EH/s | 997 EH/s | +1.42% | 13.43% |
| 2026-01 (month end) | 977 EH/s | 1016 EH/s | -3.92% | 13.46% |
| 2025-12 (month end) | 1051 EH/s | 1065 EH/s | -1.31% | 13.39% |
| 2025-11 (month end) | 1081 EH/s | 1083 EH/s | -0.17% | 13.56% |
| 2025-10 (month end) | 1085 EH/s | 1061 EH/s | +2.30% | 13.52% |
| 2025-09 (month end) | 1035 EH/s | 992 EH/s | +4.32% | 13.74% |
| 2024 (year end) | 778 EH/s | 756 EH/s | +2.91% | 14.87% |
| 2023 (year end) | 505 EH/s | 491 EH/s | +2.90% | 14.80% |
| 2022 (year end) | 247 EH/s | 252 EH/s | -1.69% | 14.55% |
| 2021 (year end) | 174 EH/s | 167 EH/s | +3.96% | 16.21% |
| 2020 (year end) | 136 EH/s | 133 EH/s | +2.46% | 14.89% |
| 2019 (year end) | 96 EH/s | 94 EH/s | +2.13% | 16.34% |
| 2018 (year end) | 38 EH/s | 41 EH/s | -7.09% | 14.79% |
| 2017 (year end) | 13 EH/s | 12 EH/s | +13.98% | 11.68% |
| 2016 (year end) | 2 EH/s | 2 EH/s | +6.33% | 9.45% |
| 2015 (year end) | 1 EH/s | 1 EH/s | +14.21% | 9.80% |
| 2014 (year end) | 0 EH/s | 0 EH/s | +0.08% | 10.48% |
| 2013 (year end) | 0 EH/s | 0 EH/s | +28.43% | 5.40% |
| 2012 (year end) | 0 EH/s | 0 EH/s | -5.68% | 0.66% |
| 2011 (year end) | 0 EH/s | 0 EH/s | +0.37% | 0.26% |

### Hashrate: the number itself is meaningless

Hashrate is how many guesses per second the whole network makes while mining, measured in exahashes — and one exahash is a quintillion guesses. Nobody has intuition for “1,020 EH/s”, and nobody needs it. **The level tells you nothing; the direction tells you a lot.**

Mining costs real money in hardware and electricity. Miners only add machines if they expect the coins to be worth more than the power. So a rising hashrate is capital being committed by the people closest to the economics — revealed preference rather than opinion.

### How to read it: the 30 and 60-day averages

That is what the two averages on the chart are for. When the **30-day average falls below the 60-day**, hashrate is dropping rather than merely wobbling: machines are being switched off because they no longer cover their power bill. This is usually called miner capitulation, and historically those crossings clustered near price lows — the point where the least efficient sellers have already been forced out.

The reverse crossing, 30-day back above 60-day, has tended to mark the recovery.

The honest caveat: hashrate *follows* price. Miners buy machines after profitable periods and switch off after unprofitable ones, so this lags by weeks to months. It confirms; it does not predict.

### Coins on exchanges: what the percentage means

Today **13.37%** of all mined bitcoin sits in exchange wallets. On its own that figure means little — what gives it meaning is its own history: it peaked at **17.17%** in 2020-03 and has fallen fairly steadily since. So the answer to “is 13.4% a lot?” is: it is near the low end of the last several years, meaning less supply is sitting somewhere it can be sold immediately than at almost any point since 2020.

Why it matters: a coin sitting in an exchange wallet can be sold in one click. A coin in self-custody generally cannot — it has to be moved first, which takes a deliberate act. So the share of supply held on exchanges is a rough measure of **how much supply is positioned to sell**.

A falling line means coins moving off exchanges into private storage, which is usually read as accumulation. A rising line means coins moving toward the place people sell them. Direction matters far more than level.

- **Exchange wallets are identified by heuristics**, not by declaration. Labelling is imperfect and providers disagree with each other.
- **Custodians and ETFs blur it.** Coins held for a spot ETF are not on an exchange but are not self-custodied by an individual either.
- **Large moves can be internal.** An exchange reshuffling its own wallets can look like a flow that never happened.

### Which of these counts toward the score, and why

**Miner commitment does.** The score uses the ribbon spread — the 30-day mean hashrate against the 60-day, as a percentage. Tested against known turning points it read **+11.1%** at the 2017 top, **−12.4%** at the December 2018 low and **+4.5%** at the 2021 top: right on direction at three of six, and strongest exactly where it matters, in the negative tail. It missed the 2020 and 2022 lows, which registered mildly positive.

So it is weaker than the valuation measures, and it is in anyway, for a specific reason: it is the most independent input on the page — a correlation of 0.10 with the MVRV Z-score and 0.17 with the Mayer Multiple. Nearly everything else here is a restatement of where price sits relative to its own history. A noisy signal that measures something genuinely different is worth more in an average than a fourth clean restatement of the same thing.

Adding it visibly improved the calibration: with four signals the November 2022 bear-market low ranked in the 38th percentile and read “accumulation”. With miner behaviour included it ranks 12th and reads “deep value”, which is what that day actually was.

**Coins on exchanges does not**, and it was tried. Scored on its level it called the 2013 and 2017 tops maximally cheap and the March 2020 crash low maximally hot, because the share carries a secular trend — exchanges grew from nothing to 17% of supply, then shrank as self-custody and ETFs took over — and a fixed band measures that trend rather than the cycle. Scored on its 90-day change it was right at two tops and wrong at three lows and the 2021 top. Being uncorrelated is not the same as being informative, and a component that is wrong more often than right does not earn a vote. It stays here as context, where direction over time is readable and no false precision is claimed.

### Further reading

- [Glassnode Academy — exchange balances](https://academy.glassnode.com/supply/exchange-balances)
- [mempool.space — hashrate and difficulty, charted](https://mempool.space/graphs/mining/hashrate-difficulty)
- [Binance Academy — what mining actually is](https://academy.binance.com/en/articles/what-is-bitcoin-mining)

**Information only — not investment advice.** Metrics are heuristics drawn from historical patterns; Bitcoin has had four cycles, which is a small sample. The cycle score is a plain average of the normalized components shown above, not a model. Sources: Coin Metrics community API (CC BY-NC — non-commercial) · alternative.me Fear & Greed Index (free) · OKX public API (funding and open interest recorded at build time) · Binance public API (live price, funding and open interest, fetched by the browser) Realized cap derived as market cap ÷ MVRV. On-chain snapshot generated 2026-09-26 06:16 UTC. Figures marked with a daily-close reference are intraday estimates: realized cap and the moving averages are held at their last close while price updates live. For software and AI assistants: [llms.txt](https://btcmetrics.online/llms.txt) · [this whole page as plain text](https://btcmetrics.online/index.md) · [today's readings as JSON](https://btcmetrics.online/summary.json)
