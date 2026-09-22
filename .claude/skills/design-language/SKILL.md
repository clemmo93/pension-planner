---
name: design-language
description: The planner's visual system — palette tokens, type, the numeral rule, elevation, charts, the shell, and how one screen serves both a pension novice and someone who knows the terms. Load before touching src/styles.css, before adding a component or a chart, and before putting any new figure on screen.
---

# The planner's design language

CLAUDE.md owns the maths and the copy. This file owns the look. Where they
overlap, CLAUDE.md wins — a figure that honours the basis toggle and reads
badly is a design bug; a figure that reads beautifully and ignores the toggle
is a shipped lie, and that one has shipped four times.

## The direction, in one paragraph

Borrowed from Monzo: the mechanics, not the skin. Pounds large and pence small
without exception. Cards separated by tint rather than by border. Group headers
that carry their own subtotal. Charts stripped to bars and one dashed reference
line. A full-width pill for the primary action. The palette and the typeface are
our own — cool neutral greys carrying a single warm accent, which is why it does
not read as a clone of a bank that is navy and cyan.

What this replaces: a warm cream ground, Playfair Display, and a gold accent.
That combination is one of the three looks generative tooling reaches for by
default, and it arrived here by inheritance rather than by choice.

## Palette: Slate & Marigold

Role names, not colour names. A token called `--accent` can change hue; a token
called `--gold` cannot.

### Light

```
--bg        #F1F2F4   the page
--surface   #FFFFFF   cards
--sunk      #E7EAED   grooves: toggle tracks, slider rails, table zebra
--raise     #FFFFFF   popovers and sheets, lifted by shadow rather than tint
--line      #E3E6E8   table rules and dividers only
--ink       #16191C   primary text
--ink-2     #59616A   secondary text
--ink-3     #5C656D   tertiary: captions, the footer
--accent    #8F5B00   marigold, darkened for light ground
--accent-2  #6F4600   hover and pressed
--good      #1B6647
--crit      #A8342A
--on-phase  #FFFFFF   text drawn on a phase fill
--grid      rgba(22, 25, 28, .09)
phases      01 #8F5B00   02 #0F6F6A   03 #5B47A8   04 #A8401F
```

### Dark

```
--bg        #0E1113
--surface   #171B1E
--sunk      #22272B
--raise     #242A2F
--line      #262C31
--ink       #ECEFF1
--ink-2     #9AA4AB
--ink-3     #78828B
--accent    #F0B429
--accent-2  #D9A23D
--good      #5FC79A
--crit      #EF8977
--on-phase  #0E1113
--grid      rgba(236, 239, 241, .10)
phases      01 #F0B429   02 #3FB0AC   03 #A797E2   04 #F0947A
```

Washes are the semantic colour at 10% in light, 13% in dark — the higher figure
in dark because a wash over a near-black ground disappears at 10%.

### Rules the palette carries

**Semantic colour is never a phase colour.** The current file breaks this:
`--p1` and `--accent` hold the same value, so the first phase and every
interactive affordance are indistinguishable. In the new set the accent is
marigold and phase 01 is marigold *because they are the same role* — phase 01
is the accent, deliberately, and phases 02–04 are drawn from elsewhere. Good and
critical sit outside the set entirely.

**There is no `--warn`.** The accent is amber, so an amber warning state is
invisible next to it. That forced a decision the TODO was already leaning
towards: a percentage-of-what-remains withdrawal cannot fail, so an alarm colour
is either noise or a lie. Two semantic states remain — good and critical — and
the verdict chip stops being a traffic light and starts stating a fact. If a
genuine failure state appears later, it gets critical, not a third colour.

**Phase colours are read as text, not just as fill.** Phase rate labels sit on
a surface as coloured text, which is why each one has to clear 4.5:1 on its own
ground in both themes rather than the 3:1 a fill would need.

## Type

**Hanken Grotesk**, weights 400 / 500 / 600 / 700 / 800, with a real fallback
stack. One family for everything — no display serif. Monzo Sans is not
licensable, and an approximation that is nearly it is worse than something that
is confidently its own.

```
display   34px / 1.0   800  -0.022em   the money figure
title     22px / 1.2   700             step heading
card      15px / 1.3   700             card heading
body      15px / 1.55  400
micro     12px / 1.4   500
label     11px / 1.3   700  0.09em  uppercase
```

Anything with digits in a column gets `font-variant-numeric: tabular-nums`.

## The numeral rule

Pounds at full size, pence at `0.55em` weight 700, the currency symbol at
`0.56em`. Everywhere, without exception — that consistency is the whole value
of the rule.

**Where pence are not meaningful, there are no pence.** A projected pot is
rounded to the pound and shows nothing after it. Never `.00`. A projection
carrying two decimal places claims a precision the model does not have.

**The basis pairing resolves against it.** The figure for the selected basis
takes the display size and the numeral rule; the other basis sits on the line
below at 13px in `--ink-2`, with its own basis named. Two sizes of contrast are
already spent on pounds against pence, so the basis distinction cannot also be
carried by size — it is carried by position and by weight.

## Elevation

`--bg` → `--surface` → `--raise`. Separation is tint; a card has no border.

`--line` survives for exactly two jobs: rules between rows in a table, and
dividers inside a card. If a border is being used to say "this is a separate
object", the tint is wrong and the border is a patch.

Radii: `--r-card: 16px`, `--r-tile: 12px`, `--r-pill: 999px`. Shadow lifts
`--raise` only.

## Charts

Load the `dataviz` skill before writing any new chart. Steps 05 and 06 are the
product, not decoration.

- No axis lines. At most two gridlines, in `--grid`.
- Every reference is a dashed line in `--ink-2` with an inline uppercase label
  naming the value it marks. A reference line with no label is a smudge.
- **The sustainable rate is a dashed line**, on the ladder and on the income
  bars. It is currently a tick on a slider, where it is invisible at exactly the
  moment it matters.
- Bars take phase colours. A bar is the accent only when there is one series.
- Ladder rows are all one height. Age is the vertical axis, so a taller row
  reads as a longer year.
- Chart text takes theme tokens, never a literal that works in one theme.

## Tables

A column has to earn its width. Step 06's Rate column carried one of four
values down thirty-four rows and cost 38px the table did not have.

- **A property of a group becomes an edge, not a column.** Each row gets a 3px
  left edge in its phase colour; the legend above names it once, with a
  heading giving both dimensions — `Phase · annual drawdown rate`, because
  `01 · 6%` alone never said 6% of what, over what.
- **A one-off event gets a row, not a cell.** The State Pension starts once and
  never reverses, so it spans the table rather than marking a cell. Neutral,
  never a semantic colour: it is a change in what the columns contain, not a
  verdict on it.
- **Headers wrap.** Held on one line they set the column width — "Monthly
  income" was 107px against a 62px figure — and the table then needs a
  sideways drag to reach its last column.
- **A marker beside a value sets the column width for every row.** Put it
  under the value instead. One `+ State Pension` beside an age held that
  column at 85px for all thirty-four rows.

## The shell

Phone-first. Single column, 660px maximum, centred on desktop with wider gutters
and no pinned furniture. Desktop is the same layout with more air — not a
second layout.

- The primary action is a full-width pill. Pinned to the bottom on phone, with
  `env(safe-area-inset-bottom)` added to its own padding; inline on desktop.
- The verdict bar collapses on scroll; the step nav condenses. Today the two of
  them eat 190px of an 812px viewport before any content. The target is under
  120px.
- Rows are 56–64px and carry one fact each.
- A group header carries its own subtotal: `label · £total`. A total never sits
  away from the things it totals.
- Six steps, kept. Each still answers one question.

## Two audiences on one screen

The planner serves someone who has never heard of crystallising and someone who
knows exactly what it means. That works under one rule: **the default path is
written for the novice, and every technical layer is additive, optional, and
always in the same place.**

The cleanest form of that rule is a fork, not a disclosure. Monzo's income
sheet offers "Work it out for me — we'll estimate a yearly amount that could
last until you're 90" against "I'll choose an amount — set an amount and see
how long it lasts". One model, two directions, both on the first screen.
Prefer this wherever a control requires knowledge the novice does not have.

- Plain English leads; the technical term follows in parentheses, once per
  screen. "Move part of your pot into drawdown (crystallise it)" — never the
  reverse.
- Advanced controls sit behind one disclosure per step. One, not several. The
  novice never opens it and still gets a real answer; the expert opens it once
  and it stays open.
- One glossary, linked from every technical term. Not a tooltip per occurrence.
- A figure always has a plain sentence available on demand and never shows one
  unasked. `.info-pop` is the mechanism; it needs applying consistently rather
  than where it happened to get added.

## Verifying

CLAUDE.md's method, unchanged, because both of its failure modes were found the
hard way: composite translucent layers properly onto an opaque canvas, and
disable CSS transitions before sampling — `.steps button` animates background
over 150ms and sampling mid-fade reported 1.13:1 on text that is really 16:1.

Measure both themes. Known-hazardous pairs, each of which has failed here
before or is close enough to fail on a small change:

- `--ink-3` on `--raise` — the tightest pair in the set, and the reason dark's
  `--ink-2` and `--ink-3` were both lifted from the values the palette trial
  first showed: `#78828B` measured 3.71:1 on `--raise`, and raising `--ink-3`
  alone would have left it almost touching `--ink-2`.
- A phase colour as text on `--sunk`.
- `--accent` as text on `--sunk`.
- `--on-phase` against each of the four phase fills, in both themes. The phase
  palette inverts between themes, so a fixed white label drops through the floor
  in one of them.

## What not to do

- Do not reintroduce a display serif, or a cream ground.
- Do not use a border to separate a card from the page.
- Do not add a third numeral size. Two is the budget.
- Do not use a phase colour to mean good, bad or caution.
- Do not hardcode a "safe" withdrawal threshold to colour anything by. See
  CLAUDE.md: `sustainableRate()` is the only honest comparison, and an earlier
  version asserted 6%, 4% and 5% in three different places.
- Do not let explanatory copy contradict the control it sits under. Monzo's
  own assumptions screen shows "Yearly growth of your pension — 8%" above a
  paragraph beginning "We assume a balanced growth rate of 5%", because the
  prose was written once and the value is live. Quote the constant, or write
  copy that holds at every value the control allows.
