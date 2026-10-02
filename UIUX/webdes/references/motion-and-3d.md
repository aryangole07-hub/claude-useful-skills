# Motion, scroll experiences and 3D

Motion is part of the UX system: it shows what changed, where something came from, what is interactive, and what matters. It is never decoration.

## Motion hierarchy

| Tier | What | Treatment |
|---|---|---|
| Primary | hero/scene transitions, route changes, the lead item | obvious, ~600-1200ms, depth/scale allowed |
| Secondary | important cards, tab panels, chart reveals, dropdowns | moderate, ~250-500ms, translate/opacity |
| Tertiary | list rows, hovers on minor items, metadata | minimal: a fade or nothing |

Let motion itself encode importance: the lead story gets the deepest entrance and the strongest hover; normal rows only fade.

## System, not one-offs

Build a few primitives and reuse them: one global reveal observer (`[data-reveal]` → `.is-in`, once, with a stagger var), a line-draw for charts (`pathLength=1` + dashoffset), count-up for headline figures, tabs with a travelling indicator, a skeleton shell per heavy route, tilt for cards that invite exploration, view transitions for route changes (shared-element names where an element really carries across pages).

Rules:
- Durations from a small set of tokens; two or three easing curves (out for arriving, in for leaving).
- Animate `transform` and `opacity`. Never width/height/top/left for motion.
- Never put a reveal transform and a hover/tilt transform on the same element — the later rule wins and silently kills the other (wrap one of them).
- Count-ups: render the final value server-side; only animate figures that start below the fold (dropping a visible number to animate it flashes a wrong value); add a safety timeout so a backgrounded tab never leaves a wrong number.
- Loading: skeletons that mirror the real layout (no spinners, no fake loading screens).
- No bouncing, no cheesy springs, no flashing, no infinite pulses on content.

## Reduced motion — nuance

Honor `prefers-reduced-motion` by removing **unrequested** motion: entrance animations, parallax drift, pointer-follow, looping cues, easing glides. Do **not** automatically delete a scroll-driven experience whose motion is directly controlled by the user's scroll — on Windows laptops the OS setting is often off by default/battery saver, and those users would otherwise get a degraded site. Under reduced motion, map scroll to the scene directly (no damping), stop idle motion, keep content static and readable.

## Scroll-driven / cinematic pages

Structure as one continuous journey, e.g. ARRIVAL → DISCOVERY → EXPLORATION → INFORMATION → PRODUCT → ACTION, where each chapter changes the scene meaningfully.

**The first-scroll rule.** The first wheel notch / small swipe must produce an unmistakable response:
- Measure progress from where the stage pins (sticky `top`), not from the page top — otherwise the first header-height of scrolling does nothing.
- Use an ease-OUT curve for the arrival chapter (steepest at the start), not smoothstep (flat at zero).
- Coordinate several responses on that first notch: camera moves, depth/perspective shifts, nearby data begins appearing, hero type lifts/fades a little, the scroll cue fades in proportion.
- Keep later chapters at cinematic pace; make chapter segments continuous (each starts exactly where the previous ended — damping can hide discontinuities but they still feel like hitches).
- Damping ~0.1-0.15 per frame: responsive but still a glide.

**Scroll affordance.** A small word + hairline that draws downward on a slow loop, fading out in proportion to the first scroll. No bouncing mouse icons.

**The ending must become the product.** Never end on a blank frame with a paragraph. As the camera lands on its last scene, crossfade the real, interactive product UI over it (the scene recedes behind a paper/ground veil a beat earlier so they never fight), then unpin so the product view scrolls naturally into the rest of the page. Make the overlay fit short windows (hide tertiary content under ~760px tall) and use container queries inside it.

**Fallbacks.** Decide the telling (3D vs flat) by real capability (size, WebGL), render both until hydration decides (CSS media queries choose), and catch runtime failures (chunk load, context creation) to fall back to the flat telling — never leave an empty stage.

## 3D craft (Three.js / R3F / Drei)

Use 3D only when space carries meaning (navigating data, product storytelling, spatial relationships, geography, cinematic transitions between information states). Every object maps to something real.

- Text in the DOM, projected from 3D anchors (crisp, accessible, on-brand type); scale/fade labels by distance; z-sort them; fade whole groups (cards, panels, ribbons) in and out with their chapter so earlier scenes never clutter later ones.
- Hold the **horizontal** field of view roughly constant so wide compositions fit any aspect ratio; reframe on narrow windows where copy moves below the scene.
- Do not let foreground objects from one chapter cut across another chapter's copy.
- Final scenes must show real data, not empty placeholder panels.

## 3D performance

Lazy-load the 3D module after first paint and only for capable viewports; cap DPR (~1.75); instancing for repeated geometry; no shadows/post-processing unless essential; render only while the camera is settling (stop the loop when idle); pause offscreen; dispose geometries/materials/renderer on unmount; simplify or replace on phones.
