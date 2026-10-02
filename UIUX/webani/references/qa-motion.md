# QA for motion and 3D

Screenshots of a resting page say nothing about an animation. Capture the motion's states.

## Playwright recipe

```python
# Launch Chromium with software WebGL so headless renders the scene
b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
pg = await b.new_page(viewport={"width": 1440, "height": 900})
await pg.goto(URL, wait_until="load"); await pg.wait_for_timeout(4000)

# 1. the first real scroll (tests the first-scroll rule AND that scroll is not captured)
await pg.mouse.move(720, 450); await pg.mouse.wheel(0, 100); await pg.wait_for_timeout(900)
assert await pg.evaluate("scrollY") > 0          # the page moved: no scroll-jacking

# 2. jump to progress points on the sticky track
JUMP = """(p)=>{const t=document.querySelector(TRACK),s=document.querySelector(STAGE);
  const pin=parseFloat(getComputedStyle(s).top)||0, run=t.offsetHeight-(innerHeight-pin);
  scrollTo(0, t.offsetTop-pin+run*p)}"""
for p in (0.15, 0.32, 0.5, 0.68, 0.85, 0.93, 1.0, 1.06): ...screenshot each
```

Also: `reduced_motion="reduce"` context; `devices["iPhone 14"]` on WebKit and `devices["Pixel 7"]` on Chromium; Firefox and WebKit engines; a theme toggle if the site has light/dark; collect `pageerror` and console errors.

## What to look for in every frame

- Is the copy readable (contrast, nothing behind it)?
- Is anything from a previous chapter still on screen that should have left?
- Is anything clipped at the viewport edges at this aspect ratio?
- Mid-transition frames: does it read as one thing becoming another, or a muddle of two layers? (shorten overlaps; let the old leave before the new arrives)
- Handoff: is the product UI fully legible and interactive at p = 1.0? What is on screen just after the stage unpins — content, not a void?
- Phones: does the chosen telling fit the shortest common screen (≈ 375×667) without overlap?

## Measurements to run

- `document.documentElement.scrollWidth > innerWidth` (horizontal overflow) at every size.
- Nested scroll containers (`overflow-y` auto/scroll with `scrollHeight > clientHeight`).
- Long tasks during a scripted scroll (PerformanceObserver `longtask`) — the scroll path should not produce them.
- Frame loop sleeps when idle (no rAF churn when nothing moves).
