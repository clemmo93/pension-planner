# Retirement Planner

An interactive UK pension drawdown projection tool. Model contributions, investment
growth, a tax-free lump sum (taken in one go or phased), and multi-phase drawdown
across retirement — with everything shown in both nominal and inflation-adjusted
("real") terms.

**[Open the planner →](https://clemmo93.github.io/pension-planner/)**

## What it models

- **Accumulation** — current pot, annual contributions (with an optional yearly
  uplift for salary rises), and a configurable growth rate.
- **Tax-free lump sum** — up to 25%, capped at £268,275, taken at a chosen age
  either as a single lump or phased over several years (phased crystallisation).
- **Multi-phase drawdown** — up to four sequential phases, each with its own
  withdrawal rate and duration, so you can model a higher-spend early retirement
  tapering to a conservative later-life rate.
- **Real vs nominal** — every figure is also shown in today's money using a
  configurable inflation rate.

Output includes a year-by-year pot chart, a phase timeline, and a milestone table
with monthly drawdown income at key ages.

## Assumptions and limitations

- Growth is applied annually, after contributions.
- Platform fees and fund charges are **not** deducted — lower the growth rate to
  account for them (typically 0.3–0.8% combined).
- The State Pension is **not** included.
- Income tax on withdrawals beyond the tax-free portion is **not** modelled.
- The projection runs to age 90.

Tax rules referenced (tax-free cap, £60,000 annual allowance, minimum access age
rising to 57 in 2028, pensions entering the scope of Inheritance Tax from April
2027) reflect UK rules as understood at the time of writing and may change.

> **Not financial advice.** This is a personal projection toy for exploring
> scenarios. It makes simplifying assumptions and ignores tax on withdrawals.
> Speak to a regulated financial adviser before making decisions about your
> pension.

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
