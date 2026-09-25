# UK Pension Planning Research

Desk research into where UK pension questions get asked online, and what people
actually ask. Compiled September 2026.

This page is the summary. [`desk-research.md`](desk-research.md) is the full
write-up; [`thread-index.md`](thread-index.md) annotates ~230 individual threads
by category.

Both hypotheses survive, but the first is mis-framed. People usually already have a pot forecast — what they cannot do is tell whether it is in today's money, what monthly income it buys after tax, or where the State pension fits. The second hypothesis is the more underserved of the two, and the planner does not address it at all.

## The two hypotheses, judged

**H1 — "It's not easy to understand how much my pension will be worth on an annual or monthly basis when I retire."** Directionally right, imprecisely framed. The pot value is usually available; providers post one every year. Four things are missing around it: whether the figure is real or nominal, what sustainable monthly income it converts to, what that is after tax, and how the State pension sits alongside. Framed as "how much will my pension be worth", the problem is half-solved by every provider statement. Framed as "what will I actually be able to spend each month, and is that enough", it is wide open.

**H2 — "...or how much I need to contribute in order to achieve a certain income."** Validated, and the more underserved of the two. The community treats the tooling as something to hunt for — one reply describes needing "reverse pension calculators, where you say what your target is and it will say what your contributions need to be."

Two refinements matter. The unit is wrong: people pull this lever as a **percentage of salary via salary sacrifice**, and judge it by **the effect on take-home pay**, not as an abstract annual contribution. And the target income is net, with the State pension already counted in.

The planner does not do H2 at all. It projects forward from contributions to an outcome; nothing runs the other way.

## What people actually ask

Twenty-one distinct categories across ~330 threads. Bands are a ranked estimate, not a count — see the method note at the end.

| Category | Band | What is actually being asked |
| --- | --- | --- |
| Am I on track? | Very high | Pick a target income, subtract State pension, multiply by 25 or 33. Every step done by hand. |
| Is this forecast right? | Very high | People have a projection and cannot tell whether it is real or nominal. |
| Pot → income, will it last | Very high | Converting a pot to a monthly figure. Answered with a flat 4% regardless of inputs. |
| Tax-free cash and crystallisation | Very high | What taking the 25% does to the rest of the pot, and when to take it. |
| Salary sacrifice, match, relief | Very high | What does X% cost my take-home and gain my pot. |
| Tax on withdrawals | Very high | Emergency tax, marginal rate, personal allowance, MPAA. |
| Finding and consolidating pots | High | Cannot plan what you cannot see. |
| Access age, bridge, ISA vs pension | High | Funding the years before 57, and which wrapper first. |
| State pension | High | Forecast is unreadable; NI top-ups are a real decision. |
| DB vs DC valuation | High | "What DC pot would match this DB income?" — your conversion, reversed. |
| Annual allowance, £100k trap | High | Carry forward, tapering, hitting a precise adjusted income. |
| Pension vs mortgage vs ISA | High | Where the next £100 goes. A comparison with no tool. |
| Fees and fund choice | High | Investment selection — a different job to planning. |
| Self-employed and directors | High | No match, no sacrifice, no auto-enrolment nudge. |
| Opting out and auto-enrolment | High | Often driven by distrust, not ignorance. |
| De-risking and lifestyling | Moderate | A flat growth rate cannot represent a glidepath. |
| Couples and joint planning | Moderate | Structurally unserved by every consumer tool. |
| Withdrawal sequencing | Moderate | The most computationally demanding thing people attempt by hand. |
| Pension basics | Moderate | Why a pension beats an ISA at all. |
| Rule changes (IHT 2027, sal-sac cap) | Spiky | "Should I change my plan?" — a comparison need. |
| Tools and calculators | Moderate | What people use today, and what they build themselves. |

## What the pattern means

**1. The scarce good is translation, not projection.** Most people already have a number. Every high-frequency category is a translation step: pot to income, future £ to today's £, gross to net, "£500k" to "is that enough". Another projection adds nothing.

**2. Nominal versus real is the single largest comprehension failure**, and it runs both ways. People panic at a real-terms forecast read as nominal, and relax at a nominal one read as real. Nearly every such thread resolves with the same sentence: *that figure is already in today's money*. The industry causes this — statements and calculators use different bases and rarely label them. **Your basis toggle is not a feature. It is the product, and it should lead the pitch.**

**3. Everyone arrives believing 4%.** It is quoted with no reference to the asker's growth, inflation, horizon or fees. Your sustainable rate moves with the user's own inputs, which is exactly what the 4% rule does not do — but it has to be introduced as an answer to *"why isn't it just 4%"*, not as though the reader has no prior.

**4. Crystallisation is where real money is lost.** The specific error — expecting 25% of post-crystallisation growth — recurs constantly and is irreversible once acted on. Your two-bucket model is the only consumer implementation found of the thing people most consistently get wrong. Say so explicitly.

**5. Nobody's retirement is one pot, and nobody's income question is gross.** The accepted answer always assembles multiple DC pots, sometimes a DB scheme, the State pension, an ISA bridge and a tax calculation. A single-pot, pre-tax, State-pension-free projection answers a question that only exists inside the tool. This is the biggest gap between the planner and the discourse.

**6. Two populations, and the larger one is unserved.** Reddit skews 25–45 and accumulation. MoneySavingExpert and Lemon Fool skew 50–67 and decumulation. The planner's six steps lean decumulation, but the bigger, faster-growing audience is accumulation — and its central question, working back from a target income to a contribution, the planner does not answer.

**7. The comparative question is unmet everywhere.** "Retire at 57 or 60?" "Sacrifice 10% or 15%?" "Take the lump sum or not?" Every tool models one future at a time. One thread on mortgage-versus-pension is titled *"my wife and I keep going in circles"* — that is a comparison problem without a tool.

**8. Distrust is active and specific.** "Ignore the calculators" was an upvoted reply. One person explaining why they opted out: *"my pension has grown only by 2k in 10 years."* That is a legibility failure producing a behavioural cost. Visible assumptions are themselves a feature.

## Revised problem statements

Ranked by frequency multiplied by how badly served each is today.

| # | Problem, in the user's voice | Evidence | Planner today |
| --- | --- | --- | --- |
| P1 | "I have a forecast, but I can't tell whether it's in today's money, so I can't tell whether it's good." | The most common comprehension failure found, running in both directions | **Solved** — lead with it |
| P2 | "I can't turn a pot into the monthly income I'd actually receive — sustainably, after tax, alongside my State pension." | Every "how much a month" question is asked net and whole-picture | **Partial** — tax and State pension missing |
| P3 | "I know what income I want. I can't work back to what I'd contribute, as a % of salary and a cost to my take-home." | Asked constantly; people hunt for "reverse calculators" | **Not solved** — clearest opportunity |
| P4 | "I've been told 4% is safe. Nobody can tell me if that's true for my assumptions." | 4% quoted universally and invariantly | **Solved best of anyone** — said too quietly |
| P5 | "I don't understand what taking my tax-free cash does to the rest of the pot." | Highest-stakes misconception in UK DC; irreversible when acted on | **Solved** — claim it explicitly |
| P6 | "I can't see what retiring at 57 versus 60 versus 67 costs me." | The most common comparative question in the corpus | **Not solved** — already top of TODO |
| P7 | "My retirement income comes from several pots, a DB scheme, the State pension and an ISA. Nothing shows them as one plan." | The accepted forum answer is always multi-source | **Not solved** — largely gated on the dashboard |
| P8 | "I don't believe the numbers because I can't see what's behind them." | Vocal, specific distrust of provider calculators | **Partial** — assumptions sit in the README, not the product |

P7 is worth explicitly declining. Full aggregation depends on the pensions dashboard, which does not reach consumers until FY 2027/28. Supporting a manual sum of several pots covers most of the value at a fraction of the cost.

## What to build, in order

1. **The State pension, as a toggleable layer with a start age.** Roughly £12k that every forum answer folds in within two replies, and **36% of non-retirees aged 45+ expect it to be their main income source**. Excluding it makes the headline income figure wrong in the direction of alarming. For a large share of likely users it is the biggest line in their retirement, and the planner omits it.
2. **Income tax on drawdown.** Every "per month" question in the corpus is asked net; the planner outputs gross. Marginal rate plus personal allowance closes most of the gap. Emergency tax on the first withdrawal deserves at least a note.
3. **The reverse calculation (P3).** Target income to required contribution, expressed as a percentage of salary and a cost to take-home. A distinct mode, not a tweak — and the half of the original hypothesis the tool does not address.
4. **Scenario comparison (P6).** Already on the TODO. The research moves it from "nice" to "the most-asked comparative question in the category".
5. **Frame the sustainable rate against 4%.** Users arrive believing 4%. The copy must answer *"why isn't it just 4%"* rather than presenting the rate as if the reader has no prior.
6. **Multiple pots on step 01.** Not an aggregator — just let someone add three figures in the tool rather than on paper.
7. **Resolve the verdict chip.** "Lasts beyond 90" is both always-true and the answer to a question nobody asked. The honest real-terms statement is what the research says people want.
8. **Consider making fees an input.** The planner asks users to net 0.3–0.8% off the growth rate themselves. Fee anxiety is a high-frequency category, and a hidden mental step is exactly what produces the distrust in P8.

**One caution before sharing.** r/UKPersonalFinance removes tool promotion under Rule 12 without prior moderator approval. If posting the planner there was part of the plan, clear it with the mods first.

## Where these conversations happen

| Community | Members | Growth | Character |
| --- | --- | --- | --- |
| [r/UKPersonalFinance](https://www.reddit.com/r/UKPersonalFinance/) | 1.9M | +5.4%/yr | The centre of gravity. Wiki-first, heavily moderated |
| [r/FIREUK](https://www.reddit.com/r/FIREUK/) | 324k | +12.5% | Decumulation sequencing, bridge years, tax optimisation |
| [r/HENRYUK](https://www.reddit.com/r/HENRYUK/) | 136k | — | £150k+. Annual allowance, tapering, the £100k trap |
| [r/LeanFireUK](https://www.reddit.com/r/LeanFireUK/) | 21k | +24.6% | Small-pot early retirement |
| [r/PensionsUK](https://www.reddit.com/r/PensionsUK/) | 15k | **+199.5%** | Small but tripled in a year — the topic separating from its parent |

Beyond Reddit: [MoneySavingExpert's pensions board](https://forums.moneysavingexpert.com/categories/pensions-annuities-retirement-planning) (~2,750 pages; its State-pension top-ups subcategory alone holds 753 discussions and 6,532 comments) and [The Lemon Fool](https://www.lemonfool.co.uk/) (Retirement Investing 12,043 posts; Pensions–Practical 9,180).

**A caution about MSE's scale.** Its size suggests enormous planning demand, but the planning conversation is concentrated in a few long-lived megathreads — [Pensions Planning: The NUMBER](https://forums.moneysavingexpert.com/discussion/2146737/pensions-planning-the-number) alone carries 2,963 comments. Sorted by newest, the board is almost entirely execution: transfers, scheme-specific rules, annuity mechanics, complaints. **The addressable planning audience is disproportionately on the Reddit side, in accumulation.**

### The market numbers

FCA figures below are from the primary source. Watch the denominators — secondary reporting routinely drops the qualifier.

- **29% of adults holding a DC pension in accumulation do not know how much they have saved.** Asked a follow-up, 17% could say whether it was above or below £10,000; **12% still could not.**
- **33% of DC pension holders have less than £10,000** saved, down from 40% in 2020.
- **17% of adults (9.3m) have no private pension provision at all** — rising to 29% of the self-employed and 47% of 18–24s.
- **45% of UK adults have a pension being contributed to**, statistically unchanged from 46% in 2022.
- **31% of non-retirees have not really thought about how they will manage financially in retirement.**
- **36% of non-retirees aged 45+ expect the State pension to be their main source of income.**
- **39% of people are not on track for even a minimum retirement lifestyle**, up from 35% in 2023, with projected average income of £17.2k against a £13,400 minimum standard.
- **PLSA Retirement Living Standards (2025)**, the reference every forum answer reaches for: one-person household £13,400 minimum / £31,700 moderate / £43,900 comfortable. Two-person: £21,600 / £43,900 / £60,600. Housing excluded.

Two structural facts bear on timing. The **consumer pensions dashboard is seven to eighteen months away** (FY 2027/28), so "I don't know what I have" stays unsolved meanwhile. And **targeted support went live on 6 April 2026** — a new regulated tier between generic guidance and full advice, which the FCA expects many firms to offer free. Regulated firms are about to start shipping things that look like planning tools with a recommendation attached.

## How solid this is

**Reddit was never read directly.** It is blocked at the Claude tool layer — confirmed in both the in-app browser and Claude in Chrome driving a real logged-in session, while other sites load fine in the same call. The corpus is ~330 distinct threads surfaced through Brave's index across ~30 queries. For each, I have the title and one snippet of whichever passage matched the query. No post bodies, no comment chains, no scores, no comment counts.

**What that supports and what it doesn't.** The qualitative findings are robust: certain resolving sentences recur across dozens of independently-surfaced threads, and the "that's already in today's money" pattern appeared in nine or ten threads found through three unrelated queries. That is a pattern sampling method cannot manufacture. **The frequency bands are the soft part.** Threads surfaced by keywords I chose are a sample of my queries, not of what the subreddits discuss.

**Would harder numbers change anything?** Probably not. The build order above does not reorder based on whether the today's-money confusion is 12% or 18% of threads. If you want firmer evidence, ten user conversations with people in the accumulation cohort would tell you more about whether P3 is worth building than perfect Reddit counts would. Reddit's API does have a free non-commercial tier at 100 queries/minute, but access now requires manual approval under its Responsible Builder Policy, with reported 2–4 week queues — and whether an integration is appropriate depends on why reddit.com is blocked here, which is a question for whoever sets that policy.

**Corrections made during the research**, recorded because they show where secondary sources fail:

- Three of four FCA figures I first reported were wrong. They came from a search engine's synthesis of secondary coverage, which consistently drops the base qualifier: "29% of adults with a DC pension" becomes "29% of adults". The no-private-pension figure was reported as 19% and is **17%**. All figures above are now read from the primary FCA source.
- The MoneySavingExpert board's scale initially read as planning demand. Reading it directly showed the daily queue is execution, not planning — which inverts what its size implies.
- DB valuation and couples planning were both missed in the first pass and are substantial categories.

## The calculators people actually use

**The most-recommended tool in the corpus is not a product. It is a spreadsheet.** Eight to ten separate threads land on "build your own", and the top reply to [What tool to use for UK personal finance?](https://www.reddit.com/r/UKPersonalFinance/comments/1rsy6rt/what_tool_to_use_for_uk_personal_finance/) is blunt: *"Spreadsheet. Do it yourself. Don't know how? Learn."*

This ranks by **how many distinct threads independently recommended each tool**, not by rating — Reddit scores and comment counts were not accessible. Three threads or fewer is weak signal, and the sample reflects the queries I ran.

| Tool | Threads | Type | What people say |
| --- | --- | --- | --- |
| A spreadsheet you build yourself | 8–10 | DIY | "The only thing that will cover everything you need to model your situation properly" |
| **James Shack's** retirement planner | 3 | Free spreadsheet from a UK planner's YouTube channel | The default answer for couples. One thread notes he "seems to have stopped sharing it" — verify availability |
| **Which?** pension calculator | 3 | Web, subscription site | A reference point; one thread is someone asking for help interpreting its drawdown output |
| **Hargreaves Lansdown** calculators | 3 | Provider, free | Called "accurate" for higher-rate relief. Also the thread where users cannot tell whether it applies inflation or takes tax-free cash at 55 |
| **Guiide** | 1, multi-vote | Web, UK drawdown planner | "Another vote for Guiide — powerful and easy to use for most people", with acknowledged limits. **Your closest UK comparator** |
| **Vanguard** and **Aviva** calculators | 2 each | Provider, free | Named in the UKPF wiki; the usual starting point for beginners |
| **MoneyHelper** | 2 | Official, free | Contribution calculator; also where people get a shortfall figure |
| **HMRC** carry-forward calculator | 2 | Official, free | Handles the taper. One thread is titled *how should I interpret its results* |

### The long list, by what it is for

**Full retirement and drawdown planners** — the direct competitive set

- **Guiide** — UK drawdown planner, the most enthusiastically endorsed product
- **James Shack's** retirement planner spreadsheet — handles couples
- **MyFinanceFuture** — UK cashflow planning, recommended by PensionCraft
- **Voyant** — subscription; the tool advisers use, some consumers buy it
- [Royal London retirement income and lifestyle planner](https://www.royallondon.com/guides-tools/pension-guides/pension-tools/retirement-income-and-lifestyle-planner/) — "high level but lets you add various sources of income"
- [Which? pension calculator](https://www.which.co.uk/money/pensions-and-retirement/pensions-and-retirement-calculators/pension-calculator-how-much-will-i-have-am9uZ9U1i7HO)
- Hargreaves Lansdown, Vanguard, Aviva and PensionBee calculators — provider-run, free, named in the UKPF wiki

**FIRE and withdrawal simulators** — US-built, used anyway

- [cFIREsim](https://www.cfiresim.com/) — historical-sequence backtesting
- **ficalc.app** — "lets you add income such as state pensions for you and partner"
- **Big ERN / Early Retirement Now** safe-withdrawal spreadsheet

**Contribution, tax and allowance calculators**

- **HMRC** pension carry-forward and annual allowance calculator — official, and still hard to interpret
- **MoneyHelper** workplace pension contribution calculator
- [Essentially Financial pensions shortfall calculator](https://www.essentiallyfinancial.co.uk/online-services/calculators/?title=Pensions+Shortfall+Calculator&id=6)
- **The Salary Calculator** and **goodcalculators.com** salary-sacrifice calculator — both in the UKPF wiki
- **Legal & General** and [Hargreaves Lansdown](https://www.hl.co.uk/retirement/annuities) annuity quote tools

**Official tools, for the inputs rather than the projection**

- **gov.uk State Pension forecast** and the HMRC personal tax account NI record
- [gov.uk pension tracing service](https://www.gov.uk/find-pension-contact-details) — finding lost pots
- **PensionBee**, **Penny** and L&G's tracking service — commercial tracing, mixed reports of success

**Methods rather than tools** — what people follow when they build their own

- **Lars Kroijer's** YouTube playlist on building a projection spreadsheet, cited repeatedly
- **PensionCraft** — the channel that sends people to MyFinanceFuture
- The UKPF wiki's own [pensions page](https://ukpersonal.finance/pensions/), which is where the sub sends everyone first

### What none of them do well

The complaints are consistent across threads, and they map onto the problem statements above.

- **Assumptions are invisible.** In [Which calculator to use for retirement?](https://www.reddit.com/r/UKPersonalFinance/comments/18z2a5x/which_calculator_to_use_for_retirement/) users cannot tell whether HL is applying inflation or taking tax-free cash at 55. That is P1 and P8 in one thread.
- **UK options are thin.** ["A lot of what I have seen so far is US centric, or if it is UK based, doesn't look that good."](https://www.reddit.com/r/UKPersonalFinance/comments/1ojebfp/personal_finance_retirement_pension_tools/)
- **Variable income and spending are missing.** The best thread on the subject, [Which pension calculators do you use?](https://www.reddit.com/r/UKPersonalFinance/comments/1mdykdq/which_pension_calculators_do_you_use/), faults calculators for ignoring the State pension switching on partway and the go-go/slow-go/no-go spending curve.
- **Couples are unsupported.** The [only answer](https://www.reddit.com/r/UKPersonalFinance/comments/1c2ii6s/is_there_a_pension_calculator_out_there_which/) to a direct request for a couples calculator is a YouTuber's spreadsheet.
- **They can drive the wrong behaviour.** In [Best tool for working out pension projection?](https://www.reddit.com/r/UKPersonalFinance/comments/1if24y2/best_tool_for_working_out_pension_projection/) a low projection leads the asker to consider *reducing* contributions — a legibility failure with a direct financial cost.

Two threads are people publishing calculators they built themselves ([one](https://www.reddit.com/r/FIREUK/comments/1obhx2s/i_made_a_pension_calculator_anyone_good_with/), [two](https://www.reddit.com/r/FIREUK/comments/1jsi965/i_made_a_retirement_forecast_spreadsheet_and_you/)). The top feature request on the second is automatic State pension netting — already first on your build list.

## Sources

Pages actually opened and read. The [annotated thread index](thread-index.md) links ~230 individual threads by category.

**Research and regulation**

- [FCA Financial Lives 2024 — Pensions: Selected findings](https://www.fca.org.uk/publication/financial-lives/fls-2024-pensions.pdf) (May 2025) — source of every FCA figure above
- [Scottish Widows — risk of retirement poverty](https://www.scottishwidows.co.uk/about-us/media-centre/press-releases/million-at-risk-of-retirement-poverty.html) (7 May 2025)
- [PLSA Retirement Living Standards 2025](https://www.lboro.ac.uk/news-events/news/2025/june/cost-of-retiring-falls-calculated-loughborough/) (Loughborough)
- [Pensions Dashboards Programme — connection deadline](https://www.pensionsdashboardsprogramme.org.uk/connection/deadline)
- [FCA Advice Guidance Boundary Review](https://www.fca.org.uk/firms/advice-guidance-boundary-review) and [PS25/22, targeted support rules](https://www.fca.org.uk/publications/policy-statements/ps25-22-consumer-pensions-investment-decisions-rules-targeted-support)
- [Pension IHT changes from April 2027](https://www.royallondon.com/guides-tools/planning-ahead/estate-planning/changes-to-inheritance-tax-on-pensions-from-2027/) (Royal London)

**Communities**

- [UKPersonalFinance wiki — Pensions](https://ukpersonal.finance/pensions/) — the sub's canonical answer set, and its recommended calculators
- [MoneySavingExpert — Pensions, annuities & retirement planning](https://forums.moneysavingexpert.com/categories/pensions-annuities-retirement-planning)
- [The Lemon Fool](https://www.lemonfool.co.uk/)
- Subreddit sizes via [GummySearch](https://gummysearch.com/r/UKPersonalFinance/)

The calculator list above is drawn from tool-recommendation threads across r/UKPersonalFinance, r/FIREUK and r/PensionsUK, plus the UKPF wiki's own recommendations.
