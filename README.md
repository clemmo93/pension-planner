# Retirement Planner

An interactive UK pension planner. Model contributions, investment growth, a
tax-free lump sum (taken in one go or phased), and multi-phase drawdown across
retirement — with every figure shown both as future cash and in today's money.

**[Open the planner →](https://clemmo93.github.io/pension-planner/)**

## Five steps

The planner is split so each screen answers one question, with a sticky summary
bar keeping the outcome — *will it last, and what can I spend?* — on screen
while you adjust anything.

| | Step | What it covers |
|---|---|---|
| 01 | **You** | Age, current pot, contributions, growth, inflation |
| 02 | **Access** | Tax-free share, when to take it, whether to phase it |
| 03 | **Spending** | Drawdown start age and up to four withdrawal phases |
| 04 | **Pot value** | Year-by-year chart and the pot at key ages |
| 05 | **Income** | Every payment received: drawdown and tax-free cash |

## Future £ and today's £

Two ways of measuring the same sum, and the distinction matters more than any
other number here:

- **Future £** — the cash that would actually show in the account that year.
- **Today's £** — the same sum expressed in current buying power, which is what
  economists call *real terms*.

Today's £ leads by default, because it is the honest answer to "what will this
actually buy?". Every money figure shows both; the toggle decides which one is
the large one.

## Assumptions and limitations

- Growth is applied annually, after contributions.
- Tax-free cash comes out first; each phase's withdrawal rate applies to what
  remains, so income falls as the pot shrinks.
- Drawdown income begins in the year both gates open — your chosen drawdown age
  and the age the pot is crystallised for tax-free cash.
- Platform fees and fund charges are **not** deducted — typically 0.3–0.8%
  combined. Lower the growth rate to account for them.
- The State Pension is **not** included and would sit on top.
- Income tax on withdrawals beyond the tax-free portion is **not** modelled, so
  the income figures are pre-tax.
- The projection runs to age 90.

UK rules referenced (£268,275 tax-free cap, £60,000 annual allowance, minimum
access age rising to 57 in 2028, pensions entering the scope of Inheritance Tax
from April 2027) reflect the position at the time of writing and may change.

> **Not financial advice.** This is a personal projection tool for exploring
> scenarios. Speak to a regulated financial adviser before making decisions
> about your pension.

## Project layout

```
src/projection.js      pure projection maths, no React
src/PensionPlanner.jsx the five-step interface
src/styles.css         design tokens and components (light and dark)
```

Keeping the maths in its own module means the projection can be exercised
directly with `node` without rendering anything.

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
