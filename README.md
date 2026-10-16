# claude-useful-skills

A collection of [Claude Code](https://claude.com/claude-code) skills, grouped by area.

## UIUX

| Skill | What it does |
|---|---|
| [`webdes`](UIUX/webdes) | Builds and polishes websites the way a senior product designer and frontend engineer would, so they look intentionally designed rather than AI-generated: anti-vibe-coding rules, hierarchy, typography, spacing, responsive layout from 4K to small phones, window resizing, accessibility, and a measured QA method. |
| [`webani`](UIUX/webani) | Premium motion and 3D: scroll-driven 3D heroes built from the product's own concept (scroll-linked, never scroll-jacked), a reusable motion system, micro-interactions, the "ending becomes the product" handoff, performance rules, and a capture-every-state QA loop. Builds on `webdes`. |

## AI-ML

| Skill | What it does |
|---|---|
| [`marketml`](AI-ML/marketml) | Quant-researcher method for training, tuning and honestly evaluating ML stock-ranking models: fixed train/test splits with purge and embargo, walk-forward tuning inside training only, no cherry-picking, tradable-universe portfolios with costs, per-year tables (return, daily max/median drawdown, beat-market, top/bottom 10%/5% accuracy), exposure-based diagnostics for why a model won or lost, and a six-method menu (V1, V2, V2L, V3, per-sector V4, external champion) that is re-tuned for the task and selected on training data only. |

Each skill is a folder with a `SKILL.md` (the core operating instructions) and a `references/` folder that Claude reads when a task needs the detail.

## Install

Copy a skill folder into your skills directory: user-level (available in every project) or per project.

```bash
git clone https://github.com/aryangole07-hub/claude-useful-skills
cp -r claude-useful-skills/UIUX/webdes ~/.claude/skills/webdes
cp -r claude-useful-skills/UIUX/webani ~/.claude/skills/webani
cp -r claude-useful-skills/AI-ML/marketml ~/.claude/skills/marketml
```

Per project: copy into `<project>/.claude/skills/` instead.

Claude Code picks the skills up automatically and triggers them on matching tasks; you can also invoke one explicitly, e.g. `/webdes`, `/webani` or `/marketml`.

## License

MIT
