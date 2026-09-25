# Where UK pension questions get asked, and what people actually ask

Desk research for the Retirement Planner (https://clemmo93.github.io/pension-planner/).
Compiled 21 September 2026.

**[README.md](README.md) is the current synthesis.** It supersedes sections 4-7
below, which are an earlier pass: it carries eight findings rather than seven,
corrected FCA figures, and a survey of the calculators people actually use.

---

## 1. Method, and what it can and cannot tell you

Reddit could not be read directly from this environment — both direct fetching
and the browser pane are blocked for reddit.com, and the general web index
excludes it. The sample was therefore built from:

- **Brave's search index**, which does index Reddit. Sixteen productive themed
  queries (four more returned nothing) gave ~285 result rows, of which ~230 were
  Reddit. Stripping cross-query duplicates leaves **roughly 200–210 distinct
  threads** across r/UKPersonalFinance, r/PensionsUK, r/FIREUK, r/HENRYUK and
  adjacent subs. Each row carries the thread title and a snippet of *whichever
  passage matched the query* — not, as I first wrote, the top-voted answer.
  Brave does not expose that. **No thread was opened.** Reddit was blocked at
  every route, so no post bodies, comment chains, scores or comment counts were
  seen.
- **MoneySavingExpert forums**, read directly.
- **The Lemon Fool**, read directly, for board sizes and character.
- **The r/UKPersonalFinance community wiki** (ukpersonal.finance), which is the
  canonical answer set the subreddit points people at — useful because it shows
  which questions were asked often enough to be worth writing down once.
- **Published research** from the FCA, PLSA, Scottish Widows and the Pensions
  Dashboards Programme, for sizing.

**What this does not support.** No vote counts, no comment volumes, no
time-series, no census. Search indexes over-represent threads that attracted
inbound links and recent activity. So the frequency bands below are a *ranked
estimate with its evidence attached*, not a measurement. Where a band rests on
something stronger than my sample — a subreddit creating a dedicated wiki
section, MSE spinning out a whole subcategory — I say so, because that is a
community telling you what it is tired of answering.

---

## 2. The landscape

### Reddit

| Community | Members | Growth (yr) | Character |
|---|---:|---:|---|
| r/UKPersonalFinance | 1.9M | +5.4% | The centre of gravity. General personal finance; pensions are one of the largest recurring topics. Heavily moderated, wiki-first, strong "read the flowchart" culture. |
| r/FIREUK | 324k | +12.5% | Financial independence. Older, richer, more numerate. Decumulation sequencing, bridge years, tax optimisation. |
| r/HENRYUK | 136k | — | £150k+ earners. Annual allowance, tapering, salary sacrifice, the £100k trap. |
| r/LeanFireUK | 21k | +24.6% | Frugal FIRE. Small-pot early retirement. |
| **r/PensionsUK** | **15k** | **+199.5%** | Small but tripling year on year. Pensions only — the purest signal of the topic separating out from general personal finance. |

Adjacent and lower-signal: r/AskUK, r/UKFinanceOver30, r/ContractorUK,
r/smallbusinessuk (pension threads appear in all of them), plus the very large
US subs (r/personalfinance, 21.8M) whose advice people arrive quoting and which
does not apply here.

r/PensionsUK's growth rate is the most interesting number in the table. A
dedicated UK pensions community tripling in a year, against 5% growth in the
general finance sub, says the topic is pulling away from its parent category.

### Non-Reddit

| Venue | Scale | Character |
|---|---|---|
| **MoneySavingExpert forums** — Pensions, Annuities & Retirement Planning | ~2,750 pages of threads; a dedicated "Topping up your state pension" subcategory alone holds 753 discussions and 6.5k comments | Older cohort, at or near retirement. Long, detailed, numbers-heavy "can I retire / how do I draw this down" threads. Semi-professional regulars, including practising IFAs who declare themselves. |
| **The Lemon Fool** | Retirement Investing (inc FIRE): 555 topics / 12,043 posts. Pensions – Practical Problems: 910 topics / 9,180 posts | Successor to the old Motley Fool UK boards. Small, expert, high signal-to-noise. Decumulation and tax mechanics. |
| MoneyHelper / Pension Wise | Statutory guidance, 50+ | Not a discussion venue, but the thing every forum answer eventually points at. |
| Provider forums and YouTube comment sections | — | James Shack's spreadsheet and PensionCraft come up repeatedly as what people actually use. Worth watching as the real competitive set. |

**The split matters.** Reddit skews 25–45 and accumulation ("am I on track, how
much should I pay in"). MSE and Lemon Fool skew 50–67 and decumulation ("what
order do I draw, what tax will I pay, annuity or drawdown"). These are two
different products dressed as one topic.

**A refinement, from reading the MSE board directly.** Its planning discussion
and its daily traffic are not the same thing. Sorted by all-time top, the board
is dominated by long-running retirement diaries and by one megathread —
*"Pensions Planning: The NUMBER"*, **2,963 comments**, still active in August
2026 — devoted entirely to working out how much you need. Sorted by new, almost
nothing is a planning question. A snapshot of the newest threads:

> *Transfer SIPP to different platform?* · *NHS Pension — Ill Health Retirement —
> Tax Implications?* · *LGPS Shared Cost AVC vs Stocks & Shares ISA* · *Civil
> Service AVCs (L&G) — delay in monthly contribution?* · *Crystallisation on ii* ·
> *Purchasing multiple annuities with same provider* · *Complain to pension
> company or ombudsman?* · *State Pension when moving to a country where
> increases are frozen* · *Deferred State Pension* · *Advise needed for small
> pension pot of £9k*

These are **execution** problems: transfers, scheme-specific rules, annuity
purchase mechanics, complaints, state pension edge cases. So MSE's sheer size
overstates the planning demand sitting there — the planning conversation is
concentrated in a handful of long-lived threads, while the daily flow is
transactional support that no projection tool addresses.

The implication runs the other way from what the board's scale suggests: the
addressable planning audience is disproportionately on the Reddit side, in
accumulation. That is the audience whose central question — work backwards from
a target income to a contribution — the planner does not currently answer.

### Sizing the problem from published research

All FCA figures below were read from the primary source: *Financial Lives 2024
survey — Pensions, Selected findings*, May 2025. Watch the denominators; the
secondary reporting of this survey routinely gets them wrong.

- **29% of adults holding a DC pension in accumulation do not know how much
  they have saved.** Asked a follow-up, 17% could at least say whether it was
  above or below £10,000; **12% still could not.** (Base: all UK adults holding
  a DC pension in accumulation, n=8,164.)
- **33% of DC pension holders have less than £10,000** in DC savings, down from
  40% in 2020. 56% have £10,000 or more.
- **17% of adults (9.3m) have no private pension provision at all.** Highest
  among the unemployed (54%), others not in work (59%), 18–24s (47%),
  low-income households (43%) and the self-employed (29%).
- **45% of UK adults have a pension in accumulation being contributed to**,
  statistically unchanged from 46% in 2022.
- **31% of non-retirees have not really thought about how they will manage
  financially in retirement**, down from 35% in 2017. Women more than men.
- **36% of non-retirees aged 45+ expect the State pension to be their main
  source of income in retirement.**
- **39% of people are not on track for even a *minimum* retirement lifestyle**,
  up from 35% in 2023. Projected average retirement income £17.2k against a
  minimum standard of £13,400 for a one-person household. (Scottish Widows
  Retirement Report, 7 May 2025 — read at source.)
- Widely reported but **not verified here**: that only 9% of adults took
  financial advice on pensions or investments in the last 12 months, and that
  ~23 million consumers sit in the advice gap. Both are attributed to the FCA
  but come from a different publication to the one above. Treat as indicative
  until checked.
- **PLSA Retirement Living Standards (2025)**, the number every forum answer
  reaches for: one-person household £13,400 minimum / £31,700 moderate /
  £43,900 comfortable. Two-person: £21,600 / £43,900 / £60,600. Excludes housing.
- **Pensions dashboards**: ~85% of records connected, final connection deadline
  31 October 2026, but the public MoneyHelper dashboard is not expected until
  **financial year 2027/28**.
- **Targeted support** went live 6 April 2026 — a new regulated tier between
  generic guidance and full advice, which the FCA expects many firms to offer
  free.

Two of these bear directly on positioning. The consumer dashboard is seven to
eighteen months away (FY 2027/28 runs April 2027 to March 2028), so "I don't
know what I have" stays unsolved meanwhile. And targeted support means
regulated firms are about to start offering something that looks a lot like a
planning tool with a recommendation attached.

The 36% figure is worth dwelling on. More than a third of people within twenty
years of retiring expect the State pension to be their *main* income — and the
planner excludes it entirely.

---

## 3. What people ask, categorised

Bands: **Very high** (dominates; the sub has canned answers for it),
**High** (recurs constantly, many distinct threads), **Moderate** (steady, or
spiky around events).

---

### A. "Am I on track? How much is enough?" — **Very high**

The most common question in the corpus, and the one the wiki and PLSA standards
exist to answer. Almost always framed by age and pot size.

> *27yo, How much should I have in my pension?* · *Workplace Pension. How much
> should you have at 38 to live comfortably at retirement? Am I on track?* ·
> *35 Years Old - Am I on track?* · *Pensions : How much is enough?* ·
> *Turning 40, how do I work out "what's enough" to retire with?* ·
> *Understanding pension pots and "what's good enough"* ·
> *Help with knowing how much is 'needed' to retire?* (MSE)

The standard answer is a chain: pick a target income → subtract state pension →
multiply the remainder by 25 or 33 → compare to your projected pot. Every step
of that chain is a calculation people are doing by hand or in a spreadsheet.

---

### B. "Is this forecast right? Why is it so low?" — **Very high**

This is the strongest finding in the research and the one most directly relevant
to your product. People *have* a projection. They cannot interpret it.

> *Is this pension forecast actually realistic?* · *Help understanding my
> depressing pension forecast* · *Peoples pension projection oddly low* ·
> *Is this pension prediction good?* · *Is my Pension forecast right?* ·
> *Pension Calculator — Am I missing something?* · *What's wrong with the
> pension calculators?* · *Best tool for working out pension projection?* ·
> *Pension pot — am I the only one behind and panicking?*

**In nearly every case the resolving answer is the same sentence: "that figure
is already in today's money."** A representative reply:

> "Important to note that many of these projections use a real rate of return,
> so the results are expressed in 'today's money'."

And the inverse error, from the other direction:

> "When your annual pension statement says 'we project that you could have
> £500,000', that's £500k in today's money — the larger number it'll actually
> be because of inflation is nominal terms."

So the failure runs both ways. People see a real-terms forecast and panic
because they read it as nominal. People see a nominal forecast and relax because
they read it as real. Nobody can tell which they are looking at, because the
statement rarely says clearly and the tools do not agree with each other.

This is a **nominal-versus-real literacy failure across the entire UK retail
pension industry**, and it is the thing your future £ / today's £ toggle exists
to fix. It is not a feature. It is the product.

A secondary effect: it has bred active distrust. "Ignore the calculators and
focus on watching the fund growth" was an upvoted reply.

---

### C. Turning a pot into an income, and whether it lasts — **Very high**

> *How do I work out what my pension will give me* · *UK, how much will 500k
> pension pot pay me per year* · *£500k pension pot results in £1.5k per month
> annuity — is it worth it?* · *UK — Can I retire? What withdrawal rates can I
> use?* · *Are Annuities better than Pension Drawdown now?* · *How to not run
> out of money?* (FIREUK) · *Pension contribution of £16000 a year for 20 years
> gets you less than £9000 a year at retirement?*

**The community's universal answer is a hardcoded 4%.** It is quoted regardless
of the asker's growth assumption, inflation assumption, time horizon or fees.
Occasionally someone pushes back —

> "firstly there is no such thing as an actual 'safe' withdrawal rate, and
> secondly this is a number based on the US"

— but 4% is what the median reader walks away with, and it is what they will
arrive at your app already believing.

This is a genuine differentiation opportunity. `r* = (g − i) / (1 + g)` moves
with the user's own inputs, which is exactly what the 4% rule does not do. The
risk is that it reads as contrarian. It needs framing against the number people
arrive with, not in isolation from it.

---

### D. Tax-free cash and crystallisation — **Very high**

Conceptually the hardest thing in UK DC pensions and the most-repeated question
set. A dozen near-identical threads surfaced in a single query.

> *25% Pension tax free lump sum — how does it work?* · *25% tax free pension —
> at what point is it calculated?* · *How does the pension 25% tax free cash
> work?* · *How does pension crystallisation work?* · *Confused over tax free
> lump sum from sipp pension* · *Can Pension growth after crystallisation be
> used as part of tax free calcs* · *Pension tax free allowance amount as %;
> does it adjust over time?*

The recurring misconception is precise and consequential: people believe that
after taking the full 25% they can keep taking 25% of subsequent growth.

> "Suppose I have a 200k pot and I take out the full 25% leaving 150k. A year
> later my remaining pot has grown to 160k. Can I then take out another 2.5k
> tax free?" — Answer: no, you crystallised 100% of the pot.

Your two-bucket model — uncrystallised and crystallised, tax-free cash as a
quarter of what you crystallise rather than a pool you draw down — is the only
consumer-facing implementation I saw of the thing people most consistently get
wrong. That is a defensible claim to make about the tool.

---

### E. Contribution optimisation: salary sacrifice, match, tax relief — **Very high**

> *Salary Sacrifice Pension — Worth It?* · *Salary sacrifice to pension, too
> good to be true?* · *Should I salary sacrifice if I'm on £60k?* · *Higher rate
> tax relief and salary sacrifice* · *Should I pay more into my work Pension?* ·
> *When did you stop going hard on salary sacrifice?* · *Increasing salary
> sacrifice pension for higher rate tax payer*

Framed almost exclusively as a **take-home trade**: "for every £1,000 sacrificed
you lose approx £580 in your pay packet." This is the lever people actually
pull. They do not think in "annual contribution"; they think in "what percentage
do I set on the portal, and what happens to my payslip."

---

### F. Tax on withdrawals — **Very high**

> *Tax on Pension. Not working. Why so much tax.* · *X Tax Code with Pension
> Withdrawals* · *Drawdown pension benefits and tax* · *Help me to understand
> SIPP drawdown* · *If I have no income during the tax year and withdraw
> £20,000...* · *Quick sanity check on first Pension Drawdown* (FIREUK)

Emergency tax on the first withdrawal is a shock that generates its own steady
stream of threads. Beyond that: marginal rate, the personal allowance, and the
MPAA restricting future contributions once you draw flexibly.

**Note on stale community answers.** One well-ranked reply still quotes the MPAA
as £4,000. It rose to £10,000 in April 2023. Community answers decay, and the
people reading them cannot tell which ones have.

Relevant to you because **every "how much a month" question is asked in net
terms and your planner answers in gross.**

---

### G. Finding and consolidating pots — **High**

> *Lost track of old pensions — How to rediscover them?* · *Easiest way to find
> old pension pots?* · *How do people keep track of old workplace pensions?* ·
> *Many different pension pots at 35... consolidate or let them run?* ·
> *Does anyone know how to merge all pensions into one?*

The precursor problem: you cannot plan what you cannot see. The ABI figure of
£19bn in lost pensions circulates in these threads. People are pushed to the
gov.uk tracing service, or to PensionBee and similar, and find the process
clunky. One asker compares it unfavourably to Australia, where it is a single
lookup.

The dashboard fixes this, in 2027/28.

---

### H. Access age, the bridge, and withdrawal sequencing — **High** (dominant in FIREUK)

> *Does the pension access age increase from 55 to 57 affect already existing
> pensions?* · *What's best SIPP or ISA as bridge to existing pension?* ·
> *Should I prioritise my ISA or pension for retirement?* · *How to safely
> bridge to pension* (FIREUK) · *What are the best recommendations to ensure
> retirement at 55?* · *Age 57: ISA bridge or pension top-up for early
> retirement?* (MSE)

The mature framing that emerges is explicitly multi-source and time-phased:

> "you need three years living costs in your ISA to take you to 58, ten years
> full living costs in your pension to take you to 68, and then enough left to
> top up your state pension from 68 onwards"

Underneath this sits the single most common *comparative* question in the whole
corpus: **retire at 55 vs 57 vs 60 vs 67 — what does each cost me?** Nobody can
answer it without re-running a calculation and remembering the old numbers.

---

### I. The state pension — **High**

> *Why does my State Pension forecast say I only need 30 years instead of 35?* ·
> *State pension online forecast tool has left me confused* · *State Pension
> forecast confusion* · *Deciphering the State Pension Forecast* · *Is my state
> pension forecast wrong?* · *Filling NI gaps for state pension — how much is
> worth it?*

MSE gave this its own subcategory with 753 discussions, which is the clearest
institutional signal of volume in the research. Two distinct problems: the
forecast is genuinely hard to read (contracting out, SERPS, the 2016
transition), and NI top-ups are a real decision with real money attached.

Relevant to you because **the state pension is ~£12k of a typical retirement
income and your planner excludes it.** Nearly every forum answer to "how much do
I need" pivots on it within two replies.

---

### J. "I don't understand pensions at all" — **High**

> *I don't understand pensions at all.* · *I Don't understand pensions — if it's
> taxed when you withdraw it, where is the advantage?* · *Where to learn about
> pensions, and how much to contribute* · *Help a daft person understand his
> pension priorities* · *Trying to make sense of my long term finances &
> pensions*

Genuine first-principles confusion, including about why a pension beats an ISA
at all. This is the floor beneath everything above.

---

### K. Fees and fund choice — **High, but a different job**

> *Pension charges — what are you paying?* · *Help I think my work pension fees
> are really high.* · *Is the default pension fund always a safe / bad choice?* ·
> *Workplace Pension — Stick with default?* · *Pension fund choices — struggling
> to make sense of it all*

High volume, but this is investment selection, not planning. Worth noting only
because your planner deliberately excludes fees and tells users to lower the
growth rate instead — and 0.3–0.8% off a 6% growth assumption is a material
change to every number on the screen.

---

### L. Rule changes and the anxiety they generate — **Moderate, spiky**

IHT on pensions from April 2027, the salary sacrifice cap, access age rising to
57, LTA replaced by the Lump Sum Allowance.

> *Pension inheritance tax 2027 changes* · *Understanding new inheritance tax on
> pensions* · *Your UK pension is no longer safe from inheritance tax: what
> should you do?* (FIREUK) · *Private pension vs government keeps raising
> withdrawal age*

These spike around Budgets and produce a characteristic question: "should I
change my plan?" — which is, again, a scenario-comparison need.

---

### Frequency summary

| Band | Categories |
|---|---|
| **Very high** | Am I on track (A) · Forecast legibility and today's money (B) · Pot→income and sustainability (C) · Tax-free cash and crystallisation (D) · Salary sacrifice and match (E) · Tax on withdrawals (F) |
| **High** | Finding and consolidating pots (G) · Access age, bridge, sequencing (H) · State pension (I) · Pension basics (J) · Fees and funds (K) |
| **Moderate / spiky** | Rule changes (L) |

---

## 4. Synthesis: seven findings

**1. The scarce good is translation, not projection.**
Most people already have a number. Providers send one every year. What they
cannot do is turn it into a judgement. Every high-frequency category is a
translation step: pot → income, future £ → today's £, gross → net, "£500k" →
"is that enough". A tool that produces another projection adds nothing. A tool
that translates is the whole opportunity.

**2. Nominal versus real is the single largest comprehension failure.**
It appears in more threads than any other confusion, it runs in both directions,
and it is caused by the industry itself — statements and calculators use
different bases and rarely label them. Your basis toggle is not a nice detail.
It is the most defensible thing in the product, and it should lead the pitch.

**3. Everyone arrives believing in 4%, and it is applied with no reference to
their own assumptions.** The sustainable rate is genuinely better and genuinely
harder to sell. It has to be introduced as an answer to "why isn't it just 4%",
not as a replacement that assumes the reader never heard of 4%.

**4. Crystallisation is where real money is lost to misunderstanding.**
The specific error — expecting 25% of post-crystallisation growth — is repeated
constantly and is irreversible when acted on. Your two-bucket model addresses
the highest-stakes misconception in the category.

**5. Nobody's retirement is one pot, and nobody's income question is gross.**
The accepted forum answer always assembles multiple DC pots, sometimes a DB
pension, the state pension, an ISA bridge, and a tax calculation. A single-pot,
pre-tax, state-pension-free projection answers a question that only exists
inside the tool. This is the biggest gap between your planner and the discourse.

**6. Two populations, two products.**
Accumulators on Reddit (25–45) ask "am I on track, what do I set my contribution
to". Decumulators on MSE and Lemon Fool (50–67) ask "what order do I draw, what
tax, annuity or drawdown". Your six steps currently lean decumulation, but the
larger and faster-growing audience is accumulation, and its central question —
work backwards from a target income to a contribution — the planner does not
answer at all.

**7. The comparative question is unmet everywhere.**
"Retire at 57 or 60?" "Sacrifice 10% or 15%?" "Take the lump sum or not?" Every
tool, including yours, models one future at a time. Your own TODO already names
this as "the single biggest addition here." The research agrees.

---

## 5. Verdict on the original two hypotheses

> **H1. "It's currently not easy to understand how much my pension will be worth
> on an annual / monthly basis when I retire."**

**Directionally right, imprecisely framed.** The pot value is usually available.
What is not available is (a) whether that figure is real or nominal, (b) what
sustainable monthly income it converts to, (c) what that is after tax, and (d)
how the state pension sits alongside it. Framed as "how much will my pension be
worth", the problem is half-solved by every provider statement. Framed as "what
will I actually be able to spend each month, and is that enough", it is wide
open.

> **H2. "...or how much I need to contribute in order to achieve a certain
> income."**

**Validated, and the more underserved of the two.** It recurs constantly, and
the community itself treats the tooling as something to hunt for:

> "You can find 'reverse pension' calculators, where you say what your target is
> and assumed interest rates and it will say what your contributions need to be."

Two refinements. First, the unit is wrong: people pull the lever as a
**percentage of salary via salary sacrifice**, and judge it by **the effect on
take-home pay**, not as an abstract annual contribution. Second, the target
income is net and includes the state pension. A reverse calculator that outputs
a gross annual figure into a single pot answers a different question from the
one being asked.

**Your current planner does not do H2 at all.** It projects forward from
contributions to an outcome. Nothing goes the other way.

---

## 6. A revised set of problem statements

Ranked by the combination of how often the underlying question appears and how
badly it is currently served. Each carries the evidence it rests on.

**P1 — Basis blindness.**
*"I have a pension forecast, but I can't tell whether it's in today's money or
future money, so I can't tell whether it's good or bad."*
The most common comprehension failure in the corpus, running in both directions,
caused by the industry's own inconsistent labelling. → You solve this already.
Lead with it.

**P2 — Pot to spendable income.**
*"I can't turn a pot into the monthly income I'd actually receive — sustainably,
after tax, and alongside my state pension."*
Every "how much a month" question is asked net and whole-picture; every tool
answers gross and single-pot. → Partly solved. The tax and state pension layers
are missing.

**P3 — Working backwards to the lever.**
*"I know roughly what income I want. I can't work back to what I'd have to
contribute — as a percentage of salary, and as a cost to my take-home pay."*
Frequently asked, explicitly hunted for, and not implemented in your planner.
→ Not solved. The clearest build opportunity.

**P4 — Sustainability without a folk number.**
*"I've been told 4% is safe. Nobody can tell me whether that's true for my
growth and inflation assumptions, or what happens if it isn't."*
The 4% rule is applied universally and invariantly. → You solve this better than
anyone, and currently say so too quietly.

**P5 — What taking the 25% actually does.**
*"I don't understand what taking my tax-free cash does to the rest of the pot,
or when I should take it."*
Highest-stakes misconception in UK DC pensions, repeated constantly, irreversible
when acted on. → Your two-bucket model solves it. Say so explicitly.

**P6 — Timing comparison.**
*"I can't see what retiring at 57 versus 60 versus 67 costs me, or how I'd fund
the years before I can touch the pension."*
The most common comparative question; no consumer tool holds two futures side by
side. → Not solved. Already top of your TODO.

**P7 — The whole picture.**
*"My retirement income comes from several old pots, maybe a DB scheme, the state
pension and an ISA. Nothing lets me see them as one plan."*
The accepted forum answer is always multi-source. → Not solved, and largely
gated on the dashboard (2027/28). Consider explicitly declining this and
supporting a manual sum instead.

**P8 — Trust through visible assumptions.**
*"I don't believe the numbers because I can't see what's behind them."*
Active, vocal distrust of provider calculators. → Your README's assumptions
section is a genuine asset. Surface it in the product, not just the repo.

---

## 7. What this implies for the planner

Ordered by the gap between research signal and current implementation.

1. **Add income tax on drawdown.** The largest single gap. Every "per month"
   question in the corpus is net; the planner outputs gross. Marginal rate plus
   personal allowance would close most of it. Emergency tax on first withdrawal
   is a well-known shock worth at least a note.

2. **Add the state pension as a toggleable layer with a start age.** Roughly
   £12k that every forum answer includes within two replies. Excluding it makes
   the headline income figure wrong in the direction of alarming.

3. **Build the reverse calculation (P3).** Target income → required contribution,
   expressed as a percentage of salary and a cost to take-home. This is a
   distinct mode, not a tweak, and it is the half of your original hypothesis
   the tool does not address.

4. **Scenario comparison (P6).** Already in the TODO; the research raises it
   from "nice" to "the most-asked comparative question in the category".

5. **Frame the sustainable rate against 4%.** Users arrive believing 4%. The
   copy needs to answer "why isn't it just 4%" rather than presenting `r*` as
   if the reader has no prior.

6. **Allow multiple pots on step 01.** Not an aggregator — just let someone add
   three figures together in the tool instead of on paper.

7. **Resolve the verdict chip (existing TODO).** "Lasts beyond 90" is both
   always-true and the answer to a question nobody asked. The honest
   real-terms statement is what the research says people want.

8. **Consider making fees an input.** The planner tells users to lower growth to
   account for 0.3–0.8% of charges. Fee anxiety is a high-frequency category in
   its own right, and asking people to do the adjustment mentally is the kind of
   hidden step that produces the distrust in P8.

---

## Sources

Communities and forums
- [r/UKPersonalFinance](https://www.reddit.com/r/UKPersonalFinance/) · [r/PensionsUK](https://www.reddit.com/r/PensionsUK/) · [r/FIREUK](https://www.reddit.com/r/FIREUK/) · [r/HENRYUK](https://www.reddit.com/r/HENRYUK/) · [r/LeanFireUK](https://www.reddit.com/r/LeanFireUK/)
- [MoneySavingExpert — Pensions, Annuities & Retirement Planning](https://forums.moneysavingexpert.com/categories/pensions-annuities-retirement-planning)
- [The Lemon Fool](https://www.lemonfool.co.uk/)
- [UKPersonalFinance wiki — Pensions](https://ukpersonal.finance/pensions/)
- Subreddit sizes via [GummySearch](https://gummysearch.com/r/UKPersonalFinance/)
- [List of UK personal finance subreddits](https://thinkofthe.money/uk-personal-finance-independence-money-subreddits/)

Research and regulation
- [FCA Financial Lives 2024 — Pensions findings](https://www.fca.org.uk/publication/financial-lives/fls-2024-pensions.pdf) and [key findings](https://www.fca.org.uk/publication/financial-lives/financial-lives-survey-2024-key-findings.pdf)
- [FCA Advice Guidance Boundary Review](https://www.fca.org.uk/firms/advice-guidance-boundary-review) · [PS25/22 targeted support rules](https://www.fca.org.uk/publications/policy-statements/ps25-22-consumer-pensions-investment-decisions-rules-targeted-support)
- [Scottish Widows — risk of retirement poverty](https://www.scottishwidows.co.uk/about-us/media-centre/press-releases/million-at-risk-of-retirement-poverty.html)
- [PLSA Retirement Living Standards 2025 (Loughborough)](https://www.lboro.ac.uk/news-events/news/2025/june/cost-of-retiring-falls-calculated-loughborough/)
- [Pensions Dashboards Programme — connection deadline](https://www.pensionsdashboardsprogramme.org.uk/connection/deadline)
- [Pension IHT changes from April 2027](https://www.royallondon.com/guides-tools/planning-ahead/estate-planning/changes-to-inheritance-tax-on-pensions-from-2027/)
