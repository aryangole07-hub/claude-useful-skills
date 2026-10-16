# The six-method menu

All trained methods are linear ridge rankers. Their weights stay inspectable, and production scoring is a dot product.

## Targets (pick per task)

`y` is the cross-sectional percentile of the forward return, minus 0.5.

- `rank` = `y`
- `top10` / `top20` = 1 if in the top 10% / 20%, else 0, minus the base rate.
- `bot10` / `bot20` = −(1 if in the bottom 10% / 20%, else 0, minus the base rate). It is negated so that a HIGH score always means a better stock, and the bottom decile of the score is always the predicted losers.

Candidate targets per task:
- top tasks and cagr/sharpe: `rank, top10, top20`
- bottom tasks: `rank, bot10, bot20`
- ic: `rank`

## Methods

- **V1**: broad universe, target `rank`, grid over alpha only.
- **V2**: broad universe, grid over target × alpha × emphasis of the external model column (×1, ×4).
- **V2L**: same as V2, fit on the liquid universe only.
- **V3**: V1's features plus `v2l_pct`, the task-tuned V2L's out-of-sample percentile, centred, with a missing flag for rows outside the liquid universe. Grid over target × alpha × V2L emphasis (×1, ×16, ×256). Every `v2l_pct` value must be out-of-sample for its row: inner years from moving-window V2L fits, test years from V2L frozen at the end of training.
- **V4**: per-sector V3, fit in two steps:
  1. Fit V3 globally.
  2. For each sector with enough rows (≥ 2,000 stock-months), fit `ridge(alpha=λ)` on the global fit's residual. Prediction = global + sector delta.
  Use coarse sectors (about 9 super-sectors). Fine sub-sectors are too thin and overfit. Tune λ on training (e.g. 300 / 3,000 / 30,000); large λ shrinks V4 back to V3. Check that the sector labels are trustworthy first: wrong labels turn per-sector weights into noise.
- **Champion**: an external model's percentile, frozen at the start of the test (see the hard rules). Out-of-sample scores usually exist only for its recent training years, which is why stage-2 method selection uses the common window.

## Stage-2 window caveat

The common window is short (e.g. 32 months). Report each method's longer-window training score next to it. If the two disagree, or the margin is small, say the choice is weak.

## Long-short (buy / sell)

- Long leg = the top 10% of a top-task method. Short leg = the bottom 10% of a bottom-task method (S-names), ranked inside the shortable universe.
- 100% long, 100% short, equal weight inside each leg, monthly, costs on both legs' turnover.
- Choose the pair by long-short Sharpe on the common training window. Then report per period: return, Sharpe, daily max/median drawdown, positive months, and each leg's own return. A short leg whose stocks ROSE cost money even if the spread was positive.
- Check the correlation with the market. A "long-short" that is really net-long beta is not market-neutral.
