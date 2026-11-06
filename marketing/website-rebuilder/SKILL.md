---
name: website-rebuilder
description: Find local businesses with ugly, outdated websites and rebuild their main pages as a premium, animated multi-page site using their real content and photos, plus AI hero images where real photos fall short. Produces the site, desktop and mobile screenshots, a scroll recording and a BEFORE/AFTER pitch card for outreach. Use when the user says "find an old/ugly website", "rebuild this site", "run the website rebuilder on <url>", "make a free website for <business>", or wants a sample site to pitch a local business.
version: "1.1-local"
---

# Website Rebuilder

The idea: find a business whose website is clearly old, rebuild it so it looks like a top agency made it, and use the before/after as your opener. Never quote a price to a prospect unless the user has confirmed it.

Scripts live next to this file in `scripts/` (installed copy: `~/.claude/skills/website-rebuilder/scripts/`). Setup: `pip install playwright pillow` then `playwright install chromium`.

**Design is done with the `uiux` skill** (`~/.claude/skills/uiux/SKILL.md`): load it before Step 4 and follow it fully (subject inventory and idea sentence, brand sheet as DESIGN.md, pattern per section, curve rule, render lab, verification loop, launch gate). The rebuilder-specific rules below are practical additions, and uiux wins where they differ.

## Step 1: Find a prospect - nearest first, then wider and wider

Always start next to the user and move outward. Close businesses are easier to visit, call and win, so never jump to a far city while nearer ones are unchecked.

1. Get the starting point: the user's address, area or `lat,lon` (ask once if unknown, then remember it for the session).
2. List businesses ring by ring, nearest first:
   ```
   python scripts/nearby.py "<start>" <niche> --rings 1,2,5,10,20,40 --min 15 --score
   ```
   It geocodes the start and lists the niche's businesses within 1 km, then 1-2 km, 2-5 km and so on, each ring sorted by distance, never repeating one. It keeps those with a website and scores each ring's sites (nearest first) with `score_sites.py` as it goes. It stops widening once `--min` sites are found, but always finishes the current ring. Output is `leads.csv` (distance, name, site, phone, address, Maps link). It uses OpenStreetMap (Overpass, falling back to Nominatim if Overpass is blocked); no API key is needed.
3. OSM misses some businesses. After each ring, also web search the niche plus the *locality names inside that ring* (nearest localities first), in the local language and English, and add the hits with their distance. Don't move to the next ring until this ring's candidates are scored.
4. Score, look and pick within the nearest ring that has good candidates:
   ```
   python scripts/score_sites.py https://a.com https://b.com ...
   ```
   Signals: no mobile viewport (+3), table layout (+2), © year before 2022 (+2), no HTTPS (+2), `<font>`/marquee (+2), old jQuery (+1). It also flags free shop builders and whether a contact form exists.
5. Screenshot the top 2-3 and look at them. The score finds candidates; your eyes pick. A site can score low and still look dated, or score high and be fine. Between two similar prospects, the closer one wins.
6. Present the top pick + one backup, with distance and reasons, then build on approval.

Best niches: small trades and clinics that clearly make money (contractors, pest control, aircon, dental, spa, gym, repair shops).

Tip: search for the footer text of an old free website template plus a trade word. Every hit is the same old template. Also compare phone numbers across prospects: one owner often runs several sites, which is a two-site deal.

### Step 1b: Is the business alive? (before building anything)
Building costs time and image credits, so only build for businesses that show they are alive. Old website + busy business = best lead.
1. `python scripts/alive_check.py <urls>`: domain renewal, SSL date, shop "last updated" banners, social links.
2. Google Maps: rating, review count, date of the newest review, owner posts, opening hours, "Permanently closed". This is the strongest signal.
3. Score 0-100%: reviews or owner posts in the last 6 months = 85%+. Site activity only = 55-70%, call first. Nothing recent = skip.
4. Red flags: several unrelated businesses on one phone number (a lead-gen operator, not a real company), or a newer second website you did not know about.

## Step 2: Harvest real content

```
python scripts/scrape_site.py https://oldsite.com about/ contact/ services/ --download raw
```
Collect: business name, phones, email, chat apps and socials, address, years in business, team size, services list (their category pages are gold), credentials, unique claims (24h, free quote, warranty). Use every real fact you find. Invent nothing a customer would rely on.

Photos: make a contact sheet of `raw/` and look at it.
- Decent real photos of their work or place: use them (gallery, about, "why us").
- Collage images: crop the single tiles out with PIL and use the best ones.
- Promo posters, banners with baked-in text, or another brand's material: do NOT use.

## Step 3: AI hero images (only where real photos fall short)

Any good image model works (Higgsfield, ChatGPT, etc). Typical set of 3-5: a wide 16:9 hero with clean empty space on the left third for the headline, a trustworthy person 4:5 (owner, dentist, foreman), 1-2 finished-result shots, a team shot.

Prompt pattern: `Photorealistic ... [local setting] ... [people matching the local market] ... natural light, [lens], editorial photography. No text, no logos, no watermarks.`

Convert to JPG, resize to 1920 px wide (hero) or 1000-1200 px (others), quality about 84.

## Step 4: Build from a template first (user rule, 2026-11-06: templates save credits)

```
python scripts/tpl.py list                         # templates/INDEX.md: template -> niches
python scripts/tpl.py new <template> sites/<biz>   # engine + template copied, HTML shells written
```
1. **A template fits the niche** (check INDEX.md's niches column): `tpl.py new`, then only:
   - `content.js`: replace every SAMPLE fact with the business's real ones (Step 2); drop sections you have no real content for, reorder or add sections from the engine's list. Keep it strict JSON after `window.SITE = `.
   - `theme.css`: their brand colours (from their logo / signboard) and, if the template's fonts clash with their character, a new font pair.
   - `img/`: their photos (Step 2) and any AI images (Step 3), at the paths content.js names.
   - `python scripts/tpl.py shells sites/<biz>` after changing pages or titles.
   Skip the full uiux design pass: the template already passed it. Still run Step 5 (verify) on every site.
2. **No template fits**: design it per the uiux skill as below, but build it ON the engine (new section types go into
   `templates/_engine/engine.js` + `engine.css`, so every template gains them). When it passes Step 5, save it:
   `python scripts/tpl.py save sites/<biz> <name> "<niches>" "<one-line layout summary>"`, then replace that business's
   real facts in `templates/<name>/content.js` with SAMPLE ones. Every new niche becomes a template the next time.
3. Improving the engine (a bug, a better section) helps all templates; keep changes backward compatible with existing content.js files.

Site layout: `index.html` + 3 inner pages (each a thin shell, `<body data-page>`), `engine.css`, `engine.js` (shared, not edited per site),
`theme.css`, `content.js`, `img/`. The engine injects the header, footer and floating call/WhatsApp buttons and renders each page's
`sections` (hero split|full, pagehead, stats, cards, split, plist, tiles, people, steps, gallery, quotes, notices, chips, faq, cta, contact).

### Design rules
- **New designs (no template fits) run the `uiux` skill** for direction, layout, type, colour, motion and verification. Within a template, the per-site choices are brand colours, fonts and which sections to show; don't default to "navy and gold for law" or "cream for cafes" when picking the brand.
- **Section rhythm:** pick each section's pattern by what this business needs to prove (uiux section 3). A typical home page still covers hero, trust (years, jobs, rating), services, how it works (only if it's a real sequence), work/gallery, why us, real testimonials, call to action, contact. Neighbouring sections never share a layout.
- **Motion:** follow uiux's curve rule (entrances ease out, exits ease in, interface springs with slight overshoot, nothing linear) and its one orchestrated moment. No fade-and-slide on every section.
- **Always:** a sticky header with the phone number, a floating call / chat button on mobile, real photos above stock, every phone number and chat link clickable.
- **Non-Latin languages** (Thai, etc): pick fonts that include those glyphs (for Thai: Kanit headlines + Sarabun body). Don't split words with letter-animation libraries on languages without spaces.
- **Hero layout:** if the hero background already shows the people, drop the side photo panel. Put desktop-only grid rules inside `@media (min-width:861px)` so they never squeeze mobile.
- **Nav overflow:** hide the header phone number below about 1180px or the nav causes sideways scroll on laptops. Add `html{overflow-x:clip}`.
- **Counters:** don't count up to a year (2007). Show it as plain text.
- **No sparkle / magic-wand icons.** Use plain icons.
- **No em-dashes or en-dashes** in customer-facing copy.
- **Escaping trap:** when writing CSS with icon codes like `\f00c` from a shell heredoc or a Python string, the backslash can get eaten and become a control character, which silently breaks every CSS rule after it. Write CSS files directly, and scan before shipping: `python -c "import glob;[print(f) for f in glob.glob('**/*.css',recursive=True) if any(b<32 and b not in (9,10,13) for b in open(f,'rb').read())]"`
- **Placeholders:** testimonials and ratings you could not verify are samples. Mark each with `<!-- SAMPLE: replace ... -->` so they never go live. Same for unconfirmed facts (`<!-- CONFIRM: ... -->`).
- Forms show a demo success message only (no backend) until the client buys.
- Plain, simple copy (6th-grade level). Mirror the business's language.

## Step 5: Verify (never skip) - uiux verification loop + launch gate

```
python -m http.server 4812 --directory <site-folder>
python scripts/shoot.py http://localhost:4812 index,services,portfolio,contact _shots
```
Then run uiux's verification loop (break-it pass, honest scoring) and its launch gate (`references/launch-checklist.md`: no fake reviews, image licences, business details, privacy/cookie basics) before anything is shown to the owner. Every page must show `overflowX=0` at desktop AND mobile, with no console errors (a favicon 404 is fine). Open the PNGs and actually look at them; split tall screenshots into 3 chunks to view. Fix and re-shoot. The script also saves `home-scroll.webm`.

## Step 6: Outreach asset

Owner-facing pitch card (desktop + phone, old vs new, labels in the owner's language):
```
python scripts/pitch_card.py <old-url> <new-url> "<Business name>" pitch/<site>.jpg --lang th|en --accent "#hex"
```
Simple side-by-side:
```
python scripts/before_after.py <old-url> http://localhost:4812/ before-after.jpg "#F4821F"
```
Deploy a preview (Cloudflare Pages, Vercel, Netlify) only when the user says so, because it makes the site public, and add `noindex` so it stays out of search. Only show a business's old site publicly (ads, posts) with their permission. The outreach message and channel are the user's call; a hand-sent message beats an auto-submitted form.

## Output checklist
- [ ] Prospect picked nearest-first (distance stated)
- [ ] uiux design pass + verification + launch gate done
- [ ] Built from a template (named), or a new design saved with `tpl.py save` and listed in templates/INDEX.md
- [ ] Site folder with 4 pages, shared css/js, compressed images
- [ ] All real facts used, nothing invented outside SAMPLE/CONFIRM-marked spots
- [ ] Desktop + mobile screenshots, overflowX=0 everywhere, recording saved
- [ ] Pitch card / before-after image
- [ ] Summary to the user: what's real, what's a placeholder, what's not wired up (forms, missing chat ID, etc)
