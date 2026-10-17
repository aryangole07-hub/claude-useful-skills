# Visual + technical QA

"Does this look intentionally designed at this size?" — not "does the CSS technically fit?"

## Measure, don't eyeball

When a browser automation tool is available (Playwright via Python/Node, or a browser MCP), run a measured sweep instead of trusting a few screenshots. Per route × viewport, record:

- `document.documentElement.scrollWidth > innerWidth` (horizontal overflow)
- elements whose `getBoundingClientRect().right > innerWidth` (excluding intentional horizontal scrollers)
- nested scroll containers: computed `overflow-y` auto/scroll with `scrollHeight > clientHeight`
- unused width: main area right edge − rightmost content edge (large values at desktop = accidental space; symmetric centred margins can be intentional)
- column alignment: top edges of main and rail, gutter width
- text below ~11px; touch targets below ~24px on touch devices
- console errors / page errors / hydration warnings

Then look at the screenshots of anything flagged, and at key frames of animations (scroll-driven pages: capture several progress points, including the very first wheel notch and the final handoff, using real `mouse.wheel` input, not only `scrollTo`).

Useful details:
- Emulate `reduced_motion="reduce"` to check reduced-motion behavior.
- Headless WebGL: launch Chromium with `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`.
- Device emulation (`playwright.devices["iPhone 14"]`, `"iPhone SE"`, `"Pixel 7"`, `"Galaxy S9+"`, landscape variants) with WebKit for iOS and Chromium for Android.
- Engines: Chromium, `channel="msedge"`, Firefox, WebKit (Safari's engine). Install with `python -m playwright install firefox webkit`.
- Auth-gated apps: run a local dev instance with the auth env vars blanked (if the app treats "unconfigured" as open) to QA pages; test the gate separately.

## Viewport matrix

Desktop: 3840×2160, 2560×1440, 1920×1080, 1680×1050, 1600×900, 1440×900, 1366×768, 1280×720
Resized windows: 1500×900, 1300×800, 1100×800, 900×800, 800×700
Tablet: 768×1024 (and landscape)
Phones: 390×844, 375×812, 360×800, 320×568 (iPhone SE), landscape ~844×390

## Cross-browser watchlist

viewport units on mobile, sticky inside overflow containers, `overflow-x` on iOS, WebGL availability, `animation-timeline` (Chromium-only — wrap in `@supports`), cross-document view transitions (progressive), `backdrop-filter`, container queries (fine in current engines), `text-wrap: balance` (progressive), fonts loading/fallback metrics, SVG `vector-effect`, auth redirects.

## Authentication flows

Inspect the existing provider (Supabase / Firebase / Auth.js / custom) and fix within it. For OAuth: verify the provider is enabled, the app's exact origin/paths are in the redirect allow-list (a missing entry silently falls back to a default site URL), the provider's own redirect URI is registered, `redirectTo` returns the user to where they started, the callback session is detected and persisted, refresh keeps the session, logout works, and OAuth errors returned in the URL are shown to the user. Drive the flow up to the provider's sign-in page to prove the handoff; state plainly which steps need a real account or an external console change.

## Final design review

Composition · Hierarchy · Typography · Spacing (intentional vs accidental) · Responsiveness at arbitrary sizes · Motion purpose and hierarchy · 3D purpose · State communication · Consistency · Performance · Professional credibility · Anti-vibe check. Fix causes, re-measure, and only then report — with what was verified, how, and what remains.
