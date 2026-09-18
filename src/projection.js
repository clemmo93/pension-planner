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

  let pot = s.currentPot;
  let contribution = s.annualContrib;
  let contributedTotal = 0;
  let contributedTotalToday = 0;
  let taxFreeTotal = 0;
  let taxFreePerYear = 0;
  let taxFreeTaken = 0;
  let taxFreeStarted = false;

  for (let age = s.currentAge; age <= END_AGE; age++) {
    const drawing = age >= start;
    const phase = byAge[age] || { rate: fallbackRate, index: s.phases.length - 1 };
    const deflator = Math.pow(1 + s.inflation / 100, age - s.currentAge);

    // Contributions run until the pot is first touched.
    if (age > s.currentAge && age < start) {
      pot += contribution;
      contributedTotal += contribution;
      // Each year's payment discounted by that year's deflator, so the running
      // total is what everything paid in so far is worth in today's money.
      contributedTotalToday += contribution / deflator;
      contribution *= 1 + s.contribGrowth / 100;
    }

    if (age > s.currentAge) pot *= 1 + s.growth / 100;

    // Entitlement is fixed against the pot in the year crystallisation begins.
    if (age === s.taxFreeTakeAge && !taxFreeStarted) {
      taxFreePerYear = Math.min(pot * (s.taxFreePct / 100), TAX_FREE_CAP) / s.taxFreeYears;
      taxFreeStarted = true;
    }

    let taxFreeThisYear = 0;
    const inTaxFreeWindow = age >= s.taxFreeTakeAge && age < s.taxFreeTakeAge + s.taxFreeYears;
    if (inTaxFreeWindow && taxFreeStarted && taxFreeTaken < s.taxFreeYears) {
      taxFreeThisYear = Math.min(taxFreePerYear, pot);
      pot -= taxFreeThisYear;
      taxFreeTotal += taxFreeThisYear;
      taxFreeTaken++;
    }

    // Tax-free cash comes out first; the withdrawal rate applies to what is left.
    let drawn = 0;
    if (drawing && pot > 0) {
      drawn = pot * (phase.rate / 100);
      pot -= drawn;
    }

    years.push({
      age,
      pot: Math.max(pot, 0),
      potToday: Math.max(pot / deflator, 0),
      drawing,
      phaseIndex: drawing ? phase.index : -1,
      rate: drawing ? phase.rate : 0,
      annual: drawn,
      annualToday: drawn / deflator,
      monthly: drawn / 12,
      monthlyToday: drawn / 12 / deflator,
      taxFree: taxFreeThisYear,
      taxFreeToday: taxFreeThisYear / deflator,
      paidIn: contributedTotal,
      paidInToday: contributedTotalToday,
      contributionThisYear: age > s.currentAge && age < start ? contribution / (1 + s.contribGrowth / 100) : 0,
      contributionToday: age > s.currentAge && age < start
        ? contribution / (1 + s.contribGrowth / 100) / deflator
        : 0,
      deflator,
    });

    if (pot <= 0 && drawing) {
      for (let a = age + 1; a <= END_AGE; a++) {
        years.push({
          age: a, pot: 0, potToday: 0, drawing: true, phaseIndex: -1, rate: 0,
          annual: 0, annualToday: 0, monthly: 0, monthlyToday: 0,
          taxFree: 0, taxFreeToday: 0,
          paidIn: contributedTotal, paidInToday: contributedTotalToday,
          contributionThisYear: 0, contributionToday: 0,
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
    taxFreeTotal,
    contributedTotal,
    depleted,
    firstIncome,
    atRetirement,
    incomeStart: start,
  };
}
