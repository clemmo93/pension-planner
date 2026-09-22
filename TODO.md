# Known gaps and things to pick up

Things worth doing that are not done, with enough context to act on them
without the conversation they came from. Newest concerns first.

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

## Step 06's table has outgrown a phone

Seven columns come to 662px against a 317px scroller. "Total received" was
moved next to Age so the summary is visible without scrolling, but the
breakdown still needs a sideways drag. A stacked card per year, or a column
picker, would suit a phone better than a wide table.

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
