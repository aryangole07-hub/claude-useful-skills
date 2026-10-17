---
name: webani
description: Premium web-animation and 3D method — turn a site into a cinematic, scroll-driven, motion-rich product experience without looking vibe-coded. Use when asked to add or redo a 3D/scroll hero, a landing-page animation, a motion system, micro-interactions, page transitions, or to make a site "feel premium/alive/cinematic". Pairs with the `webdes` skill (design, responsiveness, QA), which it builds on.
---

# webani

> Premium product design + cinematic motion + purposeful 3D + excellent UX.
> Never animate something just because it can be animated.

`webani` is the motion and 3D specialist. Load `webdes` alongside it for layout, typography, responsiveness and the measured QA method; everything there still applies.

## 1. Understand before you animate (mandatory)

Inspect the real site first: routes, components, design system (type, color, tokens), existing animations, assets, data/API, responsive behavior, landing structure. Then write down, in a few lines:

1. **Product** — what it actually does (verbs, not adjectives).
2. **Users** — who, and what they want in the first ten seconds.
3. **Value proposition** — the one transformation the product performs (X goes in → Y comes out).
4. **Visual metaphor** — a spatial picture of that transformation, built from the product's real nouns (its data, documents, entities, outputs). Reject metaphors that would fit any company (globes, spheres, particles, blobs, DNA helices, "tech grids").
5. **3D environment** — what the camera moves *through*, and why depth helps explain it.
6. **Scroll beats** — 3-6 chapters, each a state change of the same world, ending inside the product.
7. **Handoff** — which real UI the journey resolves into (a working search, a live preview, the first section of the app), not a slogan.
8. **Motion inventory for the rest of the site** — where motion communicates hierarchy, continuity, feedback or value; where it should be absent.

If a step has no honest answer, simplify (a 2D scene, or no hero animation) rather than inventing spectacle.

## 2. The scroll-driven hero

**Architecture (proven pattern):**
- A tall track (≈250-400 svh) with a sticky stage. The page always scrolls; scroll position *scrubs* the scene. **Never capture wheel/touch to step through chapters** — users read swallowed scrolls as a frozen page.
- Progress measured from where the stage pins (its sticky `top`), so the first pixel of scroll is progress.
- One world, one camera path (Catmull-Rom through keyframes, or per-chapter keyframes), chapters as windows on 0..1 progress. Each chapter starts exactly where the previous ended.
- **First-scroll rule:** an ease-out curve on the arrival chapter so one wheel notch produces an unmistakable change (camera moves, depth shifts, data appears, hero type lifts). Damping ~0.1-0.15/frame.
- Text is DOM, not WebGL: copy columns crossfade by progress; labels are DOM projected from 3D anchors (crisp, accessible, on-brand); fade/scale them by distance.
- Earlier chapters' objects must leave (fade groups/materials) so they never clutter later frames or cross the copy.
- Copy and scene share the frame by composition (copy column + scene region, or scene above copy on phones) — never body text over dense geometry.
- **The ending becomes the product.** The camera lands on the final object as the real, interactive UI resolves over it (scene recedes behind a ground-coloured veil a beat earlier), then the stage unpins straight into the next section. Never a blank frame, never a stranded paragraph.
- A subtle scroll cue (word + hairline drawing downward) fading in proportion to the first scroll.

**3D craft:** every object maps to something real in the product; instancing for repeated geometry; restrained lighting (hemisphere + one directional); fog to the page ground colour; materials and clear colour read from the site's CSS tokens and re-read on theme change; hold the horizontal field of view so wide compositions fit any aspect; reframe the camera on narrow/portrait windows.

**Adaptation, not shrinking:** pick the telling per capability — full 3D for ≥ ~720×500 with WebGL; a purpose-built 2D/2.5D version for phones or no WebGL (same chapters, same copy); render both until hydration decides (CSS media queries), and fall back on any runtime failure. Adjust camera distance, object counts, scroll length and label density per size class.

## 3. Motion across the rest of the site

Build a small motion system, then apply it consistently (details: `references/motion-system.md`):

- **Primary** (big, rare): hero journey, route transitions, the lead item.
- **Secondary**: section/card entrances (staggered, from depth, once), tab and panel changes, chart line draws, count-ups on headline figures (below the fold only), image reveals.
- **Tertiary**: hover/press feedback, focus, small state changes — fast (120-250ms), transform/opacity only.
- Magnetic buttons, cursor followers and parallax only where they reinforce a primary action or depth that exists — never site-wide by default.
- Scroll-position-linked effects (scrubbed) for things that represent position; one-shot entrances for things that simply arrive.

## 4. Anti-patterns (reject on sight)

Random abstract 3D objects; spinning globes; particle fields; DNA helices; neon/glow; purple-blue gradients; glassmorphism everywhere; floating cards with no job; fake 3D (tilt on everything); demo-reel effects; scroll-jacking; animations that end in an unfinished state; sections that feel disconnected; huge empty hero space; motion that slows reading.

## 5. Performance (non-negotiable)

Lazy-load the 3D module after first paint and only for capable viewports; DPR cap (~1.75); render only while the camera/scene is changing; pause offscreen (IntersectionObserver); dispose geometries/materials/renderer on unmount; instancing; no shadows/post unless essential; transform/opacity for DOM motion; `prefers-reduced-motion` removes *unrequested* motion (idle drift, parallax, loops, glides) while keeping user-scrubbed scenes (map scroll directly). Measure: no long tasks on scroll, stable frame times.

## 6. Finish it — the QA loop (do not skip)

Run the site and actually watch it (details: `references/qa-motion.md`):
1. Capture the journey at the very top, after one real wheel notch, at every chapter boundary, mid-transition, at the handoff, and just after the stage unpins.
2. Desktop 1920×1080, 1440×900, 1366×768, 1280×720, large monitors, tablet, phones (portrait + landscape); resize through in-between widths.
3. Look for: blank areas, abrupt changes, overlaps, unreadable text, clipped labels, objects from earlier chapters lingering, unfinished end states, layout shift, horizontal overflow, nested scrollers.
4. Chromium + Firefox + WebKit; light and dark themes if the site has both; reduced motion.
5. Fix causes, re-capture, repeat until the end of the hero hands off cleanly at every size.

Quality bar: *would a top-tier product studio ship this?* If not, improve composition, timing, hierarchy and storytelling — not the number of effects.
