// Pure projection maths, kept free of React so it can be reasoned about and tested
// on its own. Every figure the UI shows comes from here.

export const TAX_FREE_CAP = 268275;
export const ANNUAL_ALLOWANCE = 60000;
export const END_AGE = 90;

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

export function project(s) {
  const years = [];
  const contributions = [];
  const start = incomeStartAge(s);
  const ufpls = s.taxFreeMode === "ufpls";

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
    if (age > s.currentAge && age <= start) {
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
    const pct = s.taxFreePct / 100;
    const lsaLeft = TAX_FREE_CAP - taxFreeTotal;
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
        const freeNow = Math.min(drawn * pct, TAX_FREE_CAP - taxFreeTotal);
        taxFreeThisYear = Math.max(freeNow, 0);
        taxFreeTotal += taxFreeThisYear;
        taxable = drawn - taxFreeThisYear;
      } else {
        taxable = drawn;
      }
      const fromCrystallised = Math.min(drawn, crystallised);
      crystallised -= fromCrystallised;
      uncrystallised = Math.max(uncrystallised - (drawn - fromCrystallised), 0);
    }

    const pot = uncrystallised + crystallised;

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
          deflator: Math.pow(1 + s.inflation / 100, a - s.currentAge),
        });
      }
      break;
    }
  }

  // Derived from what was actually paid, never from the requested settings, so
  // a label can never claim a tranche the projection did not produce.
  const taxFreePayments = years.filter((y) => y.taxFree > 0);
  // A pot drawn at a percentage of whatever is left decays geometrically: it
  // approaches zero without reaching it, so `pot <= 0` never fires however hard
  // the plan is pushed. Drawing 15% a year leaves £1,257 at 90 and the old test
  // called that "comfortably sustainable".
  //
  // What actually fails is the pot becoming too small to live on. The test is
  // against the first year's income, which scales with the plan rather than
  // hard-coding a figure, and in today's money, because the nominal pot keeps
  // climbing for years after the real one has collapsed.
  const paying = years.filter((y) => y.withdrawal > 0);
  const openingIncome = paying.length ? paying[0].withdrawalToday : 0;
  const depleted = openingIncome > 0
    ? years.find((y) => y.drawing && y.potToday < openingIncome) || null
    : null;
  const firstIncome = years.find((y) => y.withdrawal > 0) || null;
  const atRetirement = years.find((y) => y.age === start) || null;

  return {
    years,
    contributions,
    taxFreeTotal,
    taxFreePayments,
    contributedTotal,
    contributedTotalToday,
    depleted,
    firstIncome,
    atRetirement,
    incomeStart: start,
  };
}
