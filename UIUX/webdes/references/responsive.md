# Responsive layout architecture

Responsive is not "desktop, then shrink". Each size class gets deliberate behavior: 4K / 2K / 1440p / 1080p / small laptop / half-screen / tablet / large phone / small phone, portrait and landscape — and every width in between, because users drag windows.

## Questions every layout must answer

- What happens when the viewport is 20% narrower? 30% wider?
- What happens when height changes dramatically (1280×720 laptop, 2160px-tall monitor, phone landscape at ~390px)?
- Which element gives way first, and how (wrap, stack, collapse, hide secondary content, scroll a table)?

## Architecture

- **Grid/flex with intrinsic sizing.** Columns as `minmax(0, 1fr)` (never bare `1fr` or an implicit auto column when children can be long: nowrap text inflates content-sized tracks past the viewport).
- **Container queries for components** that live in containers of varying width (cards in rails, previews in overlays, lists in main columns). A component should respond to its own width, not the viewport's. A viewport breakpoint inside a narrow column is the classic cause of overflow at "in-between" sizes.
- **Few, structural breakpoints.** If you are adding the tenth media query, the layout model is wrong.
- **Shared page container.** One max-width container, aligned with the header/nav, used by every page. Pages that center their own container misalign with the rest of the site.
- **Main + rail layouts.** A deliberate gutter (hairline rule + padding, or a fixed gap), both columns aligned to the same container, tops aligned, heights coherent. A rail goes below the main content when the main content would otherwise be squeezed (e.g. a wide table forced into horizontal scroll) — decide the switch from the content's real minimum width.
- **Count-aware grids.** For a known number of items, pick column counts that divide it (10 items: 5 or 2 columns), or design the remainder (span, feature). An orphan card beside empty slots reads as broken.

## Large monitors (2K / 4K)

A 1440px page centred in a 3840px window is accidental empty space, and a fully stretched one is unreadable. Scale instead:

```css
/* Reader's default up to ~1600px, then proportional growth to ~25px at 3840px. */
html { font-size: clamp(100%, calc(0.42vw + 9.3px), 160%); }
```

Then size type, spacing, containers, icons, sparklines and chart heights in `rem` so everything grows together. Convert px-sized SVG icons/sparklines to rem widths. Let charts derive height from their measured width (with a cap). Widen the max container modestly on very wide screens and centre it; keep header contents aligned with the container (`padding-inline: max(gutter, calc((100% - maxW) / 2 + gutter))`).

## Viewport units and height

- Use `svh`/`dvh`/`lvh` deliberately; `100vh` on mobile includes browser chrome.
- Sticky elements must fit the viewport; if a sticky rail can be taller than the window, make it sticky only under a `min-height` media query, otherwise let it scroll with the page. Never give it its own scrollbar to "fix" this.
- Short windows (≤ 760px tall): hide tertiary content in pinned/overlay compositions rather than clipping.

## Mobile

- Navigation moves where thumbs are (bottom bar) or into a compact header; same product, same language.
- Tables: horizontal scroll inside a bordered container with a sticky first column, or a stacked row layout — chosen per table.
- Shorten long placeholders/labels that would truncate mid-word.
- Safe areas: `viewport-fit=cover` in the viewport meta, `env(safe-area-inset-*)` padding on fixed bars.
- Touch targets ≥ ~36-44px; expand tiny hit areas with a transparent `::after` instead of enlarging visuals.
- No text below ~11px.

## Traps that break real sites (and the fixes)

| Symptom | Cause | Fix |
|---|---|---|
| Page drags sideways on iPhone | Transformed/animating elements overhang; iOS ignores `overflow-x: hidden` on body | `overflow-x: clip` on html/body/app shell (does not create a scroll container, so sticky keeps working) |
| `scrollIntoView` lands too low | Page `scroll-padding-top` and element `scroll-margin-top` add together | Compute the target: `scrollY + rect.top − measuredHeaderHeights − gap` and `scrollTo` it |
| Sticky stops working | An ancestor has `overflow: hidden/auto` | Use `overflow: clip`, or move the overflow to a non-ancestor |
| Overflow only at ~1100px | Component switched layout on a viewport breakpoint while living in a narrow column | Container query on the component |
| Nested scrollbars | A panel with `max-height` + `overflow: auto` | Remove the inner scroll; restructure (sticky only if it fits, else static) |
| "-0.0%" | Formatting a tiny negative | Round first, then normalise negative zero |
| Content flashes / jumps on load | Client-only branch decides layout after hydration | Render both variants and let CSS choose by media query until JS decides |
| Hydration warnings on relative times | Server and client clocks differ | `suppressHydrationWarning` on the `<time>` (or render absolute time server-side) |

## Scrollbars

One page scroll wherever possible. Style it to the system:

```css
html { scrollbar-width: thin; scrollbar-color: <~3:1 neutral> transparent; }
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: <neutral>; border-radius: 10px; border: 3px solid transparent; background-clip: content-box; }
```

Chrome/Firefox use the standard properties; Safari the webkit ones. Keep contrast usable; never hide the page scrollbar.
