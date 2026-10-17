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
5. **Tell the user in one short line** which skills you're using (e.g. "Using: webdes,
   frontend-design"). No line if none.

## Learn (after the task, or when the user reacts)

Log the outcome so future rankings improve:
`python <this dir>/scripts/skilldex.py learn --task "<the keywords you searched>" --skills a,b --outcome good|bad|neutral --note "<why, 1 line>"`

- **good**: the skill shaped the result and the user accepted it.
- **bad**: wrong fit, wasted tokens, or the user corrected the approach it led to.
- **neutral**: used it, made little difference.
Log at most once per task. User praise/complaint about the result is the strongest signal.

## Maintenance

- `skilldex.py index` after installing/removing skills or pulling the library (the catalog also
  rebuilds itself weekly).
- `skilldex.py stats` shows the learned track record; skills that keep scoring **bad** should be
  dropped from `~/.claude/skills` (keep them in the library).
- Skills that are **tools** (MCP servers, CLIs, hooks, proxies) are listed in the library
  README under tools/ and costopti/; never install those silently — they run code. Ask first.
