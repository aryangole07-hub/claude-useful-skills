---
name: pro-design
description: Superseded - folded into the uiux skill; use uiux for any website, landing page or UI work. Kept only as the short reference for the four-part process (brand, pattern library, motion, verification loop).
---

# Pro Design

The brief wins. If the user pins a style, font, palette or era, follow it exactly. Everything below fills gaps.

## 1. Brand first (before any code)

- Look for brand files: BRAND.md, DESIGN.md, CLAUDE.md, a tokens or theme file, a logo, the live site.
- If none exist, write a short brand sheet: 4 to 6 named hex colors, two typefaces with clear roles, a voice in one sentence, and one signature element. Show it to the user once and confirm.
- Put every color, font, size and space in CSS variables. No hardcoded values in components.
- Choose typefaces for this subject, not the families you would use on any project.

## 2. Pattern library (before layout)

- Choose a pattern for each section and say why: hero (demo-led, product-shot-led, type-led, proof-led), feature rows, comparison, pricing, FAQ, testimonials, process steps.
- Use numbered steps only when the content is a real sequence.
- If a browser or search tool is available, study two or three strong sites in the same industry first.
- Reject these defaults unless the brief asks for them: cream background with a serif and a terracotta accent; near-black with one acid-green or orange accent; purple gradients; identical rounded cards with the same shadow; a small ALL CAPS label above every heading; one word of every headline in a different color.
- Open with the most characteristic thing in the subject's world. Spend boldness in one place and keep everything else quiet.

## 3. Motion

- One orchestrated moment: a hero load sequence or one scroll scene.
- Add motion that answers an action: hover, focus, open, close, confirm.
- UI transitions run 150 to 250ms. Hero sequences run 600 to 900ms. Use ease-out.
- Respect prefers-reduced-motion. Never leave content hidden waiting for an animation.
- No fade-and-slide on every section. No hover transform on every card.

## 4. Verification loop

- Build the whole site first.
- Open it in a real browser (Playwright or Claude in Chrome).
- Screenshot desktop at 1440 wide and mobile at 390 wide.
- Check: horizontal overflow, clipped text, contrast, broken images, console errors, visible keyboard focus, hero visible in the first screen.
- Fix everything found in one batch. Run one confirming round. Stop.
- Maximum two rounds. Do not keep polishing.

## Quality floor

Responsive to phone width, WCAG AA contrast, visible focus states, real copy (no lorem ipsum), light and dark handled if the brand needs both.

## Hand-off

Deliver working files and a two-sentence summary of the design direction and what the loop caught.
