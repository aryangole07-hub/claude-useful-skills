---
name: marketml
description: Quant-researcher method for building, tuning and honestly evaluating machine-learning stock-ranking / stock-picking models (factor models, ridge/GBM rankers, model blends, "picks" lists). Use whenever the task is to train a market model, optimise it for an objective (hit rate in the top or bottom 10%, CAGR, Sharpe), compare models or variants, backtest a top-N portfolio, do a train/test or walk-forward split, explain why a model won or lost in a period, or report accuracy / CAGR / drawdown tables.
---

# marketml

Ask first, every time: **how would a careful quant researcher whose own money is on the line do this?** Then work that way.

> The goal is not a good-looking backtest. It is a number you would still believe after the market has had its say.

A backtest is evidence only if the decisions behind it were made without seeing the test. Everything below protects that.

## Operating procedure

1. **Pin the question.** What exactly is predicted (e.g. 63-day forward return rank)? Over which universe (all stocks vs the liquid top-N that can actually be traded)? With what objective? Write these down before training.
2. **Fix the split before looking at results.** Train on the older years and test on the most recent ones (e.g. train 2001-2020, test 2021-2025). State the split in the code's docstring with the date it was fixed. Never move it after seeing test numbers.
3. **Purge and embargo.** A training label must END before the test starts. With a 63-day label, drop the last 63 trading days of training (plus a few days of embargo). For the tuning objective, use only rebalance dates whose labels finish inside training.
4. **Tune by walk-forward inside training only.** For each inner year V, fit on data before V and predict V. Choose the hyperparameters (target, regularisation, feature emphasis) on these out-of-sample inner predictions. Then refit once at the end of training, freeze the weights, and score the test once.
5. **If the best setting sits on the edge of the grid, widen the grid** and re-select, still using training data only. Stop when the objective plateaus.
6. **Evaluate on the tradable universe** with a simple portfolio: equal-weight top-decile picks (or top 5%), monthly rebalance, realistic costs (e.g. 25 bp one-way on turnover), no leverage. Report the capacity too (median holding's daily traded value).
7. **Report per period, not just a 5-year CAGR.** For each test year (and a recent window), show return, max drawdown, median drawdown, the share of months beating the market, and top/bottom accuracy, against a median-stock (equal-weight universe) row and an index row. See references/evaluation.md.
8. **Explain wins and losses with exposures, not stories.** Measure what the picks were: size, momentum and "lottery" (recent max daily return) percentiles, and the holdings' past-12-month return. Compare against the same style quintiles' returns that year. See references/diagnostics.md.
9. **Report honestly.** Say plainly which variant the objective chose, including when it lost. Label post-hoc variants as descriptive. List the data caveats. Keep the losing tables in the write-up too.

## Hard rules

- **No cherry-picking.** If a candidate other than the objective's choice did better on the test, you may mention it, but you may not adopt it. Choosing it after seeing the test makes the test worthless.
- **Each extra variant uses up some of the test.** Every variant you look at on the same test window adds multiple-testing risk. Prefer fewer, pre-declared variants, and say how many you tried.
- **Locked holdouts stay locked.** If a period was declared a final holdout, score it once and never re-tune on it.
- **Freeze external models too.** When blending another model (a "champion"), freeze it at the start of the test, so its test-period scores come from a model trained before the test. Never use a model that was retrained during the test.
- **Validate any stitched or extended data before trusting it.** E.g. score an overlap date both ways: rank correlation should be ≥ 0.98 and top-decile overlap ≥ 95%. Rescale mismatched units, such as BSE vs NSE volume.
- **Measure drawdowns daily.** Month-end values hide falls inside a month; a 0% drawdown over a 6-month rally is a measurement error, not a result. Rebuild the daily portfolio value: holdings bought at the entry close, drifting until the next rebalance, with costs at each rebalance. Check that the daily values compound to the monthly returns.
- **Align benchmark periods with portfolio periods** (same entry/exit closes). Never compare a model year against a benchmark missing its last month.
- **A pick must be buyable.** Results driven by microcaps (median holding < Rs 1 cr/day or similar) are not tradable results. Report the liquid universe as the headline.
- **Point-in-time data only.** Fundamentals as published at that date, universe membership as of that date. State survivorship bias whenever delisted companies are missing; it flatters small-cap and boom-year results most.

## Objective choice matters more than the learner

What you optimise is the model's personality:

| Objective | What it tends to learn | Typical failure |
|---|---|---|
| Rank IC / forward-return rank | broad, steady factor tilts | middling top-decile returns |
| Top-10% hit rate ("picks landing in the top 10%") | small, volatile, extreme recent gainers (lottery tickets) | high hit rate but deep drawdowns; loses when small-cap froth comes out; its bottom decile is not losers |
| Bottom-10% hit rate | high-volatility, illiquid names as predicted losers | its bottom names are volatile, not necessarily the worst on average return |
| CAGR / Sharpe of the top decile | whatever won in training regimes | overfits regime mix |

So always report top AND bottom accuracy, the average excess return of the picks, and drawdowns, whatever the objective was. A model that wins on its own metric can lose on everything else.

## Accuracy definitions (always state them)

- **Top 10% accuracy**: of the model's top-decile picks on a date, the share whose realised forward return ranks in the top decile of the same universe. Random = 10%.
- **Top 5% / bottom 10% / bottom 5%**: defined the same way. Random = 5 / 10 / 5.
- **Beats median**: the share of top-decile picks whose forward return beats the universe median. Random = 50%.
- **Beat market (months)**: the share of rebalance months the portfolio return beat the index over the same period.

## Deliverables

- One script per experiment under a research folder, with the design and split in its docstring and a JSON results file. Running it twice gives the same numbers.
- A per-period table set (references/evaluation.md template), with a "how to read" legend and caveats.
- A plain-language verdict: which model, why, what it costs in risk, and what would change the conclusion.
- Never deploy a research variant to production without the user's explicit say-so. Research tables are not a release.
