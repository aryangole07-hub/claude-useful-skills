# Diagnostics: why did a model win or lose in a period?

Answer with measurements. Run these in order.

## 1. Was it the market?

Compute the equal-weight universe return per year, and the yearly returns of style quintiles, re-formed every month:
- **Size**: log market cap.
- **Momentum**: 12-1 month return.
- **Lottery**: the largest daily return in the last 21 days.

```python
q = lambda col: df.groupby("date")[col].transform(lambda s: pd.qcut(s.rank(method="first"), 5, labels=False))
m = df.assign(b=q("mom_12_1")).groupby(["date", "b"]).period_ret.mean().unstack()
yearly = (1 + m).groupby(m.index.year).prod() - 1
```

If every quintile moved together (e.g. all around -2%), the year was a market-wide event and no stock-picking model could escape it. Judge the models relative to the median stock and the index that year.

## 2. What did the model hold?

For each model's picks in the period, report the mean cross-sectional percentile of size, momentum and lottery, the median past-12-month return, and the median traded value. A model whose picks sit at the 80th+ percentile on momentum and lottery with +170% past-year gains is a froth bet. It wins in small-cap booms and loses when froth comes out.

## 3. Where did the money go?

- **Monthly path**: the portfolio vs the equal-weight universe vs the index, month by month. Find the 2-3 months that decided the year and tie them to events (regulator warnings, rate shocks, small-cap crashes).
- **Worst contributors**: the sum of `period_ret / n_holdings` per stock across the period. Name the stocks.
- **Costs**: gross vs net return, and the average share of names replaced each month. High-turnover models lose several points a year to costs.

## 4. Is it skill or exposure?

Compare the model's return against the style quintile it resembles. If the high-momentum, small-size quintile made what the model made, the model added little beyond the tilt.

## 5. Regime dependence

Count how much of a multi-year CAGR comes from one or two boom years. Report the CAGR with and without them. A model that only beats the index in boom years is a leveraged style bet, not a predictor.

## Common findings worth checking first

- A top-decile hit-rate objective drives the model into lottery stocks. Its bottom decile then predicts losers worse than random.
- Monthly-only drawdowns understate risk badly. Recompute them daily.
- Benchmark years missing a month make the comparison wrong. Align the periods.
- Microcap-driven results vanish on the liquid universe.
- Survivorship bias (delisted names missing) inflates small-cap and boom-year returns the most.
