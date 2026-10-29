# claude-useful-skills

A curated library of [Claude Code](https://claude.com/claude-code) skills (~670), grouped by what they do.
Our own skills sit next to third-party packs, which are vendored unchanged with their upstream license
and an `UPSTREAM.md` naming the source commit.

**Don't install everything.** Every installed skill's description is loaded into context on every turn,
so 600+ skills would cost tokens and make Claude pick worse. Install [`perfectskills`](tools/perfectskills)
plus the few you use daily; perfectskills searches the whole library and loads only the 0–3 skills a
task needs.

| Folder | What's in it |
|---|---|
| [`tools/`](tools) | Skills that reach past the terminal (web, docs, Google Workspace), plus **perfectskills**, the router |
| [`harness/`](harness) | How Claude works *before* it types: planning, TDD, review, shipping workflows |
| [`design/`](design) | UI/UX taste and design systems: kills the generic AI look |
| [`writing/`](writing) | Prose quality |
| [`marketing/`](marketing) | Growth, SEO, ads, copy |
| [`memory/`](memory) | What survives the session: plans on disk, code graphs, notes |
| [`costopti/`](costopti) | Same answers, fewer tokens |
| [`official/`](official) | Anthropic's official skills |
| [`ai-ml/`](ai-ml) | Machine learning |
| [`security/`](security) | Reverse engineering / security |

## Our own skills

| Skill | What it does |
|---|---|
| [`perfectskills`](tools/perfectskills) | Skill router. On every prompt it searches all installed, plugin and library skills, picks the best 0–3 for the task, loads only those, and logs outcomes so its picks improve over time (`scripts/skilldex.py`, stdlib Python). |
| [`uiux`](design/uiux) | **The** website/UI skill (replaces `webdes` + `webani`; folds in pro-design, Vercel's Web Interface Guidelines, Emil Kowalski's animation craft, impeccable's layout rules, taste's art direction, awesome-design-md's DESIGN.md format and the screenshot-to-code method). Brand sheet first, pattern per section, the curve rule (entrances ease out, exits ease in, interface springs with slight overshoot, nothing linear), a headless render lab (`scripts/render_lab.py`: fake-clock frame capture, synthesised audio, beat-locked cuts, dead-frame hunt, contact sheets), toolkit (Motion, Bklit UI, Kokonut UI, HyperFrames, playwright-cli), a two-round verification loop with honest scoring, and a launch gate (19 security checks + legal/compliance). |
| [`pro-design`](design/pro-design) | Short four-part design process (brand, pattern library, motion, verification loop). Folded into `uiux`; kept for reference. |
| [`model-router`](tools/model-router) | Saves tokens: grades each prompt's subtasks and routes easy work to Haiku, normal to Sonnet and the hardest to Opus (never Fable). Ships a UserPromptSubmit hook (`scripts/remind.py`) to run next to perfectskills on every prompt. |
| [`more-credits`](tools/more-credits) | When Claude Code's usage runs out: relaunch it against a local free-model router (FreeLLMAPI, then OmniRoute) with `more-credits.ps1`, with privacy and quality rules for the fallback session. |
| [`website-rebuilder`](marketing/website-rebuilder) | Fork of pantheonmarketing/claude-website-rebuilder: nearest-first local prospect search (`scripts/nearby.py`, OpenStreetMap rings 1-40 km), design via `uiux`, before/after pitch cards. |
| [`marketml`](ai-ml/marketml) | Quant-researcher method for training, tuning and honestly evaluating ML stock-ranking models: purged/embargoed splits, walk-forward tuning inside training only, tradable portfolios with costs, per-year tables, and diagnostics for why a model won or lost. |

## Third-party packs (vendored)

| Folder | Upstream | Skills | Notes |
|---|---|---:|---|
| `harness/superpowers` | [obra/superpowers](https://github.com/obra/superpowers) | 15 | Brainstorm → plan → TDD → review workflow |
| `harness/ecc` | [affaan-m/ECC](https://github.com/affaan-m/ECC) | 311 | Everything Claude Code: language/framework skills, ops, security |
| `harness/gstack` | [garrytan/gstack](https://github.com/garrytan/gstack) | 56 | Garry Tan's ship/review/QA/browse workflow; many call gstack's `bin/` tools |
| `harness/agent-skills` | [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | 25 | Production engineering practices |
| `harness/ponytail` | [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) | 6 | Lightweight planning harness |
| `design/ui-ux-pro-max` | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 7 | Design-system generator with style/palette/font data |
| `design/taste-skill` | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | 14 | Anti-slop frontend taste rules |
| `design/awesome-design-md` | [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) | – | `DESIGN.md` files describing real brands' design systems (reference, not skills) |
| `writing/humanizer` | [blader/humanizer](https://github.com/blader/humanizer) | 1 | Removes AI-writing tells |
| `marketing/marketingskills` | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) | 50 | CRO, SEO, ads, copy, launch |
| `memory/planning-with-files` | [OthmanAdi/planning-with-files](https://github.com/OthmanAdi/planning-with-files) | 6 | Manus-style plan/findings/progress files |
| `memory/obsidian-skills` | [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills) | 6 | Obsidian markdown, bases, canvas |
| `memory/codegraph` | [colbymchenry/codegraph](https://github.com/colbymchenry/codegraph) | 2 | Skills for the codegraph indexer (needs its CLI/MCP) |
| `memory/claude-mem` | [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem) | 27 | Skills of the claude-mem plugin (memory needs its worker + hooks) |
| `tools/firecrawl` | [firecrawl/firecrawl](https://github.com/firecrawl/firecrawl) | 5 | Web scraping/search (needs a Firecrawl API key) |
| `tools/context7` | [upstash/context7](https://github.com/upstash/context7) | 3 | Up-to-date library docs (pairs with the Context7 MCP) |
| `tools/workspace-cli` | [googleworkspace/cli](https://github.com/googleworkspace/cli) | 95 | Gmail/Drive/Calendar/Sheets via the `gws` CLI |
| `tools/agent-reach` | [Panniantong/Agent-Reach](https://github.com/Panniantong/Agent-Reach) | 1 | Read Twitter/Reddit/YouTube/etc. (needs its CLI) |
| `tools/last30days` | [mvanhorn/last30days-skill](https://github.com/mvanhorn/last30days-skill) | 1 | Research what people said about a topic in the last 30 days |
| `costopti/caveman` | [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) | 22 | Terse output mode + memory-file compression. Saves output tokens only, which are a small share of a session |
| `security/security-audit` | [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill) | 1 | Six-phase, evidence-first security audit with validated findings |
| `tools/find-skills` | [vercel-labs/skills](https://github.com/vercel-labs/skills) | 1 | Discover and install skills from the skills.sh registry |
| `tools/playwright-cli` | [microsoft/playwright-cli](https://github.com/microsoft/playwright-cli) | 1 | Drive a browser from the shell (needs `npm i -g @playwright/cli`) |
| `tools/hyperframes` | [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) | 7 | HTML to deterministic MP4 video (needs its CLI) |
| `design/emil-skills` | [emilkowalski/skills](https://github.com/emilkowalski/skills) | 16 | Design-engineering and animation polish (distilled into `uiux`) |
| `design/impeccable` | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | 1 | Layout and craft rules, audit and critique (distilled into `uiux`) |
| `memory/graphify` | [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify) | 1 | Codebase/docs to a queryable knowledge graph (needs `pip install graphifyy`) |
| `marketing/knowledge-work-sales` | [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) | 36 | Anthropic's sales plugin skills |
| `marketing/knowledge-work-marketing` | [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) | 8 | Anthropic's marketing plugin skills |
| `official/anthropic` | [anthropics/skills](https://github.com/anthropics/skills) | 14 | Apache-2.0 skills. `docx/pdf/pptx/xlsx` are source-available (all rights reserved) and are **not** copied; get them from upstream or the `anthropic-skills` plugin |

Re-vendor everything with `python tools/vendor.py <folder-of-clones>`.

## Tools, not skills (link only)

These are programs (MCP servers, hooks, proxies, desktop apps). They run code, so install them
deliberately from upstream rather than copying files.

| Category | Project | What it is |
|---|---|---|
| harness | [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) | A `CLAUDE.md` of Karpathy's LLM-coding rules (no license, so not copied) |
| memory | [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify) | `/graphify` builds a local knowledge graph of the repo to query instead of grepping |
| memory | [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem) | Plugin: hooks + background worker that store session memory |
| tools | [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) | Browser automation MCP server |
| tools | [upstash/context7](https://github.com/upstash/context7) | Docs MCP server |
| tools | [farion1231/cc-switch](https://github.com/farion1231/cc-switch) | Desktop app: switch API providers, manage MCP/skills/prompts |
| tools | [paperclipai/paperclip](https://github.com/paperclipai/paperclip) | Orchestration server for teams of agents |
| costopti | [rtk-ai/rtk](https://github.com/rtk-ai/rtk) | Rust CLI that compresses command output before it reaches the model |
| costopti | [headroomlabs-ai/headroom](https://github.com/headroomlabs-ai/headroom) | Proxy that compresses tool output, logs, RAG chunks and history |
| costopti | [mksglu/context-mode](https://github.com/mksglu/context-mode) | MCP that keeps raw tool output out of context (no license, so not copied) |
| costopti | [jarrodwatts/claude-hud](https://github.com/jarrodwatts/claude-hud) | Statusline plugin showing context use, rate limits, tools, agents |

## Install

```bash
git clone https://github.com/aryangole07-hub/claude-useful-skills
cp -r claude-useful-skills/tools/perfectskills ~/.claude/skills/perfectskills
python ~/.claude/skills/perfectskills/scripts/skilldex.py index   # point it at the clone with PERFECTSKILLS_LIBRARY if it isn't in ~/projects
# plus any skill you use daily, e.g.
cp -r claude-useful-skills/design/webdes ~/.claude/skills/webdes
```

Per project: copy into `<project>/.claude/skills/` instead.

## License

MIT for our own skills. Third-party packs keep their upstream license (in each pack's folder).
