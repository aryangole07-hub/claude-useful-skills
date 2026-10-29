---
name: perfectskills
description: Skill router. Use at the start of EVERY user prompt, before doing the task - picks the best 0-3 skills for the task from every installed, plugin and library skill (1,000+ in the claude-useful-skills library), loads only those, and learns from outcomes over time so the picks get better. Also use when the user asks which skill fits a job, or when a skill helped or failed.
---

# perfectskills

Thousands of skills exist, but loading all of them burns context on every turn and makes picks
worse. This skill keeps them all *on disk*, indexed, and pulls in only the few a task needs.

Scripts live next to this file: `scripts/skilldex.py` (stdlib Python). Data (catalog + learning
log) lives in `~/.claude/perfectskills/`.

## Every prompt

1. **Is it trivial?** A one-line answer, a quick lookup, chat, or a follow-up inside a task whose
   skills are already chosen → skip the search, say nothing about skills, just answer.
2. **Search.** Describe the task in a few keywords (domain + deliverable + tech):
   `python <this dir>/scripts/skilldex.py find "react dashboard dark mode charts" -n 6`
3. **Pick 0–3.** Prefer, in order: a skill already listed in the session's available skills
   (zero extra cost) → a library skill whose description clearly matches the deliverable →
   nothing. Two overlapping skills = keep the more specific one. Never pick a skill just
   because it scored; read its one-line description against the task.
4. **Load.** Installed/plugin skill → invoke it with the Skill tool. Library skill → Read its
   `SKILL.md` (path from the search) and follow it; read its `references/` only when the task
   needs that detail.
5. **Tell the user in one short line** which skills you're using (e.g. "Using: uiux,
   security-audit"). No line if none.
6. **Always pair with `model-router`** (its own hook fires on every prompt too): after picking
   skills, route the work by model rank (easy -> haiku, normal -> sonnet, hardest -> opus, never fable).

## House map (these win over a generic search hit for the same job)

| Job | Use | Not |
|---|---|---|
| Build, redesign, restyle, animate, QA or audit any website / UI / landing page / dashboard | `uiux` (the one design skill; folds in pro-design, webdes, webani, Emil Kowalski, impeccable, taste, Vercel guidelines) | webdes, webani, pro-design, taste-skill, ui-ux-pro-max, frontend-design separately |
| Motion review, frame-accurate capture, promo/launch video | `uiux` render lab; `hyperframes` for HTML -> MP4 video | |
| Charts / data visuals in React | `uiux` toolkit (Bklit UI); `dataviz` for chart design rules | |
| Find local businesses with old sites, rebuild + pitch | `website-rebuilder` (nearest-first; design via `uiux`) | |
| Security audit / pen test of a codebase | `security-audit` (Cloudflare, full mode only on explicit request); `security-and-hardening` for coding-time hardening | |
| Launch readiness: legal pages, consent, accessibility, 19 security checks | `uiux` launch gate (`references/launch-checklist.md`) + `shipping-and-launch` | |
| Questions about a codebase's structure, where things live | `graphify` (if `graphify-out/` exists, query it first) | |
| "Is there a skill for X?" and nothing here fits | `find-skills` (skills.sh registry) | |
| Out of Claude usage / tokens | `more-credits` (FreeLLMAPI, then OmniRoute) | |
| Which model should do this piece | `model-router` (every prompt) | |
| Drive a browser quickly from the shell | `playwright-cli`; MCPs: playwright, chrome-devtools | |
| Customers / launch / go-to-market for signal1 | agent `signal1-customers`; plugins `sales`, `marketing` | |
| Stock-ranking ML research, backtests, holdouts | `marketml` | |
| NSE intraday day-trading pipeline | `trader-india` (US `trader-*` pack removed 2026-10-29; reinstall from `E:\projects\signal\day-trader-skill` if ever needed) | |
| Engineering workflow (spec, plan, TDD, review, debug, ship) | addyosmani agent-skills (`spec-driven-development`, `test-driven-development`, `code-review-and-quality`, `debugging-and-error-recovery`, `shipping-and-launch`, ...) | |
| Keep code minimal, avoid over-engineering | `ponytail` plugin | |
| Office files | `anthropic-skills:docx/pdf/pptx/xlsx` | |

## Learn (after the task, or when the user reacts)

Log the outcome so future rankings improve:
`python <this dir>/scripts/skilldex.py learn --task "<the keywords you searched>" --skills a,b --outcome good|bad|neutral --note "<why, 1 line>"`

- **good**: the skill shaped the result and the user accepted it.
- **bad**: wrong fit, wasted tokens, or the user corrected the approach it led to.
- **neutral**: used it, made little difference.
Log at most once per task. User praise/complaint about the result is the strongest signal.

## Run it on every prompt (hook)

Add to `~/.claude/settings.json` so Claude is reminded on each prompt:

```json
"hooks": { "UserPromptSubmit": [ { "hooks": [ { "type": "command",
  "command": "python \"~/.claude/skills/perfectskills/scripts/remind.py\"", "timeout": 10 } ] } ] }
```

## Maintenance

- `skilldex.py index` after installing/removing skills or pulling the library (the catalog also
  rebuilds itself weekly).
- `skilldex.py stats` shows the learned track record; skills that keep scoring **bad** should be
  dropped from `~/.claude/skills` (keep them in the library).
- Skills that are **tools** (MCP servers, CLIs, hooks, proxies) are listed in the library
  README under tools/ and costopti/; never install those silently — they run code. Ask first.
