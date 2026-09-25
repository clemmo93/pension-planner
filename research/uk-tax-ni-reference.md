# UK personal tax & NI reference — net cost of pension contributions

Purpose: to drive a "net cost of a pension contribution" feature. The planner
deliberately does **not** model income tax on withdrawals; this file is only
about the *cost side* — how much a gross pension contribution actually reduces
someone's take-home pay, i.e. the relief delivered through the income-tax and
National Insurance systems, especially under salary sacrifice.

**Tax year: 2026/27** (6 April 2026 – 5 April 2027). This is the live year as of
25 September 2026. All figures below are the published 2026/27 figures — no
fallback to 2025/26 was needed.

**The freeze.** The Personal Allowance (£12,570) and the higher-rate threshold
(£50,270) have been frozen since April 2021. At the Autumn Budget on 26 November
2025 the freeze on income-tax **and** NICs thresholds was extended by three more
years, to **April 2031**
([HoC Library CBP-9186](https://commonslibrary.parliament.uk/research-briefings/cbp-9186/);
[ICAEW](https://www.icaew.com/insights/tax-news/2025/nov-2025/budget-freeze-on-personal-allowance-extended)).
Fiscal drag is therefore baked in for the whole horizon most users will model.

---

## 1. Income Tax — England, Wales & Northern Ireland ("rUK")

Personal Allowance: **£12,570**, frozen to April 2031.

| Band | Rate | Taxable income (above PA) | Income range |
|---|---|---|---|
| Personal Allowance | 0% | — | £0 – £12,570 |
| Basic rate | 20% | £0 – £37,700 | £12,571 – £50,270 |
| Higher rate | 40% | £37,701 – £112,570 | £50,271 – £125,140 |
| Additional rate | 45% | above £112,570 | above £125,140 |

The basic-rate limit is **£37,700** of taxable income; adding the £12,570 PA
gives the £50,270 higher-rate threshold.

**The £100k taper (the ~60% band).** For every £2 of adjusted net income over
**£100,000**, £1 of Personal Allowance is withdrawn. The PA is fully gone at
**£125,140** (= 100,000 + 2 × 12,570). In the £100,000–£125,140 band each extra
£1 of income is taxed at 40% *and* strips 50p of PA that is then taxed at 40%,
so the **marginal rate is ~60%** (61.5%+ once NI is included). This is the band
where pension relief is most valuable.

Source: [Income Tax rates and Personal Allowances (GOV.UK)](https://www.gov.uk/income-tax-rates);
[Personal Allowance / basic-rate limit 2026–2028 (GOV.UK)](https://www.gov.uk/government/publications/the-personal-allowance-and-basic-rate-limit-for-income-tax-and-certain-national-insurance-contributions-nics-thresholds-from-6-april-2026-to-5-apr).

---

## 2. Income Tax — Scotland

Scottish taxpayers (identified by an **S** tax-code prefix) pay Scottish rates on
**non-savings, non-dividend income** (earnings, pensions). The Personal
Allowance (£12,570) and its £100k taper are **reserved to the UK** and are the
same as rUK. Scotland has six bands in 2026/27:

| Band | Rate | Income range |
|---|---|---|
| Starter | 19% | £12,571 – £16,537 |
| Basic | 20% | £16,538 – £29,526 |
| Intermediate | 21% | £29,527 – £43,662 |
| Higher | 42% | £43,663 – £75,000 |
| Advanced | 45% | £75,001 – £125,140 |
| Top | 48% | above £125,140 |

The starter and basic bands were widened by 7.4% for 2026/27; higher/advanced/top
rates and thresholds are unchanged. Source:
[Scottish Income Tax: rates and bands 2026/27 (gov.scot)](https://www.gov.scot/publications/scottish-income-tax-rates-and-bands/pages/2026-to-2027/);
[Income Tax in Scotland (GOV.UK)](https://www.gov.uk/scottish-income-tax).

**Why it matters for net cost.** A Scottish higher-rate taxpayer gets 42% (not
40%) relief; advanced-rate gets 45%; top-rate gets 48%. **National Insurance is
UK-wide and not devolved**, so NI thresholds are identical to rUK. This creates a
divergence: the Scottish higher-rate threshold (£43,663) sits *below* the NI
Upper Earnings Limit (£50,270), so earnings between £43,663 and £50,270 attract
**42% income tax + 8% NI = 50% combined marginal**. Relief in that slice is worth
50%.

---

## 3. National Insurance — Class 1 (2026/27)

NI is UK-wide (same in Scotland). Thresholds are frozen to April 2031.

### Employee (primary) Class 1 — category A

| Item | Rate / threshold |
|---|---|
| Primary Threshold (PT) | £12,570/yr (£242/wk, £1,048/mo) |
| Main rate (PT → UEL) | **8%** |
| Upper Earnings Limit (UEL) | £50,270/yr (£967/wk, £4,189/mo) |
| Rate above UEL | **2%** |

So an employee pays 8% on earnings between £12,570 and £50,270, then 2% on
everything above £50,270. Note the PT is aligned with the Personal Allowance
(both £12,570) but the **UEL (£50,270) is aligned with the rUK higher-rate
threshold**, not the Scottish one.

### Employer (secondary) Class 1

| Item | Rate / threshold |
|---|---|
| Secondary Threshold (ST) | £5,000/yr (£96/wk, £417/mo) |
| Secondary (employer) rate | **15%** |

Employer NI is the key to salary sacrifice: the employer saves **15%** on any
salary sacrificed into a pension. Many schemes add some or all of that 15% saving
into the employee's pot (an "employer NI top-up" / shared saving), which makes
salary sacrifice more generous than tax + employee-NI relief alone. Whether it is
shared is scheme-specific — treat it as an optional input, not a given.

Source: [Rates and thresholds for employers 2026 to 2027 (GOV.UK)](https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027);
[National Insurance rates and categories (GOV.UK)](https://www.gov.uk/national-insurance-rates-letters).

---

## 4. Tax codes

A tax code tells the employer/pension payer how much tax-free income to give
before deducting tax. Enough detail here to let a user pick or type one.

- **1257L** — the standard code for 2026/27. The number is the tax-free amount
  with the last digit dropped: £12,570 → `1257`. `L` = entitled to the standard
  Personal Allowance. A different PA (e.g. reduced by taxable benefits, or by the
  £100k taper) changes the number; a negative allowance produces a **K** code.
- **K codes** (e.g. `K475`) — untaxed income or benefits **exceed** the Personal
  Allowance, so the code *adds* to taxable pay instead of subtracting. Common
  once the £100k taper has wiped out the PA.
- **BR** — all income from this source taxed at basic rate (20%); no PA here.
  Typical for a second job/pension.
- **D0** — all at higher rate (40%). **D1** — all at additional rate (45%).
  (In Scotland, `SD0`/`SD1`/`SD2` map to the higher Scottish bands.)
- **NT** — no tax deducted on this income.
- **W1 / M1 / X** — emergency ("non-cumulative") codes: tax is worked out on that
  pay period alone, ignoring the year to date. `W1` weekly, `M1` monthly, `X`
  either. Usually temporary until HMRC issues a full code.
- **Prefix S** — Scottish taxpayer (Scottish rates apply). **Prefix C** — Welsh
  taxpayer (Welsh rates; currently set equal to rUK rates, so no net-cost
  difference for now).

For net-cost purposes the code mainly tells us **region** (S / C / none) and
whether the PA is standard, reduced, or gone. Do not try to reverse-engineer full
tax position from the code alone — prefer taking gross salary and region as
inputs and deriving the marginal rates.

Source: [What your tax code means (GOV.UK)](https://www.gov.uk/tax-codes/what-your-tax-code-means);
[Tax codes to use from 6 April 2026, HMRC P9X](https://www.gov.uk/guidance/p9x-tax-codes).

---

## 5. The three contribution methods and what a gross contribution costs

Terminology: a **gross contribution** is the amount that ends up in the pension.
The **net cost** is the fall in take-home pay needed to achieve it. Relief is
what closes the gap.

### (a) Relief at source (RAS)

Used by most personal pensions and SIPPs and many workplace group personal
pensions. The employee pays out of **net** (post-tax, post-NI) pay; the provider
reclaims **20%** basic-rate relief from HMRC and adds it to the pot. So £80 paid
becomes £100 gross in the pension for everyone.

- Basic-rate taxpayer: net cost **£80** per £100 gross. Done — nothing to claim.
- Higher-rate: claims a further **20%** of gross via self-assessment or a
  tax-code adjustment → net cost **£60**.
- Additional-rate: claims a further **25%** → net cost **£55**.
- **No NI relief** under RAS.

The extra higher/additional relief is **not given at source** — it comes back
later through self-assessment or an adjusted tax code. In the planner, "net cost"
for a higher/additional-rate RAS contribution should be shown as the *eventual*
cost after that claim, with a note that the upfront outlay is £80 per £100.

Scotland/RAS quirk: providers reclaim 20% at source regardless of the Scottish
basic rate. Scottish starter-rate (19%) payers effectively gain slightly;
intermediate (21%), higher (42%), advanced (45%) and top (48%) payers claim the
balance above 20% via self-assessment.

### (b) Net pay arrangement

The employer deducts the gross contribution from pay **before income tax but
after NI**. Full income-tax relief at the marginal rate is given immediately (no
self-assessment), but there is **no NI relief**.

- Net-cost outcome is the **same as RAS after all relief** (basic £80, higher
  £60, additional £55 per £100), but delivered upfront and without a claim.
- Because relief is at the marginal rate automatically, low earners below the PA
  get **no** relief here (a known net-pay disadvantage vs RAS).

### (c) Salary sacrifice

The employee gives up contractual gross salary; the employer pays that amount
(often plus its own NI saving) into the pension as an **employer** contribution.
This saves income tax **and employee NI** on the sacrificed pay — the reason it
is the cheapest method.

Net cost per £100 sacrificed = £100 × (1 − marginal income-tax rate − marginal
**employee** NI rate):

| Taxpayer (rUK) | Income tax | Employee NI | Net cost per £100 into pension |
|---|---|---|---|
| Basic rate (earnings £12,570–£50,270) | 20% | 8% | **£72** |
| Higher rate (£50,270–£100,000) | 40% | 2% | **£58** |
| £100k–£125,140 (60% band) | 60% | 2% | **£38** |
| Additional rate (>£125,140) | 45% | 2% | **£53** |

Scotland salary sacrifice (NI still 8%/2% at rUK thresholds):

| Scottish taxpayer | Income tax | Employee NI | Net cost per £100 |
|---|---|---|---|
| Basic/Intermediate | 20% / 21% | 8% | £72 / £71 |
| £43,663–£50,270 | 42% | 8% | **£50** |
| Higher (£50,270–£75,000) | 42% | 2% | £56 |
| Advanced (£75,001–£125,140)* | 45% | 2% | £53 |
| Top (>£125,140) | 48% | 2% | £50 |

\* The Scottish 60% PA-taper band (£100k–£125,140) is 45% + 12% taper effect =
57% income tax + 2% NI → net cost ~£41.

**Employer NI top-up.** If the employer shares its 15% saving into the pot, the
gross contribution grows *above* the salary sacrificed — that raises the pension
input, it does **not** lower the net cost. Model it as an uplift to the gross
amount, keyed off an optional "employer shares NI saving (%)" input.

**Summary — net cost per £100 gross into the pension (rUK):**

| Taxpayer | RAS / Net pay | Salary sacrifice |
|---|---|---|
| Basic | £80 | £72 |
| Higher | £60 | £58 |
| 60% band | £40 | £38 |
| Additional | £55 | £53 |

---

## 6. Caveats that matter for correctness

- **Annual allowance: £60,000** (2026/27), covering *all* contributions
  (employee + employer + tax relief). Unused allowance can be carried forward 3
  years. Source: [Pension schemes rates (GOV.UK)](https://www.gov.uk/government/publications/rates-and-allowances-pension-schemes/pension-schemes-rates).
- **Tapered annual allowance.** For adjusted income over **£260,000**, the AA
  falls £1 per £2 of excess, to a floor of **£10,000** (reached at adjusted
  income ≥ £360,000). Only bites if threshold income also exceeds £200,000.
  [Work out your tapered annual allowance (GOV.UK)](https://www.gov.uk/guidance/pension-schemes-work-out-your-tapered-annual-allowance).
- **MPAA: £10,000.** Once someone has *flexibly accessed* a DC pot, their money-
  purchase annual allowance drops to £10,000 and carry-forward no longer applies
  to DC contributions. Directly relevant to a drawdown app — a user already
  drawing down likely has the MPAA, so further contributions are capped at
  £10,000.
- **Relief is limited to relevant UK earnings**, or £3,600 gross if earnings are
  lower. Tax relief cannot exceed 100% of earnings.
- **Salary sacrifice cannot take pay below the National Minimum/Living Wage.** The
  employer must reject a sacrifice that would breach NMW, so the maximum
  sacrifice is bounded by (gross pay − NMW-equivalent). Flag this rather than
  silently allowing a sacrifice that would be illegal.
- **Higher/additional-rate RAS relief is claimed, not automatic** — via
  self-assessment or a tax-code change (see §5a). The upfront cost differs from
  the final net cost; be explicit about which the figure represents.
- **The 8% employee NI rate applies only between PT and UEL.** Above £50,270 the
  relevant employee NI rate for salary sacrifice is **2%**, which is why higher-
  and additional-rate sacrifice saves less NI than basic-rate sacrifice.
- **Welsh (C) rates equal rUK rates** for now, so no separate net-cost path is
  needed — but keep region as an input in case that changes.

---

## 7. How to compute the net cost of a contribution

**Inputs**
- `salary` — gross annual salary (£)
- `contribution` — gross amount going *into* the pension (£/yr). (For salary
  sacrifice this equals the salary sacrificed, before any employer NI top-up.)
- `method` — `"ras"` | `"netpay"` | `"salsac"`
- `region` — `"ruk"` | `"scotland"`
- optional `employerNiShare` — fraction of the employer's 15% NI saving added to
  the pot (salary sacrifice only; default 0)

**Output** — `netCost`: the reduction in annual take-home pay.

**Step 1 — marginal income-tax rate on the top slice of the contribution.**
The contribution comes out of the *top* of income, so use the rate at
`salary` and, if the contribution spans a band boundary, split it across bands.
Band edges (taxable-income basis, add PA £12,570 for salary figures):

- rUK: 20% to £50,270; 40% £50,270–£100,000; **60%** £100,000–£125,140
  (PA taper); 45% above £125,140.
- Scotland: 19% to £16,537; 20% to £29,526; 21% to £43,662; 42% to £75,000;
  45% to £125,140 (with a **57%** effective sub-band £100,000–£125,140 from the
  reserved PA taper); 48% above £125,140.

**Step 2 — marginal employee-NI rate (salary sacrifice only, UK-wide):**
8% where the sacrificed slice sits between £12,570 and £50,270; 2% above
£50,270; 0% below £12,570.

**Step 3 — apply the method.**

- **RAS / net pay:** `netCost = contribution × (1 − t)` where `t` is the
  (blended) marginal income-tax rate from step 1. No NI term. For RAS,
  additionally expose `upfrontOutlay = contribution × 0.80` (the 80% paid before
  the higher/additional-rate claim).
- **Salary sacrifice:** `netCost = contribution × (1 − t − n)` where `n` is the
  marginal employee-NI rate from step 2. Then, if `employerNiShare > 0`, the
  amount landing in the pot is `contribution × (1 + 0.15 × employerNiShare)` —
  report that as the effective gross while `netCost` is unchanged.

Where a contribution straddles bands, compute per-slice and sum; do not apply a
single rate to the whole amount.

### Worked examples (2026/27, rUK unless stated)

**A. Basic-rate, salary sacrifice.** Salary £35,000, sacrifice £2,000.
Slice sits in the 20% / 8% zone. `netCost = 2,000 × (1 − 0.20 − 0.08) = £1,440`.
£2,000 into the pension costs £1,440 of take-home (£560 saved). With a full
employer NI share, the pot receives 2,000 × 1.15 = £2,300 for the same £1,440.

**B. Higher-rate, RAS.** Salary £70,000, gross contribution £10,000.
Marginal tax 40%. `netCost = 10,000 × (1 − 0.40) = £6,000`. Upfront the employee
pays £8,000 (80%); the remaining £2,000 comes back via self-assessment/tax code.
No NI relief.

**C. 60%-band, salary sacrifice.** Salary £110,000, sacrifice £10,000 (pulls
income from £110k down to £100k — entirely inside the £100k–£125,140 taper band).
Marginal income tax 60%, employee NI 2%. `netCost = 10,000 × (1 − 0.60 − 0.02)
= £3,800`. £10,000 into the pension for £3,800 of take-home — the most efficient
common case.

**D. Scottish higher-rate straddling the UEL.** Salary £48,000 (Scotland),
salary sacrifice £5,000 (income falls to £43,000, all within £43,663–£50,270 at
the top). Scottish income tax 42%, employee NI 8% (below UEL).
`netCost = 5,000 × (1 − 0.42 − 0.08) = £2,500` — a 50% effective saving, higher
than the rUK basic-rate equivalent because of the 42%+8% overlap.

---

*Compiled 25 September 2026 for the 2026/27 tax year. Verify against GOV.UK
before each new tax year; the threshold freeze runs to April 2031, but rates and
Scottish bands are reset annually.*
