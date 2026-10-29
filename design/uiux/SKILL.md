---
name: uiux
description: The "uiux" skill (formerly website-des-complete). Complete method for building, redesigning or polishing any website, landing page, dashboard or web UI so it looks intentionally designed by a senior product designer, not AI-generated. Brand sheet first, a chosen pattern per section, one orchestrated motion moment plus purposeful micro-motion, Vercel's Web Interface Guidelines as the code checklist, and a measured two-round browser verification loop. Use for any request to create, redesign, restyle, animate, make responsive, audit or QA a site or UI. Combines pro-design, webdes, webani, Vercel's web-design-guidelines, Emil Kowalski, impeccable, taste, MotionSites and awesome-design-md.
---

# uiux

> Optimize for intentionality, not visual complexity. Nothing on the page should feel accidental.

**The brief wins.** If the user pins a style, font, palette, era or effect, follow it exactly (a requested gradient gets a good gradient). Everything below fills gaps. "Don't redesign" means keep the visual language and improve only responsiveness, spacing, motion, performance and polish.

Ask first, every time: *how would an excellent product designer and a senior frontend engineer approach this?*

## 0. Inspect before touching

Read the routes, layout shell, styling system, tokens, components, data shapes and the live site. Write down what already works and preserve it. Never rewrite architecture, routes or a styling system that doesn't need it. Work on a branch, run it locally, and don't deploy until the user has reviewed it.

## 1. Brand first (before any code)

- Look for brand files: BRAND.md, DESIGN.md, CLAUDE.md, a tokens/theme file, a logo, the live site.
- If none exist, write a short **brand sheet**: 4-6 named hex colours (mostly neutrals; colour reserved for state, interaction and one emphasis), two typefaces with clear roles, a one-sentence voice, and **one signature element** that belongs to this subject. Show it to the user once (or in the hand-off if they asked you to proceed without stopping).
- Every colour, font, size, radius, space and duration lives in CSS variables. No hardcoded values in components.
- Choose typefaces for this subject, not the families you use on every project. Few weights, a real scale, fluid sizing (`clamp()`), `text-wrap: balance` on headings, `tabular-nums` on numbers.

## 2. Product brief (a few lines, before layout)

User goal · primary action · hierarchy (primary / secondary / tertiary) · page structure · responsive behaviour · interaction model · motion model. For a landing page also: what the product does (verbs), who uses it and what they want in ten seconds, the one transformation it performs (X in -> Y out).

## 3. Pattern library (before layout)

- Choose a pattern for each section and say why: hero (demo-led, product-shot-led, type-led, proof-led), feature rows, comparison, pricing, FAQ, testimonials, process steps. Numbered steps only for a real sequence.
- If a browser or search tool is available, study two or three strong sites in the same industry first.
- **Open with the most characteristic thing in the subject's world** - real product output, real data - not a slogan over empty space. Spend boldness in one place; keep everything else quiet.
- **Density is a choice.** Finance, analytics, research and enterprise stay dense, made legible by alignment, grouping, type and restrained colour - not exploded into giant cards.
- **Editorial tiers** for content (major / important / normal): size, placement, image scale and type step down together, driven by real importance data, never invented.

## 4. Anti-generic check (reject unless the brief asks)

- cream background + serif + terracotta accent; near-black + one acid-green/orange accent; purple/blue "AI" gradients, neon, glow borders, glassmorphism everywhere
- identical rounded cards with the same shadow (the SaaS card kit); one radius everywhere; pills and badges everywhere
- a small tracked ALL-CAPS eyebrow over every heading; one accent-coloured word in every headline; `A · B · C` meta strings everywhere; `->` on every link
- blobs, floating spheres, particles, spinning globes, DNA helices, "tech grids"; stock-looking illustration
- huge empty hero, giant meaningless headline, whitespace that is really missing content
- fade-and-slide on every section; hover transform on every card; motion everywhere at the same intensity

**Test for every element:** does it improve comprehension, hierarchy, interaction, storytelling, orientation or feedback? If not, remove it.

## 5. Build principles

- Layout by relationships, not coordinates: grid/flex, container queries, `clamp()`, intrinsic sizing. Deliberate behaviour at every size class from 4K to 360 px (`references/responsive.md`).
- Surfaces: hairline borders and tonal steps over heavy shadows.
- Colour carries meaning; the design must still work nearly monochrome. Light and dark if the product has both (`color-scheme`, `theme-color`).
- Diagnose causes, not screenshots: measure rects, computed styles and scroll metrics, then fix the grid, container or unit.
- Honest data: real or clearly labelled sample data. No lorem ipsum, no invented numbers.
- Performance is design: lazy-load heavy code after first paint, sized/lazy images, transform/opacity animation, loops that sleep when idle.

## 6. Motion

- **Primary (one, rare):** a single orchestrated moment - a hero load sequence (ease-out entrances over 600-900 ms, cuts on the beat) or one scroll-scrubbed scene. For a scroll scene: sticky stage in a tall track, scroll scrubs it (never capture wheel/touch), first wheel notch produces an unmistakable change, text stays DOM, earlier objects leave, and the ending resolves into the real product UI (`references/motion-and-3d.md`, `references/motion-system.md`).
- **Secondary:** staggered once-only entrances where something genuinely arrives, tab/panel changes, chart line draws, count-ups below the fold.
- **Tertiary:** motion that answers an action - hover, press, focus, toggle, drag, select - transform/opacity only, never `transition: all`.
- **The curve rule (non-negotiable):**
  - **Entrances ease out** (fast in, settling): `--ease-enter: cubic-bezier(0.16, 1, 0.3, 1)`, 200-450 ms for UI, 600-900 ms for a hero sequence.
  - **Exits ease in** (gathering speed as they leave), shorter than the entrance: `--ease-exit: cubic-bezier(0.55, 0, 0.9, 0.4)`, 120-250 ms.
  - **Interface is a spring with a slight overshoot** - hover, press, toggles, tabs, drag release, layout changes, menus opening from their control: about 2-5% overshoot (Motion `type: "spring", bounce: 0.15-0.25`, or the `--spring-ui` token from `references/springs.md`). No visible wobble.
  - **Nothing is linear.** No `linear` timing, no constant-velocity tweens, no default `ease`, no `ease-in-out` on entrances, exits or interface, and no `transition: all`. A spring written as CSS `linear(…)` samples is not linear motion: it's the spring curve encoded, and it's allowed. Spinners and progress use eased segments, not linear.
- 3D only when depth explains something real in the product; every object maps to a real noun. Lazy, DPR-capped, render-on-change, paused offscreen, with a 2D telling for phones / no WebGL.
- `prefers-reduced-motion` removes unrequested motion. Never leave content hidden waiting for an animation (content is visible by default; JS only enhances).

## 6a. Craft rules (Emil Kowalski, impeccable, taste - details and numbers in `references/craft.md`)

**Unique direction (taste).** Before the brand sheet, inventory 8-12 things that belong to this client alone. Write three candidate directions, pick against the inventory and log why. Then write one idea sentence: "On this page, [thing from the subject] becomes [device]". If the nearest competitor fits the sentence, it's a category idea, so start again. Write sections as claims with proof (no claim, no section), make one live thing from real content, carry the idea into pricing/FAQ/footer, and never give neighbouring sections the same layout. Treat the first font and palette that come to mind as spent.

**Layout (impeccable).**
- Pick the visitor mode first: Persuade (landing), Operate (apps, dashboards), Read (docs) or Experience (portfolio). Mode sets ambition and density.
- Write a spatial thesis before editing: reading path, groups, who leads, rhythm, behaviour at content extremes. It must pass the squint test.
- Group by proximity before adding containers; nested cards are always wrong.
- Rhythm needs contrast between tight and generous gaps, with more space above a heading than below. Use a 4-unit spacing scale.
- Type: body at least 1rem, measure 45-75ch, 2-3 visible sizes set far apart, display at least 4x body with -0.02 to -0.05em tracking, headlines at most two lines at every width.
- Colour: choose a strategy (restrained / committed / full / drenched), use OKLCH roles not swatches, tint text on coloured surfaces, design dark-mode elevation instead of inverting, keep the accent under 5% of any screen.
- Theme the browser surfaces: selection, caret, scrollbars, focus, underline offset.

**Animation polish (Emil).**
- Frequency gate: 100+ uses a day means no animation, and keyboard-initiated actions never animate. Delight and bounce belong only to rare moments. Zero animation is a valid answer.
- Press scale 0.97 on pointer-down. Never enter from `scale(0)`; start at 0.9-0.97.
- Menus and popovers scale from their trigger (origin-aware). Exit along the entrance path.
- Interruptible: transitions, not keyframes, for rapid-fire UI. Springs start from the live value and carry the release velocity; momentum projection and rubber-banding for drag.
- Gate hover effects behind `(hover: hover) and (pointer: fine)`. Use `@starting-style` for CSS entrances.
- Reduced motion means fewer and gentler (keep opacity and colour, drop travel), not a global 0.01 ms kill.
- Keep UI motion near the low end of the entrance band on frequent surfaces. Pick the overshoot end of the slight range by context: top after a flick or drag release, bottom for menus.
- Animate composite-only properties, never through React state, and add `will-change` only after a measured drop.

## 6b. Cinematic build method (MotionSites, MIT part - `references/motionsites/`)

For landing pages and heroes that must feel award-level:
1. **Decide, don't interrogate.** Settle what/who, **mood in three words**, the **signature** (one memorable media, interaction or type moment, picked from `references/motionsites/techniques/INDEX.md` or invented), the output (single `index.html` with pinned CDN versions, the user's stack, or a prompt for Lovable/Bolt/v0/Cursor per `references/motionsites/builders.md`), and the scope (hero by default).
2. **Write a precise build spec** with `references/motionsites/spec-template.md` before coding. Every element gets real values: fonts, hex/OKLCH tokens, px/clamp sizes, tracking, durations and curves, z-index layers, breakpoints, and the real copy. "Nice gradient" or "smooth animation" never appears in a spec.
3. **Media first.** Order: the user's own assets, generated assets (prompt formulas in `assets.md`), real licensed media, else a type/gradient/motion-led page. Never fake image boxes or invent asset URLs.
4. **Build from tested techniques** (`techniques/*.md`: 3D/WebGL, scroll, depth, type motion, surfaces, video, layout). Re-time them to the curve rule. The first CSS rule sets the background on `html, body` (no white flash), and CDN libraries are pinned (`three@x.y.z`, `gsap@x.y.z`).
5. **Look and fix** with `scripts/motionsites_shoot.py` (desktop, mobile and an *early* frame to catch flashes, plus a QA report: console errors, overflow, fonts loaded) and `references/motionsites/review.md`: blocking failures first, then 10 scores. Fix the three weakest with concrete values, not adjectives. The frame bar is 8+ average with nothing under 7, scored honestly (section 8: inflated self-scores are errors).
No sponsored blocks, credits or ad links ever go into a deliverable.

## 6c. Toolkit (preferred libraries, React / Next.js / Vite)

Use these before hand-rolling. They are tools, not a look: everything still passes sections 4-9, gets re-themed to the brand tokens, and is added only where it does a job.

- **Motion (motion.dev)** for hover/press feedback, drag interactions, shared-element and layout transitions (`layout`, `layoutId`, `AnimatePresence`). `npm i motion`, `import { motion, AnimatePresence } from "motion/react"`. Springs for drag and layout; tweens 150-250 ms for UI. Wrap in `<MotionConfig reducedMotion="user">`. In Next.js App Router put motion components in `"use client"` files.
- **Bklit UI (ui.bklit.com)** for charts and data visuals: area, line, live-line, bar, candlestick, sparkline, profit-loss line, heatmap, radar, ring, gauge, sankey, funnel, choropleth, composed. A shadcn registry: `npx shadcn@latest add @bklit/area-chart` (add the `@bklit` registry to `components.json` per ui.bklit.com/docs/installation; it also ships agent skills at /docs/skills). Theme its colours from the CSS tokens; keep `tabular-nums`, honest axes and real data.
- **Kokonut UI (kokonutui.com)** for ready-made animated components (buttons, cards, inputs, toggles, loaders, text effects, AI-chat blocks). A shadcn registry: add `"@kokonutui": "https://kokonutui.com/r/{name}.json"` under `registries` in `components.json`, then `npx shadcn@latest add @kokonutui/<name>`. Pick sparingly: a component's built-in animation counts toward the motion budget, and anything that trips the anti-generic list in section 4 gets toned down or skipped.
- **Strawberry (strawberrybrowser.com)**, the AI browser with "companion" teammates, is for the *human* review pass: the user can open the local preview in it and have a companion click through flows, compare pages or collect feedback. It's a desktop app the agent can't drive. The agent's own verification stays Playwright / Claude in Chrome (section 8).
- **DESIGN.md (awesome-design-md, VoltAgent, MIT; 84 brand analyses, vendored at `design/awesome-design-md/design-md/<brand>/DESIGN.md` in the claude-useful-skills repo; local clone `~/projects/awesome-design-md`).** Write the brand sheet *as* a `DESIGN.md` in the project root, in that format: YAML front matter with named `colors`, a `typography` scale (family, size, weight, line-height, tracking, features), spacing, radii, elevation and components, then prose on voice and do/don't rules. Agents and humans read one file. Use the collection to study how strong brands encode their systems (a pattern study, not a costume): never copy a brand's look onto a client, and never ship a client site that imitates another company.
- **Image -> code (screenshot-to-code method, abi/screenshot-to-code, MIT).** For a mock-up, sketch or reference screenshot: reproduce exact text and layout first, extract the real image assets (crop, never embed the whole screenshot as the page), generate only what can't be extracted, upscale low-res assets instead of CSS-stretching them, treat multiple screenshots as linked pages or views, drop device frames. Then screenshot the build at desktop and mobile, compare side by side with the reference, and fix the differences. When reproducing someone else's live site, rebuild the client's own content only and never clone a third party's design or brand.
- **playwright-cli (Microsoft, installed globally with its skill).** The fastest way to drive a page from the shell: `playwright-cli open <url>`, snapshot, click, fill, screenshot, and code generation for tests. Use it for quick interactive checks and recording flows; use `scripts/render_lab.py` for frame-accurate motion review, and the Playwright / Chrome DevTools MCPs inside a session.
- Projects without React or the shadcn CLI: use Motion's vanilla API (`import { animate, hover, press } from "motion"`) and plain SVG/canvas charts in the same spirit; don't add a framework just to use a component.

## 6d. Motion render lab (start every motion job here)

**Before any motion work, build the headless render loop**, then design inside it. Setup, once per machine: Node, ffmpeg (`winget install Gyan.FFmpeg`), Playwright (`pip install playwright numpy pillow && playwright install chromium`; the Playwright MCP is also installed). The tool is `scripts/render_lab.py`:

1. **Render, don't eyeball.** `render_lab.py capture URL frames/ --fps 60 --seconds N [--scroll PX]` renders on Playwright's fake clock, so every frame is exactly 1/fps apart and springs are sampled deterministically. CSS animations don't follow the fake clock, which is one more reason everything is a JS spring or a generated `linear()` spring.
2. **Real physics, enforced by the curve rule (section 6).** Entrances use `--ease-enter`, exits use `--ease-exit`, and interface uses real closed-form springs with slight overshoot (Motion springs, or springs sampled into `linear()` tokens). Bare `ease`, `ease-in-out`, `linear` and `transition: all` are banned. Formula, generator, tokens and the lint command are in `references/springs.md`. Run the lint before review.
3. **Sound is synthesised, never sampled.** Generate it in code (Web Audio oscillators and noise on the site; `render_lab.py audio --bpm B` for video). On a website, sound is **off until the visitor turns it on**, is quiet, follows a user action, and never plays under `prefers-reduced-motion`.
4. **Lock cuts to the beat.** For any sequenced piece (hero load sequence, promo video, HyperFrames composition) pick the BPM first, then snap every cut and keyframe start to a beat (`render_lab.py cuts beats.json t1 t2 …`). Spring settle times are tuned to land on beats too.
5. **Watch your own frames and critique them.** `render_lab.py sheet` builds contact sheets. Read them, and grade every sampled frame 0-10 for composition, hierarchy, legibility, motion continuity and brand. Say what's wrong in each frame below 8.
6. **Hunt dead frames.** `render_lab.py dead frames/` flags STILL (a stall inside motion), BLANK (an empty or flash frame) and JUMP (a pop or discontinuity). Fix the cause, re-render and re-grade. Done means **every frame grades at least 8/10 and dead.json is empty**, or each remaining flag is explained (for example, a JUMP that is the intended fast start of a spring). Stitch the review cut with `render_lab.py stitch frames/ out.mp4 --audio track.wav`.
7. **Videos: HyperFrames.** For launch videos, product demos and social clips, use the HyperFrames plugin (installed: HTML to deterministic MP4, `npx hyperframes init/preview/render`, skills `/hyperframes`, `/hyperframes-cli`). Build the composition from the same brand tokens and springs, then run steps 4-6 on its frames.

**MCP tools available:** Playwright and Chrome DevTools (drive pages, measure, trace performance, read the console), Firecrawl (scrape reference sites for the pattern study), Perplexity (research the industry and competitors). Perplexity and Firecrawl need `PERPLEXITY_API_KEY` / `FIRECRAWL_API_KEY` set as user environment variables.

## 7. Code checklist (Vercel Web Interface Guidelines)

Before verification, review the changed files against `references/interface-guidelines.md` (Vercel's rules: accessibility, focus, forms, animation, typography, content handling, images, performance, navigation/state, touch, safe areas, theming, i18n, hydration, copy, anti-patterns) and fix what applies. Highlights: semantic elements before ARIA, skip link, `:focus-visible` rings never removed, labels on every control, `…` and curly quotes, `Intl.*` for dates/numbers, explicit image sizes, no zoom blocking, URL reflects UI state.

## 8. Verification loop (max two rounds)

1. Build the whole thing first.
2. Open it in a real browser (Playwright / Claude in Chrome). Screenshot desktop 1440 wide and mobile 390 wide at minimum; add 1920, 1280, tablet and a resize sweep for anything layout-heavy; capture every chapter of a scroll scene (`references/qa.md`, `references/qa-motion.md`).
3. Check: horizontal overflow, clipped/overlapping text, contrast (text >= 4.5:1, UI >= 3:1), broken images, console errors, visible keyboard focus, hero visible in the first screen, light and dark, reduced motion.
4. **Break it** (Emil's break-ui pass): a worst-case fixture (longest names, empty, one, 1,000+ items, 200% zoom, 320 px, RTL). Report it as Broken / Ugly / Fragile.
5. **Score it honestly** (taste + impeccable): design 40 / usability 30 / creativity 20 / content 10, plus Nielsen's heuristics 0-4. Caps: any measured FAIL caps the score at 6.0; a three-line headline, gradient or "could belong to anyone" caps it at 6-6.5. Real Sites of the Day land around 7.5-8, so a self-score of 9+ is an error. Write animation reviews as a Before / After / Why table.
6. Fix everything found in one batch. Run one confirming round. Stop. Do not keep polishing.

## 9. Launch gate: security + legal (before anything goes live)

Run `references/launch-checklist.md` end to end and report PASS / FIXED / NEEDS OWNER / N/A, with evidence for each item.
- **Security (19 checks):** keys and env, admin routes, auth, access control/RLS, form sanitising, XSS, rate limits, API endpoints, CORS, security headers, debug off, dependency updates, unused packages, exposed files, DB access, password hashing, git-history secrets, and a full `security-audit` skill run.
- **Legal and trust:** privacy policy, terms, cookie policy, cookie-consent decision (block non-essential trackers until opt-in where required), refund policy, form consent, data minimisation, analytics and third-party embed review, business details, accessibility (alt text, contrast, keyboard forms, clear button labels), no fake reviews or unsupported claims, image licences, and applicable local laws (India DPDP / IT Act / Consumer Protection E-Commerce Rules / SEBI; GDPR, CCPA where visitors apply).
- Legal pages are drafts for a lawyer's review, never presented as legal advice. Unknown business facts get `CONFIRM` markers. Never claim compliance; list what wasn't verified.

## Quality floor

Responsive to phone width, WCAG AA contrast, visible focus, keyboard paths, real copy, touch targets ~44 px, light and dark if the brand needs both, no layout shift, no console errors.

## Hand-off

Deliver working files (local, on a branch, nothing deployed unless asked), the brand sheet, before/after screenshots, and a two-sentence summary of the design direction and what the verification loop caught. Report honestly what was verified and what wasn't.

## References

- `references/responsive.md` - layout architecture, 4K -> phone, viewport units, container queries, real traps and fixes.
- `references/motion-and-3d.md`, `references/motion-system.md` - motion hierarchy, microinteractions, scroll scenes, WebGL craft.
- `references/qa.md`, `references/qa-motion.md` - measured Playwright QA, viewport matrix, cross-browser, motion capture.
- `references/interface-guidelines.md` - Vercel Web Interface Guidelines (MIT), the code-level checklist.
- `references/craft.md` - Emil Kowalski / impeccable / taste: numbers, recipes, audit and critique scoring, conflicts resolved.
- `references/launch-checklist.md` - the 19 security checks + legal/compliance gate (policies, consent, accessibility, honest claims, local laws).
- `references/motionsites/` - spec template, techniques library with working code, builder prompt formats, media sourcing, the look-and-fix rubric (MIT part of MotionSites).
- `references/springs.md` - closed-form spring maths, the `linear()` generator, presets, the no-basic-easing lint.
- `scripts/render_lab.py` - headless frame capture, synthesised audio, beat-locked cuts, ffmpeg stitch, dead-frame hunt, contact sheets.
