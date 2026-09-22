# Known gaps and things to pick up

Things worth doing that are not done, with enough context to act on them
without the conversation they came from. Newest concerns first.

## Growth should be three named scenarios, not one number

Monzo's pension prediction does not draw an uncertainty band. It offers three
named growth assumptions — Low (2%), Balanced (5%), High (8%) — as a radio list
behind an Edit, and re-runs the whole prediction on the one you pick. Nutmeg,
Plum and Wealthsimple all shade a cone instead.

Named scenarios suit this app better than a cone. The model in
`projection.js` is deterministic, so a band would have to be manufactured from
three runs anyway, and the band hides the figures where the scenarios show
them. It is also the cheaper build: growth is already an input, so this is a
preset control and a label, not new maths.

It fixes the real problem either way. One figure to the pound claims a
precision the model does not have.

## Fees are not modelled at all

Monzo assumes 0.25% a year and says so plainly: "Your actual fees could vary
and will affect the value of investments over time." This app has no fee input
and no fee in the maths. A 0.25% drag compounded over thirty years is not a
rounding error, and its absence makes every figure here optimistic against a
real provider.

`sustainableRate()` would need it too: net growth is what holds the pot level,
so `r* = (g - f - i) / (1 + g - f)`.

## There is no "work it out for me"

The single best idea in Monzo's flow, and the answer to serving both the
pension-naive and the financially literate on one screen. Its income sheet
opens with a fork:

- **Work it out for me** — "We'll estimate a yearly amount that could last
  until you're 90"
- **I'll choose an amount** — "Set an amount and see how long it lasts"

Same model, two directions. This app only offers the second: you must set
withdrawal rates before it will tell you anything. A novice has no basis for
choosing 4% over 6%.

The inverse solve is straightforward — the rate that leaves the pot at zero at
`END_AGE` — and it makes the default path answer the question the user actually
arrived with.

## Key assumptions belongs on one screen, and replaces the glossary idea

Monzo puts every assumption on a single sheet: name, current value, an Edit
affordance where it is editable, and a paragraph saying what it is and what
follows from it. Investment growth, inflation, contribution escalation, State
Pension, expected yearly income, tax-free lump sum, tax relief, fees.

Better than the glossary logged elsewhere here, because it is not a dictionary
— it is the model's own parameters, explained. A reader who wants to know
whether to trust the number has one place to go.

Two of its entries are things this app should be saying and does not:

- **Tax relief** — "We assume tax relief is already included in your
  contributions." This app is silent, so a user may be entering gross or net
  and has no way to know which is wanted.
- **What is excluded** — "We haven't included the State pension in your total
  predicted pot value." Naming the exclusion is as useful as naming the
  inclusion.

## A benchmark for what income to aim at

Monzo shows "You might need 50% of your current income for a comfortable
retirement lifestyle", backed by a table sourced to the DWP: up to £12,199
needs 80%, £12,200-£22,399 needs 70%, £22,400-£31,999 needs 67%,
£32,000-£51,299 needs 60%, £51,300 and above needs 50%.

This app computes an income and never says whether it is enough. Offering the
benchmark as context — not as a target, and with the source named — would let
the number mean something. It needs a current salary input, which the app does
not currently ask for.

## Charts should carry four labels, not sixty-one

Monzo's pot chart is one line with an area fade, an endpoint dot labelled
£1.2M, a floor label of £235K, and two x anchors: 33 and 68, with "Age"
beneath. Four labels for thirty-five years. Step 05 here is a sixty-one row
ladder. Both are legitimate, but the ladder should earn its density rather
than inherit it.

Its income chart stacks private income and State Pension in one bar per age,
with the scale on the right. When there is no private pension the bars are all
State Pension and the chart still reads — it degrades without a special case.

## Step 06 should stack the State Pension inside the income bar, not beside it

Monzo's pension prediction puts private income and State Pension in one
stacked bar per age, with a two-dot legend. This app keeps them in separate
table columns and never adds them, which is already logged below as a missing
total. Stacking solves both: the bar height is the total, and the split is
visible without arithmetic.

## The two structural choices should state their consequence on the control

Monzo's screen has exactly two toggles, each carrying the figure it produces:
"Take 25% lump sum — £126,383.05 (tax-free) at age 65 and the rest as income",
"Include State Pension — Assuming it gives you £12,547.60 each year from age
68". The control answers its own question, so nothing has to be read
elsewhere. Step 03 and step 04 both have controls that currently do not.

## The sustainable rate is a 2px tick and should be a named boundary

Two patterns worth taking. Alma labels the recommended point on the slider
track and shades the region around it, so the healthy range is a zone rather
than a mark. Copilot explains its dashed line in one sentence the first time
you see it: "This dotted line represents the ideal spending rate to help you
stay within your monthly budgets." Credit Karma states the distance to the
reference as a figure — "+72 pts to max score".

Applied here: shade the rate slider at or below `sustainableRate()`, label the
boundary, and state the gap in words — "2.7 points above the rate that holds
the pot level". See `.claude/skills/design-language/SKILL.md` for the rule
that the rate becomes a dashed line on the charts too.

## Step 01's four sliders could be one editable sentence

Stake's compound calculator reads "Projection of [$10,000] + [$1,000] every
month earning [5.50%] p.a." with the values as inline editable pills. It puts
the assumptions in a form a novice can read as prose and an expert can edit in
place, which is the two-audience rule working for free. Worth prototyping
against the current four-slider stack before committing.

## Common values deserve presets, not only a slider drag

Plum offers £100 / £200 / £500 / £1,000 as chips beside the slider. Dragging
to a round number is the slowest way to reach the value most people want.

## One glossary sheet, not a tooltip per term

Zopa, Splitwise and Acorns all do the same thing: a single sheet, one heading
per term, plain definition under each. Confirms the approach the design
language already specifies, and gives a shape to copy.

## Repurpose the verdict chip

The chip in the sticky header reads **"Lasts beyond 90"** and is always green.
That is true and useless: withdrawals are a percentage of whatever is left, so
the pot decays geometrically and always outlasts the projection. The old
warning it replaced was worse — it hung off `pot <= 0`, which no setting the
sliders allow could ever reach, so the amber and red states were unreachable
and a plan drawing 15% a year reported "comfortably sustainable" on £1,257.

It should describe the real-terms trajectory instead. Candidates:

- `Pot holds its value` when every phase is at or below the sustainable rate,
  `Pot falls 37% by 90` otherwise — stated, not flagged.
- No alarm colour at all. A percentage rule cannot fail, so a failure signal is
  either noise or a lie. Spending the pot down is the point of a pension, not a
  fault to warn about.

`sustainableRate()` in `src/projection.js` already gives the comparison.

## Income tax is not modelled, and the State Pension makes that worse

The full State Pension uses all but £22 of the Personal Allowance, so from
State Pension age almost every pound drawn from the pot is taxable. The income
figures are pre-tax and now overstate take-home by roughly a fifth for a basic
rate payer. Either model basic rate, or make the warning much louder.

## Echo tiles duplicate the verdict bar

The sticky bar and the per-step echo tiles sometimes show the same number in
the same weight. Decide which one owns a given figure.

## The sticky bar and step nav eat a third of a phone screen

125px of verdict bar plus 65px of step nav is 190px of an 812px viewport before
any content. Worth condensing, or collapsing the bar on scroll.

## Scenario comparison

Raised repeatedly and never built: "retire at 57 or 60?" cannot be answered
without changing the input and remembering what the old numbers were. Two
saved scenarios side by side would be the single biggest addition here.

## A "Total received" column on step 06

The payment schedule shows tax-free cash and taxable income in separate
columns and never adds them. In the year a lump sum lands, the two figures sit
side by side with no total.

## The published artifact is behind the repo

`https://claude.ai/artifact/WTzNcnuqiBgasPM4ioH13j` is an early prototype and
is now many changes behind. Refresh it or retire it.

## Dead code: the depleted-pot rendering path

`PotLadder` still colours a bar with `--crit` when a drawing year has
`phaseIndex < 0`, and the legend has a matching "Pot empty" key. Neither can
occur: every drawing age resolves to a phase, and the zero-fill branch in
`project()` needs `pot <= 0`, which percentage withdrawals never reach. The
legend entry is keyed off the bars existing, so it stays honest — but if the
withdrawal rule ever changes, check both.
