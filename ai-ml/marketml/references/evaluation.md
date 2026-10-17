# Evaluation: portfolio simulation, metrics, tables

## Data shape

One row per (rebalance date, stock). Columns:
- `pct`: the model's percentile on that date, 0-100, ranked within the evaluation universe.
- `period_ret`: return from close(t+1) to close(next rebalance + 1).
- `fwd_63`: the 63-trading-day forward return (the accuracy label).
- `med_tv`: median daily traded value.

Re-rank `pct` inside the universe you report on, e.g. the liquid top-500. A percentile computed on a larger universe is not a decile of the smaller one.

## Portfolio simulation (monthly, equal weight)

```python
def simulate(df, lo=90, hi=100.01, bps=25.0):
    rows, prev = [], pd.Series(dtype=float)
    for d, g in df.groupby("date", sort=True):
        g = g.dropna(subset=["period_ret"])
        sel = g[(g.pct >= lo) & (g.pct < hi)]
        w = pd.Series(1 / len(sel), index=sel.company_id) if len(sel) else pd.Series(dtype=float)
        r = g.set_index("company_id").period_ret
        idx = prev.index.union(w.index)
        turn = (w.reindex(idx).fillna(0) - prev.reindex(idx).fillna(0)).abs().sum()
        ret = (w * r.reindex(w.index).fillna(0)).sum() - turn * bps / 1e4
        v = w * (1 + r.reindex(w.index).fillna(0)); prev = v / v.sum() if v.sum() else w   # drifted weights
        rows.append({"date": d, "ret": ret, "turnover": turn, "n": len(w)})
    return pd.DataFrame(rows)
```

CAGR = `nav[-1] ** (12 / months) - 1`. Sharpe = `mean / std * sqrt(12)` (state the risk-free rate used, or rf = 0).

## Daily NAV for drawdowns

For period i, hold the basket from the entry close to the next entry close, with equal weights at entry and buy-and-hold inside the period:

```python
rel = (px.iloc[a:b+1][ids].ffill() / px.iloc[a][ids]).mean(axis=1)
level *= 1 - turnover_i * bps / 1e4
seg = level * rel
```

Chain the segments together. Check that each segment's end/start ratio matches the monthly return to within ~1 pp (gaps come from missing prices).

- **Max drawdown**: `min(nav / cummax(nav) - 1)` within the window. The window's starting value counts as the first peak.
- **Median drawdown**: the median over trading days of `nav / cummax(nav) - 1`, i.e. how far underwater the portfolio sits on a typical day. Don't use the median episode depth on daily data, because tiny one-day dips swamp it.

## Accuracy

```python
rp = d.groupby("date").fwd_63.rank(pct=True); p = d.pct / 100
top10 = (rp[p >= .90] > .90).mean();  top5 = (rp[p >= .95] > .95).mean()
bot10 = (rp[p <= .10] <= .10).mean(); bot5 = (rp[p <= .05] <= .05).mean()
```

Also report the **excess return of the bottom decile**: the mean over dates of (the bottom picks' average `fwd_63` minus the universe average). A model can be "accurate" at finding bottom-decile names while its bottom bucket's average return is unremarkable, because volatile stocks land in both tails.

Recent windows: the last few rebalances have no 63-day label yet. Say how many months the accuracy covers.

## Period slicing

Simulate once over the whole test, then slice by rebalance-date year, so costs carry across years. A "year" of rebalances Jan-Dec holds from early Feb to early Feb of the next year. Say so. Benchmark returns must use the same entry/exit closes. For the last period, pass the next rebalance date so its return closes.

## Table template (one per year + one for the recent window)

| | Return | Max DD | Median DD | Beat mkt | Top 10% | Top 5% | Bottom 10% | Bottom 5% |
|---|---|---|---|---|---|---|---|---|
| Model A | | | | | | | | |
| Median stock (EW universe) | | | | | *10* | *5* | *10* | *5* |
| Index | | | | | | | | |

Bold the best value in each column. Put a "how to read" legend above the first table: universe, portfolio rule, costs, drawdown definition, accuracy definition, random baselines. For partial-year windows, show the annualised return in brackets and warn about the short sample.

## Full-test scorecard (one row per model)

CAGR · Sharpe · max DD · median DD · worst month · months beating the market · beats-median accuracy · top-10% accuracy · rank IC · median holding traded value · yearly returns.
