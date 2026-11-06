# website-rebuilder

Forked from [pantheonmarketing/claude-website-rebuilder](https://github.com/pantheonmarketing/claude-website-rebuilder) (MIT, see `LICENSE`) and **modified** here:

- `scripts/nearby.py` (new): nearest-first prospect search on OpenStreetMap (Overpass, falling back to Nominatim), ring by ring (1, 2, 5, 10, 20, 40 km), with scoring as it goes.
- `SKILL.md`: Step 1 is nearest-first; design, verification and the launch gate hand off to the [`uiux`](../../design/uiux) skill.
- `templates/` (new, 2026-11-06): template library so a site is filled in, not designed from zero. A shared engine
  (`_engine/engine.css` + `engine.js`: header, footer, call/WhatsApp buttons, 16 section types, eight "looks") and eight
  niche templates (school, clinic, restaurant, hotel, services, shop, studio, professional), each a `content.js` +
  `theme.css` with sample content and a one-line design idea in its `DESIGN.md`. Designed with the uiux skill.
  `_build/make_templates.py` regenerates them; `INDEX.md` maps niches to templates.
- `scripts/tpl.py` (new): `list`, `new <template> <site>`, `shells <site>`, `save <site> <name> ...` (every new design becomes a template).
