<!-- AUTO-GENERATED from flake.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->
## Flake recipe

A flake is a test whose verdict depends on something other than the code it
guards. The Iron Law holds here: no rerun, no wider timeout, no retry and no
skip until the cause is named and probed.

1. **Reproduce on main.** Check out `origin/<base>` in a worktree
   (`git worktree add <dir> origin/<base>`) and run the failing file alone N
   times (N ≥ 10). On gstack:
   `bun run scripts/ship-measure.ts free --files <file> --reruns N`; elsewhere a
   loop over the project's single-file test command. Record `failed/N` on main,
   then the same on the branch. A failure that reproduces on main is outside the
   PR; one that appears only on the branch is inside it.
2. **Cause inside or outside the PR.** Diff the two runs' logs at the first
   divergence and name the dependency: timing, file order, shared state, network,
   clock, a resource limit. "Flaky" is a symptom, never a cause.
3. **Compare the metric with the last N green runs.** Once for `<base>` and once
   for the branch (`--branch <branch-name>`), against the workflow that ran the
   failing shard; read the duration or retry token next to the test:
   ```bash
   gh run list --branch <base> --workflow free-tests.yml --status success --limit 20 --json databaseId,headSha,createdAt,updatedAt
   gh run view <run-id> --log | grep -F -- "<failing-test-file>"
   ```
   The run where the duration, retry count or failing test first moved dates the
   regression; cite its `headSha`.
4. **Forced probe.** Build the smallest change that makes the test fail
   deterministically for the stated cause (inject the delay, pin the file order,
   freeze the clock, exhaust the resource). Show the probe output failing before
   the fix and passing after. No probe, no cause.
5. **Never loosen.** A wider timeout, a retry, a looser assertion or a skip is a
   gate relaxation (review tag RH-15); the fix lives in the code or in the test's
   isolation, not in its threshold.
   **The flake-fix number.** A fix that touches only the test (a wider timeout, a retry,
a looser assertion, a skip) must state `P(fail | regression)`: the probability the test
still fails when the behavior it guards regresses, before and after the change. Derive
it from the forced probe (break the behavior on purpose, run the test N times, count
failures) and write both numbers in `## Flake evidence`. A number that drops is a gate
relaxation (review tag RH-15) and needs the owner's decision, not a merge.
6. **A rerun only when the cause is known and outside the PR** (infrastructure,
   a polluter already fixed on main, a provider outage), stated in the PR body.
   Reruns follow `ship-measure`'s discipline: bounded, counted, logged,
   `flaky retry off`; a free rerun is diagnostic, never the green. Paid evals
   are never retried (`EVAL_POLICY` in `test/helpers/periodic-exclude-data.ts`).
7. **`## Flake evidence` in the PR body (required for any flake fix).** The
   probe's before and after output, `failed/N` on main and on the branch, the
   `gh run list` comparison with the first-moved `headSha`, and a routing note
   for the owner: `fix in this PR` | `rerun; cause outside the PR: <what>` |
   `owner decision needed: <the relaxation and its P(fail | regression) before/after>`.

### Timing flakes (`TIMING_ASSERTION`)

When the failing line compares an elapsed time with a bound or sleeps and then
asserts (`gstack-pregate`'s `timing` check prints it as
`TIMING_ASSERTION: <file>:<line> <pattern>`):

1. **Same-load distributions.** Log the asserted value on every run and run the
   file N ≥ 20 times on `origin/<base>` and on the PR head under the same load
   (same machine, same concurrency, beside the same shard). Report min, p50,
   p95, max and failures against the bound for both. A distribution that moved
   on the PR head is a regression in the PR; the same distribution on both is a
   test that depends on machine load.
2. **Forced probe.** Inject the delay the load causes (a sleep inside the
   measured span behind a test-only hook, or a starved CPU) and show the
   assertion failing every time.
3. **Fix the measurement, never the bound.** Assert on the outcome, an injected
   clock, a forced deadline or a poll with a deadline instead of a fixed sleep;
   a complexity bound measures thread CPU time against a same-run baseline.
   When a bound stays the contract, the line carries
   `gstack-timing-ok: <reason>`. Raising the bound is not a fix.
4. **Rerun only with outside-cause evidence:** the same-load distributions show
   no PR regression and the failed run's load is on record (CI log, runner
   metrics). Put both in `## Flake evidence`.
