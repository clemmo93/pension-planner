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
research/               desk research: what people ask, and the problem
                        statements it produced. README.md is the summary.

.claude/skills/design-language/SKILL.md
                        the visual system: palette, type, the numeral rule,
                        charts, the shell. Load it before touching styles.css
                        or putting a new figure on screen.
```

`projection.js` imports nothing, so it can be exercised straight from `node`.
Do that before touching the UI when a number looks wrong — it is much faster
than reasoning about the render.

## Committing

**Stage explicit paths. Never `git add -A` or `git add .`.**

More than one session can be working in this checkout at once. `-A` sweeps
whatever the other one has in flight into your commit, and the message then
describes something the commit does not contain. That has happened twice: a
segmented-control fix landed inside a commit about a reverse calculator, and a
docs-only change shipped a projection-maths change under a PR body that said
"no code change".

Run `git status` before staging, name the files you actually touched, and check
`git show --stat` after committing says what you expected.

**A branch does not isolate a second session; a worktree does.** Both sessions
share one `HEAD` here, so `git checkout -b` moves the branch under the other
one too. For real separation give each session its own directory:

```
git worktree add ../planner-feature -b feature-name
```

For a quick safety net without disturbing anyone, `git stash create` writes a
commit object capturing the whole tree and touches neither `HEAD`, the index,
nor the working files. Tag the SHA it prints and everything on disk is
recoverable. It does not include untracked files.

## The model, and what follows from it

**Two buckets.** The pot is `uncrystallised` + `crystallised`. Tax-free cash is
a quarter of whatever you *crystallise*, not a pool you draw down. Money not yet
crystallised keeps growing, so a slice crystallised in year five releases more
than the same fraction would have in year one. Only crystallise what the
remaining lifetime allowance can actually pay cash on — splitting the whole pot
exhausts the allowance early and shifts the excess into the taxable bucket for
nothing.

**Grow, then withdraw.** `pot(1+g)(1−r)` each year.

**Contributions stop at first access, not at income start.** `firstAccessAge()`
is the earlier of income starting and the tax-free take age. In a phased-lump
plan the tax-free cash can be taken years before income begins; paying in
through that gap both overstates the pot and makes each phased crystallisation
climb faster than growth (it is a share of a pot still being topped up), which
read as a bug. It is kept separate from `incomeStartAge()`, which still governs
when drawing and the phase spans begin.

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

## The reverse solve

`solveContribution(s, targetTodayAnnual)` runs the model backwards: given a
wanted income it returns the starting contribution that produces it. The target
is the **pot's first-year drawdown income, in today's £** — deliberately, not
the total including the State Pension, because the first drawdown year lands
before State Pension age, so the pot supplies all of it, and the later phases and
the State Pension are consequences the target should not have to describe.

First-year income is monotonic in the contribution, so it bisects — exact, never
stuck. It returns a `status`: `ok`, `already` (the current pot alone meets the
target, contribution 0), or `capped` (the £60,000 annual allowance falls short).
The UI never writes the solved figure back into state; it feeds it into
`project()` as `annualContrib` for that render only, so manual mode's forward
path — and its documented figures — stay byte-for-byte unchanged. The solved
contribution is a present-day amount (deflator 1), the one figure CLAUDE.md
allows to skip the basis pairing.

## Recurring traps

**Every money figure must honour the basis toggle.** `showToday` picks future £
or today's £. Figures ignoring it have shipped four separate times — the monthly
column, step 03's tiles, and two rounds of echo tiles. When you add a figure,
check both bases render and differ. The only legitimate exception is a
present-day amount, where the deflator is 1.

**Contributions are attributed to the age they were paid**, not the age the
money lands. Otherwise the first payment appears a year late and £10,000 paid
today shows as £9,756 in today's money.

**`.tbl-scroll` is `overflow-x: auto`, which clips on y too.** Nothing
anchored inside it can escape it, so anything that has to overlay the table
belongs outside the scroller.

**Explanations live in one sheet per step, not a popover per term.** Every
step has a single `What these terms mean` button under its lede, always in
the same place, opening the `Terms` sheet with that step's list. The
`.info-pop` it replaced was `position: fixed` and measured itself on open,
which caused two separate layout bugs — in flow it added scrollable overflow,
and under mobile emulation that widened the layout viewport, so clamping
against `window.innerWidth` chased a number the popover had already moved.
Do not reintroduce a measured-on-open popover.

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
- **The projection's defaults** after any maths change: £1.35m at 57, £2,604 a
  month in today's £, lasts beyond 90. It was £2,784 until the lump sum
  allowance began uprating with inflation by default — the cap stops binding,
  so more comes out as tax-free cash at 57 and less is left in the pot to pay
  income. Turning `taxFreeCapUprated` off restores £2,784.
- **The deployed bundle hash matches `dist/`** after every release.

React synthetic events are a recurring source of false results: `mouseleave`
derives from `mouseout`, `onBlur` from `focusout`, and dispatching the obvious
event does not trigger the handler.
