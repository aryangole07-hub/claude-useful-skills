---
name: webdes
description: Senior product-designer + frontend-engineer method for building, redesigning, polishing or fixing any website or web UI so it looks intentionally designed, not AI-generated. Use whenever the task is to create, improve, restyle, make responsive, animate, add 3D/scroll experiences to, or QA a web page, landing page, dashboard, editorial site, portfolio, store or web app.
---

# webdes

Ask first, every time: **how would an excellent product designer and a senior frontend engineer approach this?** Then work that way.

> Do not optimize for visual complexity. Optimize for intentionality.
> Nothing on the page should feel accidental.

The principles below are defaults, not a template. Adapt them to the project; never stamp the same look onto every site. The user's own words always win (if they ask for a gradient, they get a good gradient).

## Operating procedure

1. **Inspect before touching.** Read the routes, layout shell, styling system, design tokens, components and data shapes. Find what already works.
2. **Preserve good work.** Improve the implementation before redesigning the design. Never rewrite components, routes, styling systems or architecture that do not need it.
   - "Don't redesign the UI" means KEEP visual language, components, colors, type, layout concept and IA; IMPROVE responsiveness, spacing, motion, performance, compatibility and polish only.
3. **Design before code** for any significant page. Fix, in a few lines: user goal · primary action · information hierarchy (primary / secondary / tertiary) · page structure · responsive behavior · interaction model · motion model.
4. **Implement the simplest robust architecture**: grid/flex, container queries, clamp(), intrinsic sizing, tokens. Relationships, not coordinates.
5. **Diagnose causes, not screenshots.** When something looks wrong, measure it (bounding rects, computed styles, scroll metrics) and fix the structural cause (the grid, the container, the unit), not with a nudge.
6. **Make responsive behavior deliberate** at every size class (see references/responsive.md).
7. **Add motion where it serves UX**, in a hierarchy (see references/motion-and-3d.md).
8. **Add 3D only when it communicates something.**
9. **QA like a user and like an engineer** — measured, at unusual sizes, in other engines (see references/qa.md).
10. **Final polish pass**, then the Anti-Vibe check below. Report honestly what was verified and what could not be.

## Anti-Vibe-Coding

Actively hunt for and remove the tells of generated design. Avoid unless the brief justifies it:

- gradient washes, purple/blue "AI" gradients, neon, glow borders, excessive blur or glassmorphism
- random blobs, floating spheres/cubes, meaningless particles, spinning objects
- the SaaS card kit: everything in identical rounded cards, one radius everywhere, the same soft shadow under each
- pills and badges everywhere; arbitrary shadows; decorative elements with no job
- huge meaningless hero text; giant empty hero sections; excessive whitespace that is really missing content
- generic dashboard layouts; default component-library aesthetics; stock-looking illustrations
- "AI startup" chrome: tracked all-caps eyebrow over every heading, `A · B · C` meta strings everywhere, `→` on every link, one accent word in the headline
- animations with no UX purpose; motion everywhere at the same intensity

**The test for every element:** does it improve comprehension, hierarchy, interaction, storytelling, orientation or feedback? If not, remove it.

## Core principles (short form — details in references/)

- **Hierarchy.** Within seconds a user knows what the page is, what matters most, what they can do, what is secondary, and where to look next. Use scale, type, contrast, spacing, position, density and motion. Never make everything equally important.
- **Typography is a primary system.** Few families (one or two, clearly distinct), few weights, a real scale, consistent line-heights, good wrapping (`text-wrap: balance` on headings), fluid sizing. Editorial products: serif display + clean sans UI. Technical products: one highly legible sans.
- **Spacing is a system.** One scale; spacing encodes grouping and rhythm. Distinguish intentional whitespace from accidental empty space (fixed heights, bad grid definitions, capped children inside wide columns, oversized viewport sections). Keep the first, eliminate the second.
- **Color carries meaning.** Mostly neutral; color reserved for state (positive/negative), interaction and emphasis. The design must still work nearly monochrome.
- **Surfaces.** Prefer hairline borders and tonal steps over heavy shadows; controlled depth.
- **Density is a choice.** Information-dense products (finance, analytics, research, enterprise) stay dense, made legible by alignment, grouping, typography and restrained color — not exploded into giant cards.
- **Editorial hierarchy for content.** Tier 1 (major) / Tier 2 (important) / Tier 3 (normal): size, placement, image scale, type and motion step down together. Drive tiers from real ranking/importance data when it exists; never fabricate importance to make the layout look varied.
- **Accessibility is not optional.** Semantic HTML, keyboard paths, visible focus, contrast (text ≥ 4.5:1, UI ≥ 3:1), reduced motion, real labels, touch targets ≥ ~36-44px.
- **Performance is design.** Lazy-load heavy code (3D) after first paint, code-split, sized/lazy images, transform/opacity animation, render loops that sleep when idle.
- **Honest data.** Real or clearly-labelled sample data, never lorem ipsum, never invented numbers presented as real.

## Reference files

Read the one(s) the task needs:

- `references/responsive.md` — layout architecture, desktop 4K → mobile, window resizing, viewport units, container queries, and the concrete traps (with fixes) that break real sites.
- `references/motion-and-3d.md` — motion hierarchy, microinteractions, scroll-driven/cinematic pages, the first-scroll rule, landing → product handoff, WebGL/Three.js craft and performance, reduced motion.
- `references/qa.md` — the measured QA method (Playwright scripts), the viewport matrix, cross-browser checks, and the final design-quality review.

## Final quality gate

Before calling anything done, answer honestly: Composition strong? Hierarchy instant? Typography intentional? Whitespace controlled? Works at arbitrary sizes? Motion improves UX? 3D purposeful? State changes clear? One coherent system? Runs smoothly? Could ship as a premium commercial product? **Anything that looks AI-generated? If yes, simplify it.**
