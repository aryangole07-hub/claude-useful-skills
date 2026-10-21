# Data audits, model combinations, money-level playbooks, speed

Lessons from a real build (an Indian-equity auto-trader, Oct 2026). Apply them before trusting any result.

## 1. Audit the data before blaming the model

Most "the model stopped working" cases had a data cause. Check these first:

- **Validate every label against an authoritative source.** Sector or industry labels taken from a scraped site table were wrong for 57% of the companies that could be checked (a realty firm and a food-delivery app tagged "Healthcare"). Every sector feature, every per-sector model and every sector-spread strategy silently used noise.
  - Sample well-known names and compare them by hand.
  - Then measure the mismatch rate against the exchange's own classification.
- **Scan for coverage gaps over time.** Plot the count of priced securities per day or quarter, and the distribution of each series' last date.
  - A spike of series ending on the same date is a feed outage, not a wave of delistings. One example: ~1,300 companies "died" on a single day.
  - Check every source's date span. An exchange changing file format (old bhavcopy → UDiFF) can quietly end a fetcher's coverage.
- **Recover lost identifiers by fingerprint.** Match on prices when codes were blanked or mis-joined. A candidate code must agree with the series' closes within 0.5% on at least 18 of 20 shared days, and must be the unique best match. Spot-check the matches by name.
- **Fill gaps add-only.** Never overwrite an existing print. Do it in a COPY of the data store, so the live system is untouched and can be rolled back.
- **Use exchange or primary sources over aggregators.** If an exchange API returns "Access Denied" to curl or requests, the cause is usually TLS fingerprinting. A browser-impersonating client (`curl_cffi`, `impersonate="chrome"`) after one homepage request often works. Stay polite: 3–4 threads, retries, caching, resumable.
- **When something must be 100% covered (e.g. a sector for every company, including delisted ones):** take authoritative labels first, then a classifier for the rest.
  - The classifier's inputs are name text (char 3–5-grams, TF-IDF) plus price co-movement: the correlation of the stock's market-relative daily returns with each sector's median stock.
  - Report its cross-validated accuracy, and what share of the TRADED universe each label source covers. Coverage of the tradable universe matters more than coverage of the company list.
- **Point-in-time caveat.** Classifications are usually today's. Say so.

## 2. Diagnose losses with model-family behaviour, not stories

Compute per-model, per-year IC and top-decile excess return versus the equal-weight universe for the losing period.

- **Model families can be opposite style bets.** A quality/low-risk family (V1, Champion) won in one year and lost the next. A momentum/lottery family (V2L/V3/V4) did the reverse.
- **Blending the two families cancels them out.** An equal-weight consensus of both mostly washes out the edge.
- **Check for duplicate models.** One method's best setting can collapse into another's (V3 == V2L), which silently double-weights that style in any consensus.
- **Rule picks made on short windows chase the last regime.** Ask whether the selection window would simply have chosen last year's style.

## 3. Combining "top" (V) and "bottom" (S) models when you can only go long

Shorts are often impossible: small accounts, borrow, lot sizes. Use the bottom model as a VETO:

- Rank by the V model.
- Do not buy, and do not keep, anything in the S model's predicted bottom 10%.
- Treat "none" as one of the S options.

Brute-force every (V, S) pair, separately for liquid and for less-traded stocks, on a cheap yardstick: equal-weight top 20 after the veto, monthly, with turnover cost, minus the T-bill rate, scored by Sharpe.

Two honest ways to choose a pair:

- **A (adaptive).** At each month-end, take the best pair on the trailing 12 months of returns already realised by that date. It needs 12 months of history and the pair must still be scored. It is causal by construction.
- **B (fixed).** Take the best pair on all history (≥ 36 months).
  - Inside the training backtest, re-choose B each January from earlier data only. Otherwise B's backtest is in-sample and will unfairly beat A.
  - The deployed B is the choice made with all training data, then frozen.

## 4. Money-level playbooks (what to run at Rs 10k vs Rs 1 Cr)

- **Simulate the real account.** Whole shares at actual (unadjusted) prices, next-day fills, every broker and exchange charge, capital-gains tax per financial year with loss carry-forward, and a delisting exit value.
- **Capacity.** One position must be ≤ ~2% of the stock's median daily traded value, so big accounts are automatically pushed into liquid names.
- **Liquidity-tiered slippage**, e.g. 0.15% / 0.5% / 1.0% by traded value.
- **Grid** = model × universe (liquid only vs liquid + less-traded) × number of stocks × review frequency, at each money level.
- **Choose on a long training window** (10+ years where the scores are out-of-sample), not 3 years.
  - Smooth the score across neighbouring money levels, so one lucky size can't win alone.
  - Merge neighbouring levels with the same choice into bands, with boundaries halfway between levels on a geometric scale.
  - A 3-year window chose ~120 combinations per level; the picks failed out of sample. Treat that as a warning.

## 5. Process rules that saved the result

- **Pre-register the design and commit it before running.** That covers the cutoff, the grid, the choice rule and the holdout window. Seal the test: the model-selection code must not compute any score after the cutoff. Open the holdout ONCE, behind a lock file.
- **Version and freeze every build.** Keep a manifest of every model file with its SHA-256 and the path it restores to, plus a git tag. A one-command activate/rollback lets a new version be tested without touching the running one.
- **Disclose designer contamination.** If you have seen later results of earlier versions, the recipe was not written blind. Say so in the report.

## 6. Make the slow parts fast, and prove the output is identical

- **Rewrite slow backtest lookups as arrays.** E.g. `series.iloc[:i+1].dropna()` per holding per day is O(n²). Replace it with forward-filled numpy arrays plus a "last valid row" index. Here that gave 17× speed with byte-identical NAVs. Always assert the fast engine matches the reference (same final value, same trades) before using it.
- **Cache per-entity feature work.** Example: chart-pattern detection per company, keyed by a hash of that entity's own input series. A rebuild then recomputes only what changed.
- **Compile hot Python loops** (numba) and spread them over the allowed cores.
- **Adopt a speed-up only after comparing old vs new output on every column and row** (equal within float rounding).
- **Keep a pure-Python reference next to every compiled kernel** and gate the fast path behind an env switch. Prove equality with a SHA-256 per output array, computed in separate processes, so two full outputs never sit in memory together. Example: numba twins of chart-pattern searches gave 27× speed, with all events and all 163 panel arrays bit-identical.
- **Share big read-only arrays across worker processes.** Build them once, `np.save` them, and have each worker `np.load(..., mmap_mode="r")`. Ten private copies of price/circuit arrays ran a 32 GB machine out of memory, while the memory-mapped version used about 1.6 GB per worker. Run a memory watchdog during big grids.
- **Parallelism is not free.** Running independent pandas steps in side processes saved about 1 minute of 10 but left 0.6 GB free. Measure memory, not just time.
