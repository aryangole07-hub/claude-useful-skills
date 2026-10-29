# Curves: ease-out in, ease-in out, springs for interface, nothing linear

Three curves, one per job (user rule):
- **entrances** ease out: `--ease-enter: cubic-bezier(0.16, 1, 0.3, 1)`
- **exits** ease in: `--ease-exit: cubic-bezier(0.55, 0, 0.9, 0.4)` (shorter than the entrance)
- **interface** (hover, press, toggle, tabs, drag, layout, menus): a damped spring with a slight overshoot (2-5%),
  solved in closed form below. A spring has mass, stiffness and damping, so it starts at the right velocity, settles
  physically and can be interrupted mid-flight.
- **nothing linear:** no `linear` keyword, constant-velocity tween, default `ease`, `ease-in-out` or `transition: all`.
  `linear(…)` filled with spring samples is the spring curve itself, not linear motion.

## The solution (unit step, x from 0 to 1, starting at rest)

    w0 = sqrt(k / m)                 natural frequency
    z  = c / (2 * sqrt(k * m))       damping ratio (z < 1 bounces, z = 1 critical, z > 1 slow)
    underdamped (z < 1):  wd = w0 * sqrt(1 - z^2)
        x(t) = 1 - e^(-z w0 t) * ( cos(wd t) + (z w0 / wd) sin(wd t) )
    critical    (z = 1):  x(t) = 1 - e^(-w0 t) * (1 + w0 t)
    overdamped  (z > 1):  r1,2 = -w0 (z -+ sqrt(z^2 - 1));  x(t) = 1 + (r2 e^(r1 t) - r1 e^(r2 t)) / (r1 - r2)

## Using it

1. **React / Next / Vite: Motion.** `transition={{ type: "spring", stiffness, damping, mass }}` (or `visualDuration` +
   `bounce`). Motion integrates the same physics and carries velocity across interruptions (drag release, re-targeting).
2. **CSS-only spots (hover, focus, menus): sample the closed form into `linear()`**, generated, never hand-typed:

```js
// spring(k, c, m) -> { easing: "linear(...)", ms }; settle = within 0.1% and still for good
export function spring(k = 300, c = 26, m = 1, steps = 48) {
  const w0 = Math.sqrt(k / m), z = c / (2 * Math.sqrt(k * m));
  const x = (t) => {
    if (z < 1) { const wd = w0 * Math.sqrt(1 - z * z);
      return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t)); }
    if (z === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
    const s = Math.sqrt(z * z - 1), r1 = -w0 * (z - s), r2 = -w0 * (z + s);
    return 1 + (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r1 - r2);
  };
  let T = 0; while (T < 10 && !(Math.abs(1 - x(T)) < 1e-3 && Math.abs(1 - x(T + 0.05)) < 1e-3)) T += 1 / 120;
  const pts = Array.from({ length: steps + 1 }, (_, i) => +x((T * i) / steps).toFixed(4));
  return { easing: `linear(${pts.join(", ")})`, ms: Math.round(T * 1000) };
}
```

   Emit the results as tokens (`--spring-ui: linear(...)`, `--spring-ui-ms: 400ms`) and use only those:
   `transition: transform var(--spring-ui-ms) var(--spring-ui)`.
3. **Presets:** `--spring-ui` k=400 c=30 (2.8% overshoot, ~400 ms to fully settle, the default for interface);
   `--spring-soft` k=260 c=24 (3% overshoot, larger panels / layout); bouncy k=300 c=14 (25% overshoot) only for a
   playful drag release or confirm, never as the default.

## Lint (the curve rule)

Fail the review on: the `linear` keyword as a timing function, bare `ease` / `ease-in-out`, `transition: all`, a raw
`cubic-bezier(` outside the token definitions, or a transition/animation that uses no token. Entrances must use
`--ease-enter`, exits `--ease-exit`, interface a spring token. `prefers-reduced-motion` fallbacks are usually no motion.

    rg -n --pcre2 "\blinear\b(?!\()|\bease\b(?!-)|ease-in-out|transition:\s*all|cubic-bezier\(" --glob "*.{css,scss,tsx,jsx}"
