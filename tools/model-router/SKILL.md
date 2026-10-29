---
name: model-router
description: Saves tokens by routing work to the cheapest Claude model that can do it well - easy work to Haiku, normal work to Sonnet, the hardest work to Opus, never Fable. Use on EVERY prompt, together with perfectskills (a UserPromptSubmit hook reminds you), and whenever deciding whether and to which model to delegate a subtask.
---

# Model router

Rank, cheapest to most capable (Claude 5 family). **Fable is never used** (user rule).

| Rank | Model (Agent `model:`) | Cost | Give it |
|---|---|---|---|
| 1 | `haiku` (Haiku 5.5) | lowest | **Easy, mechanical, self-checking:** find-and-report searches, listing or counting files, reading a log and quoting the error, renames and spelled-out pattern edits, format conversions (CSV/JSON/MD), running a command and reporting its output, extracting fields, screenshot or HTTP status sweeps, boilerplate from an exact template, first-pass summaries. Use `effort: "lower"`. |
| 2 | `sonnet` (Sonnet 5.5) | middle | **Normal engineering:** a feature that follows existing patterns, tests, refactors with a clear target, debugging with a reproducible failure, UI from a spec or design, docs and READMEs, research synthesis from given sources, data cleaning with clear rules. |
| 3 | `opus` (Opus 5.5) | highest | **The hardest:** architecture and design decisions, subtle or cross-system bugs (concurrency, caching, auth, money), security audits, research methodology where leakage or overfitting matters (backtests, holdouts), anything ambiguous with many moving parts, final review of high-stakes changes (deploys, migrations, live trading, data deletion). Add `effort: "higher"` only when one piece needs more reasoning than the rest. |

## Procedure (every prompt)

1. **Grade the prompt and each separable subtask:** easy / normal / hardest, using the table. Grade by the cost of a wrong answer and the reasoning required, not by length. When torn between two ranks, pick the higher one for anything irreversible or user-facing, and the lower one for read-only lookups.
2. **Trivial or tightly coupled? Do it inline.** A cold subagent re-reads context, so delegating a 1-3 tool-call job costs more than doing it. Delegate only self-contained chunks (a search sweep, a batch of mechanical edits, a test suite run, a bounded investigation) with a complete brief: goal, exact files or paths, constraints, and the expected output format.
3. **Resource cap first (permanent user rule):** at most 2 background agents at once, since each one launches its own MCP node processes, and never more than 75% of CPU or RAM. The "Claude Resource Guard" task enforces it. **Delegate by rank** with the Agent tool and an explicit `model:` (`haiku`, `sonnet` or `opus`; never `fable`). Run independent chunks in parallel. Each agent's result is checked by the main session before it reaches the user. Haiku's output on anything that matters gets a quick review, and anything that looks off is redone one rank up.
4. **The main session's own model** is set by the user (`/model`). If a whole conversation is mostly rank-1 work on an expensive model, say so in one line (for example "this is Haiku-level work; `/model haiku` would save tokens"). Don't nag about it more than once.
5. **Never downgrade the hardest work to save tokens:** security, money, live trading, data deletion, holdout/backtest integrity and final verification stay on Opus.
6. Name the routing in the one-line skills note, for example "skills: webdes · routing: sweep→haiku, build→sonnet, review→opus".

The user explicitly authorised this delegation (2026-10-29), so spawning ranked subagents per these rules is expected, within step 2's limits.
