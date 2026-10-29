# Motion system

Define once, reuse everywhere. A site with twelve hand-tuned animations reads as a demo; a site with four primitives used consistently reads as a product.

## Tokens

- Durations: `tap` 110ms · `quick` 220ms · `move` 380ms · `tell` 700-900ms (values the reader watches: counts, chart draws) · `scene` 1000ms+ (hero only).
- Curves: one ease-out for arrivals (`cubic-bezier(0.16, 1, 0.3, 1)` or `[0.22, 1, 0.36, 1]`), one ease-in for exits, optionally one slight overshoot for things that land physically. No springs that bounce visibly.

## Primitives

| Primitive | Use | Implementation notes |
|---|---|---|
| Reveal | sections/cards arriving | one global IntersectionObserver adding `.is-in` once; stagger via a CSS var; from depth (translateY + slight translateZ/rotateX), not a plain fade-up on everything |
| Line draw | charts, rules, progress | SVG `pathLength="1"` + dashoffset; redraw on range change |
| Count-up | headline figures | final value server-rendered; animate only if below the fold at load; safety timeout |
| Scrub | anything representing position (progress rails, timelines, a reading head) | `useScroll`/scroll listener + rAF; reversible |
| Tabs/segments | state switches | a travelling indicator + short panel fade |
| Shared element | card → page, row → detail | View Transitions (`view-transition-name`) or FLIP |
| Press/hover | buttons, rows, cards | ≤ 220ms; transform/colour only; a leading icon may nudge 2-3px |
| Skeleton | loading routes | mirrors the real layout; slow sweep; no spinners |

Rules: never put a reveal transform and a hover/tilt transform on the same element (wrap one); never animate layout properties; respect reduced motion in every primitive; motion hierarchy — the lead gets more, rows get less.

## Where motion usually earns its place

- Navigation: active indicator that travels; route transitions that keep the chrome still.
- Data: lines draw along their axis, bars grow from their baseline, numbers count — because that is what the measurement does.
- Lists of items with a "current" one: scroll-position-linked emphasis (weight/opacity by distance from a reading line).
- Primary CTA: a modest magnetic pull or arrow nudge — one, not every button.
- Media: images fade in once decoded; a single slow parallax on a hero image at most.

## Where it does not

Body copy, legal/trust statements, dense tables (except row hover), anything the user is trying to read or compare, and anything that would replay every time it scrolls past.
