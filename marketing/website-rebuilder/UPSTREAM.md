# website-rebuilder

Forked from [pantheonmarketing/claude-website-rebuilder](https://github.com/pantheonmarketing/claude-website-rebuilder) (MIT, see `LICENSE`) and **modified** here:

- `scripts/nearby.py` (new): nearest-first prospect search on OpenStreetMap (Overpass, falling back to Nominatim), ring by ring (1, 2, 5, 10, 20, 40 km), with scoring as it goes.
- `SKILL.md`: Step 1 is nearest-first; design, verification and the launch gate hand off to the [`uiux`](../../design/uiux) skill.
