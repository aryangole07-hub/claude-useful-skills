# Craft additions: Emil Kowalski (animation polish), impeccable (layout and craft), taste (unique design)

Distilled 2026-10-29 from emilkowalski/skills (MIT), pbakaus/impeccable (Apache-2.0) and Leonxlnx/taste-skill (MIT); paraphrased. Where a source conflicts with the uiux curve rule, the curve rule wins (flagged below).

## From Emil (animation polish)
Source: Emil Kowalski skills, MIT licence (c) 2026.

**Gate before animating**
- Frequency: 100+ uses a day (shortcuts, command palette) means no animation; tens a day (hover, list nav) means near-imperceptible or none; occasional (modals, drawers, toasts) is normal; rare or first-run (onboarding, success) is where delight and bounce belong.
- Keyboard-initiated actions are never animated.
- Name a purpose: feedback, spatial consistency, state indication, preventing a jarring change, explanation, or delight (rare tier only). "Looks cool" on a frequent element is a stop.
- Data the user reads or acts on does not move for style. Zero animation code is a valid result; opportunity reviews must also list 2-5 rejected candidates and the question that killed each.

**Numbers**
- Durations: press 100-160 ms; tooltips and small popovers 125-200; dropdowns and selects 150-250; modals and drawers 200-500; keep UI under 300. A 180 ms dropdown feels faster than a 400 ms one.
- Press scale 0.97 on `:active` (range 0.95-0.98), responding on pointer-down, not release.
- Never enter from `scale(0)`; start at 0.9-0.97 plus opacity 0.
- Stagger 30-80 ms, decorative, never blocks input.
- Blur to mask a crossfade that will not settle: 2-5 px, hard cap 20 px.
- Tooltips: delay on the first, then instant (0 ms) for neighbours while one is open.
- Flick dismissal: dismiss when |distance| / elapsed ms exceeds about 0.11, whatever the distance.
- Spring defaults (Apple style): damping 1.0, response 0.3-0.4 s; bounce (damping about 0.8) only when the gesture carried momentum. Motion equivalent: `bounce 0` or `0.1-0.3`, `duration 0.4-0.5`. Sheet 0.8/0.3, reposition 1.0/0.4.
- Momentum projection for snap points: position + (v/1000) * d / (1 - d), d about 0.998 (0.99 snappier); snap to the point nearest the projection and hand the release velocity to the spring.
- Rubber band at edges: `(over * dim * 0.55) / (dim + 0.55 * |over|)`; friction, never a hard stop.

**Behaviour rules**
- Origin-aware: popovers, menus, dropdowns scale from the trigger; modals stay centred.
- Exit along the entrance path; mirror the curve on reversible transitions.
- Asymmetric timing: slow where the user is deciding (hold-to-confirm fill about 2 s), fast where the system responds (release about 200 ms).
- Interruptibility: rapid-fire UI (toasts, toggles) uses transitions, not keyframes, so they retarget instead of restarting. Gestures use springs started from the live on-screen value; blend velocity at a reversal; separate X and Y springs.
- Drag: pointer capture, keep the grab offset, ignore extra touches, about 10 px threshold before committing direction, hint motion toward the outcome.
- Gate hover effects with `@media (hover: hover) and (pointer: fine)`. Use `@starting-style` for CSS-only entrances.
- `clip-path: inset()` recipes: tab colour change (duplicate the tab list, clip the active copy), hold-to-delete overlay, scroll image reveal, comparison slider.
- Reduced motion means fewer and gentler, not none: keep opacity and colour, drop travel.
- Match motion to personality (playful can bounce, dashboards stay crisp). Review next day, at 2-5x slow motion and frame by frame; test gestures on a real device.

**Performance extras**
- Cost tiers: composite-only (transform, opacity, and in current Chrome/Firefox filter, clip-path, background-color); paint (box-shadow, border-radius, color); layout (width, height, margin, top, left). Animate `filter: drop-shadow` instead of `box-shadow`.
- Budget 16.7 ms a frame at 60 Hz, 8 ms at 120 Hz.
- Never write a drag value to an inherited CSS variable on a parent; set `transform` on the element. In React, never animate through state; write the ref's style or a motion value.
- Motion's `x/y/scale` shorthand is main-thread; use a full `transform` string for composited motion. CSS and WAAPI survive page-load jank better than rAF.
- `will-change` only after a 1 px shift or measured drops.

**Review formats**
- Code review as a Before / After / Why table, one row per issue.
- break-ui worst-case pass: tabulate every rendered value with source and limit; build one fixture of worst values plus empty, one, and 1,000+ items; add a Demo / Worst-case toggle; check at real container width, 320 px, widest, 200% zoom, dark and RTL. Typical fixes: `flex-shrink:0` on avatars and actions, `min-width:0` on text columns, `overflow-wrap:anywhere`, `Intl.PluralRules`, `Intl.Segmenter` initials, top-align rows once text can wrap, virtualise long lists. Report as Broken / Ugly / Fragile.

**Conflicts with the curve rule (uiux wins; flagged, not dropped)**
- "Never ease-in on UI" versus uiux's required ease-in exits: keep ease-in for exits; Emil's point still holds for anything the user watches arrive.
- Emil's ease-in-out for on-screen movement, plain `ease` for hover and colour, `linear` for marquee, progress and the 2 s hold fill: all banned by uiux. Use the tokens or a spring; for the hold fill use an eased segment.
- Emil's default of no overshoot (damping 1.0) versus uiux's 2-5% overshoot on all interface motion: keep uiux. Borrow the refinement: top of the overshoot range after a flick or drag release, bottom of the range for menus fading in.
- His 300 ms UI cap sits inside uiux's 200-450 ms entrance band; use the low end on frequent surfaces.

## From impeccable (layout and craft)
Source: impeccable v4.8 by Paul Bakaus, Apache 2.0. Most of it is tooling; the craft content follows.

**Process**
- Pick a visitor mode and scale ambition: Persuade (landing pages: bold), Operate (apps, dashboards: scanability and precision), Read (docs: comprehension), Experience (portfolios: the artifact leads). Mode follows the surface, not the product.
- Refinement keeps the incumbent identity; redesign treats the old look as evidence to replace. Ask before changing factual copy.
- Write a spatial thesis before editing: reading path, what groups and what separates, who leads, density and rhythm, behaviour at content extremes.
- Choose a colour strategy first: Restrained (tinted neutrals plus one accent), Committed (one saturated colour owns 30-60%), Full palette (3-4 roles), Drenched.
- Memory test for the first viewport: what would someone describe an hour later? It should demonstrate the mechanism, not be a header.
- Two isolated passes (design judgement before any automated scan, then mechanical scan), then merge. A clean scan is a floor, not proof.

**Layout and type**
- Squint test: blurred, primary, secondary and groups still read in order.
- Group by proximity before adding containers. Cards are the lazy container; nested cards are always wrong.
- Rhythm needs contrast between tight and generous intervals; more space above a heading than below. Spacing scale on a 4-unit base with role names; `gap` for siblings.
- Responsive means structural change (reorder, collapse, reflow); DOM and focus order must match visual order.
- Touch: 44 px target (WCAG 2.5.8 floor 24 px with spacing); sliders and drag surfaces need pointer events and `touch-action`.
- Body at least 1rem, measure 45-75ch, display at most 6rem, tracking floor -0.04em, `text-wrap: balance` on headings and `pretty` on body. Leading is inverse to measure; light text on dark gets more leading, tracking and a weight step. Paragraph spacing or first-line indent, not both. Hard heading breaks only between phrases.
- Treat the first display font that comes to mind as spent (it lists Fraunces, Playfair, Cormorant, Space Grotesk, Inter-as-display, DM Sans and others).

**Colour**
- Use OKLCH for new palettes. Define roles, not swatches: canvas, raised surface, text 1/2, action, focus, border, four states, data.
- Text on coloured surfaces is tinted from that hue, never generic grey. Dark mode is designed elevation, not inversion. Colour is never the only data code.
- Warm, bookish or child subjects drift to cream plus serif plus lamplight; treat that first palette as spent.

**Craft floor**
- Theme the browser surfaces: text selection, caret, scrollbars, focus rings, underline offset, tabular numerals.
- Shadows need offset and soft blur; a zero-offset coloured halo is decoration.
- States: hover, disabled, loading, error, empty, plus real content and keyboard focus.
- Polish triage order: blocked tasks and data loss, missing states, flow and system drift, visual and motion, cleanup. Classify drift as missing token, one-off, conceptual mismatch or local defect.

**Extra refusals**: section numbers without real sequence; hero-metric template; gradient text; coloured side-border above 1px; hard offset shadows outside real neobrutalism; sparklines and rings as filler; monospace as a "technical" costume; emoji as icons; geometric masks faking organic cutouts; light or dark chosen by category rather than use scene; a modal for a task needing neither interruption nor focus.

**Audit and critique**
- Audit scores 0-4 on accessibility, performance, theming, responsive and implementation integrity (total /20), with severity-ranked findings and systemic patterns.
- Critique scores Nielsen's 10 heuristics 0-4, a cognitive-load checklist (flag decisions with more than 4 visible options), persona red flags, and a design-specificity verdict: could an unrelated product use this unchanged?
- A global 0.01 ms reduced-motion kill is a finding; keep state change and hierarchy.
- Its motion table (100-150 feedback, 150-300 state, 300-500 overlay, 500-800 focal) and `cubic-bezier(0.16,1,0.3,1)` match uiux. Its "no bounce by reflex" is milder than the overshoot rule; uiux wins.

## From taste (unique design)
Source: taste-skill v2 by Leonxlnx, MIT licence (c) 2026. Built from a study of 247 gallery sites; ships Node scripts (draw, lint, inspect, assets, scenes) and a JSON library of directions, palettes, heroes, sections, type.

**Forcing distinct art direction**
1. Inventory the subject: 8-12 things belonging to this client alone (name and meaning, street, materials, hours, constraints, printed artefacts, numbers). The idea and the picture search come from this list.
2. Write the page as claims with proof; a section without a claim is deleted.
3. Random draw: a script deals 3 of 20 directions; pick the best fit, then it deals type, palette, hero and section blueprints. Adopt the sheet; redraw a slot only for a stated reason (brand conflict, missing asset, content cannot fit). uiux can copy this without the script: list three candidate directions, choose against the inventory, log why.
4. Idea sentence: "On this page, [thing from the subject] becomes [device]." Competitor test: if the nearest competitor fits the sentence, it is a category idea.
5. One live thing built from real content (configurator, real calculator, live status), phone-friendly with a no-script fallback.
6. Carry the idea into pricing, FAQ and footer; neighbouring sections never share a layout.
7. Imagery order: own, generated, real credited pictures from open archives (Openverse, Wikimedia, Art Institute, the Met), drawn, then type and colour alone. Floor of four real pictures; SVG drawings do not count.

**Numbers**
- Type: 2-3 visible sizes far apart, five maximum; display at least 4x body; display tracking -0.02 to -0.05em, leading 0.85-1.05; body 16-20 px at 1.45-1.6; headlines at most two lines at every width (about 32 characters); left-align, centre once at most.
- Space: one pair of equal outer margins (16-32 px); section gap 120-240 px; nothing empty over half a screen; asymmetry inside the grid, never in the frame; each desktop screen should hold as a poster.
- Colour: ground 70-90%, one ink, accent under 5% of any screen and not on headings, icons or underlines; tone steps instead of lines; running text in full ink.
- Buttons flat, square or full pill decided once; nav is wordmark, 3-5 links, one action.
- Motion: parallax travel under 8%; blur-in at most 8 px for 600 ms, never on body text; stagger 60-90 ms rising 16-32 px.

**Browser check**
- `inspect.mjs` loads the page in real Chrome at 1440, 768, 390 and measures headline lines, loaded fonts, contrast, overflow, margin symmetry, empty stretches, titles and moving elements. Fix every FAIL; defend every WARN in one sentence. Gate on the production build.
- Then read the screenshots against 14 critique passes, scored design 40 / usability 30 / creativity 20 / content 10. Caps: any FAIL caps at 6.0; a three-line headline, gradient, resting shadow or hairline caps at 6.5; "could belong to anyone" caps creativity at 6; under four real pictures caps design at 6.5. Real Sites of the Day score 7.5-8.0, so a self-score of 9 is an error. At most three look-and-fix rounds.
- Dashboards use a separate rule set: quiet borders and repeated panels are fine; no gradients, glows, tinted icon squares, rainbow charts or invented vanity numbers; real data that adds up, one finding stated.

**Conflicts with uiux (flagged)**
- Taste bans hairlines and all resting shadows; uiux prefers hairline borders plus tonal steps. Use tonal steps first, hairlines only for tables and dense data.
- Taste bans overshoot on interface elements and permits ease-in only on short exits (60-70% of the entrance); the exit rule matches uiux, the overshoot ban loses.
- Taste uses ease-in-out for wipes and panels; uiux bans it. Use the enter token or a spring.
- Taste wants 8-16 moving elements and a staggered entrance in every section; uiux rejects fade-and-slide everywhere. Keep one orchestrated moment plus micro-motion.

## Not worth adopting
- Emil `write-swift`, `mobile-native`, `animate-expo`, `ask-sonner`, `pick-ui-library`, `prototype`: native or library-specific.
- Emil's plain `ease`, `linear` and no-ease-in defaults: conflict with the curve rule.
- Impeccable's CLI, PRODUCT.md/DESIGN.md, live variant mode, concept-seed dice, comp-led build state machine, image-generation comps, hooks, doctor: heavy tool infrastructure; take the ideas only.
- Impeccable `bolder`, `quieter`, `overdrive`, `delight`: restate rules uiux already has.
- Taste's absolute bans on all monospace, eyebrows, gradients and index numbers: owner preference; uiux already limits them and the brief wins.
- Taste's four-picture floor and archive hunt: right for brand sites, wrong for dashboards and data products.
- Taste's scroll-scene library: overlaps `references/motion-and-3d.md`.
- Fixed banned-font lists: they go stale; use the derive-from-the-subject procedure.
