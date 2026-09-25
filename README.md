# Retirement Planner

An interactive UK pension planner. Model contributions, investment growth, a
tax-free lump sum (taken in one go, phased, or as a share of every payment), and
multi-phase drawdown across retirement — with every figure shown both as future
cash and in today's money.

**[Open the planner →](https://clemmo93.github.io/pension-planner/)**

## Six steps

The planner is split so each screen answers one question, with a sticky summary
bar keeping the outcome — *what can I spend, and what will be left?* — on screen
while you adjust anything.

| | Step | What it covers |
|---|---|---|
| 01 | **You** | Age, current pot, growth, inflation |
| 02 | **Contributions** | Either set what you pay in, or set the income you want in early retirement and let the planner work back to the contribution |
| 03 | **Tax-free cash** | The tax-free share, when to take it, and whether as a lump sum or a slice of every payment |
| 04 | **Drawdown** | When income starts, the State Pension, and up to four withdrawal phases |
| 05 | **Pot value** | Every year from now to 90, as a vertical ladder of bars |
| 06 | **Income** | Every payment received, with the State Pension counted inside the income columns |

## Two directions on one screen

Most calculators run one way: set your contributions, see the outcome. Step 02
also runs the other way. Choose **"Work out what I need to pay in"**, set the
income you want in early retirement — from scratch, or from the PLSA Retirement
Living Standards — and the planner solves the starting contribution that gets
you there. It is the "reverse pension calculator" the research found people
hunting for, and it makes the default path answer the question most people
actually arrive with. The figure is gross for now; the net cost to take-home
pay is the next layer (see `TODO.md`).

## Future £ and today's £

Two ways of measuring the same sum, and the distinction matters more than any
other number here:

- **Future £** — the cash that would actually show in the account that year.
- **Today's £** — the same sum expressed in current buying power, which is what
  economists call *real terms*.

Today's £ leads by default, because it is the honest answer to "what will this
actually buy?". Every money figure shows both; the toggle decides which one is
the large one.

## The sustainable rate

Each phase draws a percentage of **whatever is left**, so the withdrawal shrinks
as the pot does and the pot approaches zero without reaching it. A plan on this
model does not run out — it erodes.

What matters instead is the rate at which the pot holds its value in real terms.
Growing then withdrawing gives `pot × (1+g) × (1−r)`, which is level once
inflation is taken out when

```
r* = (g − i) / (1 + g)
```

At 6% growth and 2.5% inflation that is **3.3%**. It depends only on growth and
inflation — not on the size of the pot, your age, or which phase you are in — so
one number describes a whole plan. Draw more and the pot shrinks in today's
money; draw less and it grows.

It is shown as a tick on each phase's rate slider and on the summary tiles on
step 04. Treat it as a reference point, not a target: most people spend a
pension down across retirement rather than preserve it.

## Assumptions and limitations

- Growth is applied annually, after contributions.
- The pot is held as two buckets, crystallised and uncrystallised. Tax-free cash
  is a quarter of whatever you crystallise, not a pool you draw down, so a slice
  crystallised later releases more than the same fraction would have on day one.
- Each phase's withdrawal rate applies to what remains, so income falls as the
  pot shrinks.
- Drawdown income begins in the year both gates open — your chosen drawdown age
  and the age the pot is crystallised for tax-free cash.
- Platform fees and fund charges are **not** deducted — typically 0.3–0.8%
  combined. Lower the growth rate to account for them.
- The State Pension **is** included by default, at the full new rate of £12,548
  a year, from the age the statutory timetable gives someone your age — 66 now,
  67 from 2028, 68 for anyone born from April 1977. It is held level in today's
  money, since the triple lock raises it by at least inflation. Switch it off or
  change the age on step 04.
- Income tax is **not** modelled, so every income figure is pre-tax. This
  matters more once the State Pension is included: at £12,548 it uses all but
  £22 of the £12,570 Personal Allowance, so from that age almost every pound
  taken from the pot is taxable.
- The projection runs to age 90.

UK rules referenced (£268,275 tax-free cap, £60,000 annual allowance, minimum
access age rising to 57 in 2028, pensions entering the scope of Inheritance Tax
from April 2027) reflect the position at the time of writing and may change.

> **Not financial advice.** This is a personal projection tool for exploring
> scenarios. Speak to a regulated financial adviser before making decisions
> about your pension.

## Research

[`research/`](research/) holds desk research into where UK pension questions get
asked online and what people actually ask — roughly 330 threads across Reddit,
MoneySavingExpert and The Lemon Fool, plus FCA and PLSA figures and a survey of
the calculators people already use. It sets out eight problem statements and
marks which ones this planner solves, partly solves, or does not address.

The method has real limits, stated up front: Reddit was never read directly, so
the frequency bands are a ranked estimate rather than a count.

[`research/uk-tax-ni-reference.md`](research/uk-tax-ni-reference.md) is a
separate, sourced reference on UK Income Tax, National Insurance, tax codes and
the three pension contribution methods (2026/27), written to drive the net-cost
layer that will sit on top of the reverse calculation.

## Project layout

```
src/projection.js      pure projection maths, no React
src/PensionPlanner.jsx the six-step interface
src/styles.css         design tokens and components (light and dark)
CLAUDE.md              conventions and the traps worth knowing before editing
TODO.md                known gaps, with enough context to act on them
research/              what people actually ask about pensions, and who else answers it
```

Keeping the maths in its own module means the projection can be exercised
directly with `node` without rendering anything:

```bash
node -e "import('./src/projection.js').then(({project}) => console.log(project({...})))"
```

## Running locally

```bash
npm install
npm run dev
```

## Deployment

Pushes to `main` build with Vite and deploy to GitHub Pages via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## Licence

[MIT](LICENSE)
