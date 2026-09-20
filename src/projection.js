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
    const inTaxFreeWindow = age >= s.taxFreeTakeAge && age < s.taxFreeTakeAge + s.taxFreeYears;
    if (inTaxFreeWindow && taxFreeTaken < s.taxFreeYears && pct > 0 && lsaLeft > 0.01 && uncrystallised > 0) {
      const yearsLeft = s.taxFreeYears - taxFreeTaken;
      let slice = uncrystallised / yearsLeft;
      let cash = slice * pct;
      // Capped: crystallise only as much as the remaining allowance can pay out
      // on, and leave the rest uncrystallised.
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
    const available = uncrystallised + crystallised;
    if (drawing && available > 0) {
      drawn = available * (phase.rate / 100);
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
      annual: drawn,
      annualToday: drawn / deflator,
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
          annual: 0, annualToday: 0, monthly: 0, monthlyToday: 0,
          taxFree: 0, taxFreeToday: 0, uncrystallised: 0, crystallised: 0,
          paidIn: contributedTotal, paidInToday: contributedTotalToday,
          deflator: Math.pow(1 + s.inflation / 100, a - s.currentAge),
        });
      }
      break;
    }
  }

  const depleted = years.find((y) => y.drawing && y.pot <= 0) || null;
  const firstIncome = years.find((y) => y.annual > 0) || null;
  const atRetirement = years.find((y) => y.age === start) || null;

  return {
    years,
    contributions,
    taxFreeTotal,
    contributedTotal,
    depleted,
    firstIncome,
    atRetirement,
    incomeStart: start,
  };
}
