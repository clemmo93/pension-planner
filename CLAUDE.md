# Working in this repo

A UK pension drawdown planner. React 18 + Vite, deployed to GitHub Pages on
push to `main`. Six steps; see the README for what each one covers.

**The repository is public.** Nothing personal goes in it — no real figures, no
transcripts, no local paths. The defaults in `DEFAULTS` are deliberately generic
placeholders.

## Layout

```
src/projection.js       pure maths, no React — the source of every figure
src/PensionPlanner.jsx  the whole interface
src/styles.css          tokens, light and dark
TODO.md                 known gaps, kept current
```

`projection.js` imports nothing, so it can be exercised straight from `node`.
Do that before touching the UI when a number looks wrong — it is much faster
than reasoning about the render.

## The model, and what follows from it

**Two buckets.** The pot is `uncrystallised` + `crystallised`. Tax-free cash is
a quarter of whatever you *crystallise*, not a pool you draw down. Money not yet
crystallised keeps growing, so a slice crystallised in year five releases more
than the same fraction would have in year one. Only crystallise what the
remaining lifetime allowance can actually pay cash on — splitting the whole pot
exhausts the allowance early and shifts the excess into the taxable bucket for
nothing.

**Grow, then withdraw.** `pot(1+g)(1−r)` each year.

**Withdrawals are a percentage of what remains.** This is the single most
important consequence in the codebase: the pot decays geometrically and
**never reaches zero**. Do not write a check against `pot <= 0`, or against the
pot falling below some income figure — both have been tried and both were
unreachable, which left the app's only safety signal permanently silent while a
plan drawing 15% a year reported "comfortably sustainable" on £1,257.

The honest measure is `sustainableRate()`: `r* = (g − i) / (1 + g)`, the rate at
which the pot holds its value in real terms. It depends only on growth and
inflation. **Never hardcode a "safe" withdrawal threshold** — an earlier version
asserted 6%, 4% and 5% in three different places, none of which moved with the
inputs, and at 3% growth it called a plan losing 69% in real terms
"conservative".

## Recurring traps

**Every money figure must honour the basis toggle.** `showToday` picks future £
or today's £. Figures ignoring it have shipped four separate times — the monthly
column, step 03's tiles, and two rounds of echo tiles. When you add a figure,
check both bases render and differ. The only legitimate exception is a
present-day amount, where the deflator is 1.

**Contributions are attributed to the age they were paid**, not the age the
money lands. Otherwise the first payment appears a year late and £10,000 paid
today shows as £9,756 in today's money.

**`.tbl-scroll` is `overflow-x: auto`, which clips on y too.** A popover
anchored inside a table header is cut off. Column help goes in a `.tkey` row
above the table.

**`.info-pop` is `position: fixed`, measured on open.** In flow it added
scrollable overflow, and under mobile emulation that widens the layout viewport
— so clamping against `window.innerWidth` chases a number the popover has
already moved. It also flips above its button when there is no room below.

**Steppers accumulate against a shadow ref**, not the rendered prop. React
batches, so several taps in one frame would otherwise read the same stale value
and collapse into one step.

## Copy

Plain and direct, no "claudisms". Say **what something means and why it
matters** — definition first, then the consequence. Short declarative sentences.
No piled-up em dashes, no "it's worth noting", no throat-clearing.

Name the unit and the period. "Holding the pot level needs 0.5%" says nothing
about 0.5% of what, over what; "The pot only holds its value at 0.5% a year or
less" does.

Quote a bound from a named constant rather than a literal — copy that
contradicts the control it sits under is worse than no copy.

## Verifying

Measure; do not eyeball. The browser can be driven directly, and the things that
have actually broken here are the things worth re-checking:

- **Contrast** in *both* themes, compositing translucent layers properly onto an
  opaque canvas. Several washes read as opaque and produced false failures; a
  transparent `html` background produced a different set.
- **Disable CSS transitions while measuring.** `.steps button` animates
  background over 150ms, and sampling mid-fade reported 1.13:1 on text that is
  really 16:1.
- **Tooltips** open and stay inside the viewport, at the top *and* bottom of
  each step. Skip buttons that are off-screen — their popovers are correctly
  off-screen too.
- **Ladder rows are all one height.** Age is the vertical axis, so a taller row
  is a longer year.
- **The projection's defaults** after any maths change: £1.35m at 57, £2,784 a
  month, lasts beyond 90.
- **The deployed bundle hash matches `dist/`** after every release.

React synthetic events are a recurring source of false results: `mouseleave`
derives from `mouseout`, `onBlur` from `focusout`, and dispatching the obvious
event does not trigger the handler.
