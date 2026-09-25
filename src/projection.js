// Pure projection maths, kept free of React so it can be reasoned about and tested
// on its own. Every figure the UI shows comes from here.

export const TAX_FREE_CAP = 268275;
/* A quarter of whatever you crystallise. Not a choice: taking less than this
   from a crystallisation forfeits the difference — the rest of that slice is
   taxable in full — so the decision people actually make is how much to
   crystallise, not what share of it to take. UFPLS is fixed at this rate by
   law and cannot be varied at all. */
export const TAX_FREE_RATE = 0.25;
// Full new State Pension, 2026/27. Held as the weekly figure because that is
// how it is legislated and uprated; the annual figure is derived.
export const STATE_PENSION_WEEKLY = 241.30;
export const STATE_PENSION_ANNUAL = STATE_PENSION_WEEKLY * 52;
export const ANNUAL_ALLOWANCE = 60000;
export const END_AGE = 90;

/**
 * The age this person reaches State Pension age, from the statutory timetable.
 *
 * 66 today, 67 for anyone born from 6 April 1960, and 68 for anyone born from
 * 6 April 1977. The planner only knows a whole-number age, so this works off
 * the birth year and will be a year out for people born either side of early
 * April — close enough for a projection, and the age is adjustable anyway.
 *
 * Derived rather than defaulted to a constant: the planner's own default user
 * is 30, and would reach State Pension age at 68, not the 67 that a fixed
 * default would have given them.
 */
export function statePensionAge(currentAge, thisYear = new Date().getFullYear()) {
  const birthYear = thisYear - currentAge;
  if (birthYear >= 1977) return 68;
  if (birthYear >= 1960) return 67;
  return 66;
}

/** What the plan says State Pension age is — the user's override, or derived. */
export function resolvedStatePensionAge(s) {
  return s.statePensionAge ?? statePensionAge(s.currentAge);
}

/**
 * The age at which drawdown income can actually begin.
 *
 * Income needs both gates open: you have reached your chosen drawdown age, and
 * you have reached the age at which the pot is crystallised for tax-free cash.
 * Deriving it once, up front, is what stops the first year of drawdown being
 * skipped when those two ages happen to coincide.
 */
export function incomeStartAge(s) {
  // Taking 25% of each payment needs no separate crystallisation event, so
  // there is no tax-free age to wait for — income starts when you say it does.
  if (s.taxFreeMode === "ufpls") return s.drawdownAge;
  return Math.max(s.drawdownAge, s.taxFreeTakeAge);
}

/**
 * The age contributions stop: the first time you take anything out.
 *
 * Not when regular income begins — when you first ACCESS the pension. In lump
 * mode the tax-free cash can be taken years before income starts, and paying in
 * through that gap both overstates the pot and, because each phased
 * crystallisation is a share of a pot still being topped up, makes the tax-free
 * slices climb faster than growth alone. Taking money out is the point you have
 * stopped building, so that is where contributions end. Recycling tax-free cash
 * back into contributions is against HMRC rules anyway.
 *
 * UFPLS has no separate tax-free event, so access is simply income starting.
 */
export function firstAccessAge(s) {
  const income = incomeStartAge(s);
  if (s.taxFreeMode === "ufpls") return income;
  return Math.min(income, s.taxFreeTakeAge);
}

/** Age ranges each drawdown phase covers, anchored to when income really starts. */
export function phaseSpans(s) {
  const out = [];
  let from = incomeStartAge(s);
  s.phases.forEach((p, i) => {
    const isLast = i === s.phases.length - 1;
    const to = isLast ? END_AGE : Math.min(from + p.years, END_AGE);
    out.push({ ...p, from, to, isLast, index: i });
    from = to;
  });
  return out;
}

/**
 * The withdrawal rate at which the pot holds its value in today's money.
 *
 * Each year the pot grows then gives up a share of itself: pot(1+g)(1-r).
 * That is level in real terms when it equals (1+i), so r* = (g - i)/(1 + g).
 * It depends only on growth and inflation — not on the size of the pot, the
 * age, or which phase you are in — so one number describes a whole plan.
 *
 * Zero or negative when growth does not beat inflation: no rate preserves the
 * pot, and callers have to say so rather than print a nonsense figure.
 */
export function sustainableRate(s) {
  return (s.growth - s.inflation) / (1 + s.growth / 100);
}

/**
 * The starting contribution needed to hit a target income.
 *
 * The forward model runs contributions to an outcome; this runs it the other
 * way — the half of the product hypothesis the planner never answered, and the
 * single most-requested "reverse pension calculator" in the research.
 *
 * The target is the income the POT pays in the first drawdown year, in today's
 * money. That is the honest thing to solve for: it is the "early, active
 * retirement" figure the user actually reasons about, and it lands before the
 * State Pension starts, so the pot has to supply all of it. The later phases
 * then carry the decline on their own rates, and the State Pension stacks on
 * when it arrives — none of which the target has to describe.
 *
 * First-year drawdown is monotonic in the contribution — more paid in means a
 * bigger pot means a bigger first withdrawal — so a bisection is exact and
 * cannot get stuck. Everything else is held fixed; only annualContrib moves.
 *
 * Returns a status alongside the figure because three answers are all real:
 *   ok       — solved; `contrib` hits the target.
 *   already  — the current pot alone already meets or beats it; `contrib` is 0.
 *   capped   — even the annual allowance falls short; `contrib` is that ceiling
 *              and `achieved` is as far as it gets.
 */
export function solveContribution(s, targetTodayAnnual) {
  if (!(targetTodayAnnual > 0)) return { contrib: 0, status: "zero", achieved: 0 };

  const firstDraw = (contrib) => {
    const P = project({ ...s, annualContrib: contrib });
    return P.firstIncome ? P.firstIncome.withdrawalToday : 0;
  };

  // The existing pot may already deliver the target with nothing added.
  const atZero = firstDraw(0);
  if (atZero >= targetTodayAnnual) return { contrib: 0, status: "already", achieved: atZero };

  // Nothing above the annual allowance can be paid in with tax relief, so the
  // search never looks past it — and if the ceiling still falls short, say so
  // rather than returning a figure no one is allowed to pay.
  const hi0 = ANNUAL_ALLOWANCE;
  const atHi = firstDraw(hi0);
  if (atHi < targetTodayAnnual) return { contrib: hi0, status: "capped", achieved: atHi };

  let lo = 0, hi = hi0;
  // 44 halvings of a £60,000 range settle well inside a penny.
  for (let i = 0; i < 44; i++) {
    const mid = (lo + hi) / 2;
    if (firstDraw(mid) < targetTodayAnnual) lo = mid;
    else hi = mid;
  }
  return { contrib: (lo + hi) / 2, status: "ok", achieved: targetTodayAnnual };
}

export function project(s) {
  const years = [];
  const contributions = [];
  const start = incomeStartAge(s);
  // Contributions stop at first access, which in a phased-lump plan can be
  // years before income starts. Kept separate from `start` so drawing and the
  // phase spans still anchor to when income really begins.
  const contribEnd = firstAccessAge(s);
  const ufpls = s.taxFreeMode === "ufpls";

  // The State Pension sits outside the pot entirely — it is not drawn from it
  // and does not affect it. Held flat in today's money: the triple lock raises
  // it by at least inflation, so treating it as level in real terms is the
  // conservative reading and needs no extra assumption.
  const spOn = s.statePension !== false;
  const spStart = resolvedStatePensionAge(s);

  // Map each age to the phase governing it, so the rate lookup is a plain read.
  const byAge = {};
  let cursor = start;
  s.phases.forEach((phase, i) => {
    const isLast = i === s.phases.length - 1;
    const end = isLast ? Infinity : cursor + phase.years;
    for (let a = cursor; a < end && a <= END_AGE; a++) byAge[a] = { rate: phase.rate, index: i };
    cursor = end;
  });
  const fallbackRate = s.phases.length ? s.phases[s.phases.length - 1].rate : 4;

  // The pot is held as two buckets, because tax-free cash is not a pool you
  // draw down — it is a quarter of whatever you CRYSTALLISE. Money you have not
  // crystallised yet keeps growing, so a slice crystallised in year five
  // releases more tax-free cash than the same fraction would have in year one.
  // Freezing the entitlement against the pot on day one misses that entirely.
  let uncrystallised = s.currentPot;
  let crystallised = 0;
  let contribution = s.annualContrib;
  let contributedTotal = 0;
  let contributedTotalToday = 0;
  let taxFreeTotal = 0;
  let taxFreeTotalToday = 0;
  let taxFreeTaken = 0;

  for (let age = s.currentAge; age <= END_AGE; age++) {
    const drawing = age >= start;
    const phase = byAge[age] || { rate: fallbackRate, index: s.phases.length - 1 };
    const deflator = Math.pow(1 + s.inflation / 100, age - s.currentAge);

    // A contribution is paid across the year, so the money landing in the pot
    // at this age was paid when you were a year younger — the very first one is
    // paid at your current age, today. Attributing and discounting it at the age
    // it was actually paid is what makes £10,000 paid now worth £10,000 in
    // today's money, and gives one payment for each working year.
    if (age > s.currentAge && age <= contribEnd) {
      const paidAtAge = age - 1;
      const paidDeflator = Math.pow(1 + s.inflation / 100, paidAtAge - s.currentAge);
      uncrystallised += contribution;
      contributedTotal += contribution;
      contributedTotalToday += contribution / paidDeflator;
      contributions.push({
        age: paidAtAge,
        amount: contribution,
        amountToday: contribution / paidDeflator,
      });
      contribution *= 1 + s.contribGrowth / 100;
    }

    if (age > s.currentAge) {
      const g = 1 + s.growth / 100;
      uncrystallised *= g;
      crystallised *= g;
    }

    // The pot at its fullest this year: everything paid in and grown, before a
    // penny is taken out. This is what "your pot at retirement" means — taking
    // the year's tax-free cash and first withdrawal off it first understates
    // what you actually built.
    const potGross = uncrystallised + crystallised;

    // Crystallise this year's slice and take its tax-free share. The slice is
    // an even portion of what is STILL uncrystallised, so it grows year on year
    // while you phase. The lump sum allowance is a lifetime ceiling, so once it
    // is used up there is nothing to gain by crystallising further.
    let taxFreeThisYear = 0;
    const pct = TAX_FREE_RATE;
    /* The allowance is a single lifetime figure, so how much is left depends on
       whether it holds its value. Frozen in cash, it withers: £268,275 is worth
       a fraction of that by the time most people reach it. Uprated, the ceiling
       is a real quantity, so what has been used has to be counted in today's
       money too — nominal sums from different years cannot be added against a
       real cap. */
    const lsaLeftNow = () => (s.taxFreeCapUprated
      ? Math.max(0, (TAX_FREE_CAP - taxFreeTotalToday) * deflator)
      : Math.max(0, TAX_FREE_CAP - taxFreeTotal));
    const lsaLeft = lsaLeftNow();
    const inTaxFreeWindow = !ufpls && age >= s.taxFreeTakeAge && age < s.taxFreeTakeAge + s.taxFreeYears;
    if (inTaxFreeWindow && taxFreeTaken < s.taxFreeYears && pct > 0 && lsaLeft > 0.01 && uncrystallised > 0) {
      const yearsLeft = s.taxFreeYears - taxFreeTaken;
      // Only crystallise what the REMAINING allowance can pay tax-free cash on.
      // Splitting the whole pot instead makes every slice oversized once the pot
      // is past 4x the cap: the allowance is exhausted early, the later years of
      // the schedule pay nothing, and the excess has been shifted into the
      // taxable bucket for no benefit. Below the cap this is the whole pot, so
      // phasing still picks up the growth on what has not been crystallised yet.
      const worthCrystallising = Math.min(uncrystallised, lsaLeft / pct);
      let slice = worthCrystallising / yearsLeft;
      let cash = slice * pct;
      if (cash > lsaLeft) {
        cash = lsaLeft;
        slice = cash / pct;
      }
      slice = Math.min(slice, uncrystallised);
      uncrystallised -= slice;
      crystallised += slice - cash;
      taxFreeThisYear = cash;
      taxFreeTotal += cash;
      taxFreeTotalToday += cash / deflator;
      taxFreeTaken++;
    }

    // Income comes out of crystallised funds first — that is what they are for,
    // and it leaves the uncrystallised part intact to keep growing behind any
    // remaining tax-free slices.
    let drawn = 0;
    let taxable = 0;
    const available = uncrystallised + crystallised;
    if (drawing && available > 0) {
      drawn = available * (phase.rate / 100);
      if (ufpls) {
        // Every payment is part tax free, part taxable, until the lifetime
        // allowance for tax-free cash runs out. Nothing is set aside up front.
        const freeNow = Math.min(drawn * pct, lsaLeftNow());
        taxFreeThisYear = Math.max(freeNow, 0);
        taxFreeTotal += taxFreeThisYear;
        taxFreeTotalToday += taxFreeThisYear / deflator;
        taxable = drawn - taxFreeThisYear;
      } else {
        taxable = drawn;
      }
      const fromCrystallised = Math.min(drawn, crystallised);
      crystallised -= fromCrystallised;
      uncrystallised = Math.max(uncrystallised - (drawn - fromCrystallised), 0);
    }

    const pot = uncrystallised + crystallised;

    const spToday = spOn && age >= spStart ? STATE_PENSION_ANNUAL : 0;
    const spCash = spToday * deflator;
    // Income means all of it. `annual` is the taxable drawdown and `withdrawal`
    // everything the drawdown takes out; the State Pension is taxable too and
    // arrives every month, so it belongs in both. A one-off tax-free lump sum
    // does not — it has its own column and would swamp a monthly figure.
    const incomeAnnual = taxable + spCash;
    const incomeMonthly = (drawn + spCash) / 12;

    years.push({
      age,
      pot: Math.max(pot, 0),
      potToday: Math.max(pot / deflator, 0),
      potGross: Math.max(potGross, 0),
      potGrossToday: Math.max(potGross / deflator, 0),
      drawing,
      phaseIndex: drawing ? phase.index : -1,
      rate: drawing ? phase.rate : 0,
      // `annual` is the TAXABLE money received; `withdrawal` is everything the
      // drawdown takes out. They are the same under a lump sum, because the
      // tax-free cash was taken separately. Under UFPLS they differ.
      annual: taxable,
      annualToday: taxable / deflator,
      withdrawal: drawn,
      withdrawalToday: drawn / deflator,
      monthly: drawn / 12,
      monthlyToday: drawn / 12 / deflator,
      taxFree: taxFreeThisYear,
      taxFreeToday: taxFreeThisYear / deflator,
      statePension: spCash,
      statePensionToday: spToday,
      incomeAnnual,
      incomeAnnualToday: incomeAnnual / deflator,
      incomeMonthly,
      incomeMonthlyToday: incomeMonthly / deflator,
      uncrystallised: Math.max(uncrystallised, 0),
      crystallised: Math.max(crystallised, 0),
      paidIn: contributedTotal,
      paidInToday: contributedTotalToday,
      deflator,
    });

    if (pot <= 0 && drawing) {
      for (let a = age + 1; a <= END_AGE; a++) {
        years.push({
          age: a, pot: 0, potToday: 0, potGross: 0, potGrossToday: 0,
          drawing: true, phaseIndex: -1, rate: 0,
          annual: 0, annualToday: 0, withdrawal: 0, withdrawalToday: 0,
          monthly: 0, monthlyToday: 0,
          taxFree: 0, taxFreeToday: 0, uncrystallised: 0, crystallised: 0,
          paidIn: contributedTotal, paidInToday: contributedTotalToday,
          // An empty pot does not stop the State Pension.
          statePension: (spOn && a >= spStart ? STATE_PENSION_ANNUAL : 0)
            * Math.pow(1 + s.inflation / 100, a - s.currentAge),
          statePensionToday: spOn && a >= spStart ? STATE_PENSION_ANNUAL : 0,
          incomeAnnual: (spOn && a >= spStart ? STATE_PENSION_ANNUAL : 0)
            * Math.pow(1 + s.inflation / 100, a - s.currentAge),
          incomeAnnualToday: spOn && a >= spStart ? STATE_PENSION_ANNUAL : 0,
          incomeMonthly: (spOn && a >= spStart ? STATE_PENSION_ANNUAL : 0)
            * Math.pow(1 + s.inflation / 100, a - s.currentAge) / 12,
          incomeMonthlyToday: spOn && a >= spStart ? STATE_PENSION_ANNUAL / 12 : 0,
          deflator: Math.pow(1 + s.inflation / 100, a - s.currentAge),
        });
      }
      break;
    }
  }

  // Derived from what was actually paid, never from the requested settings, so
  // a label can never claim a tranche the projection did not produce.
  const taxFreePayments = years.filter((y) => y.taxFree > 0);
  const firstIncome = years.find((y) => y.withdrawal > 0) || null;
  const atRetirement = years.find((y) => y.age === start) || null;

  return {
    years,
    contributions,
    taxFreeTotal,
    taxFreeTotalToday,
    taxFreePayments,
    contributedTotal,
    contributedTotalToday,
    firstIncome,
    atRetirement,
    incomeStart: start,
    sustainableRate: sustainableRate(s),
    statePensionOn: spOn,
    statePensionStart: spStart,
    statePensionAnnual: STATE_PENSION_ANNUAL,
  };
}
