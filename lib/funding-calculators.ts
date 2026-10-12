// Business funding calculators (§7.3): dilution, loan repayment + DSCR, grant cost share, runway.
// Pure functions, unit-tested. Inputs are clamped so empty fields never produce NaN.

const n = (v: number | null | undefined) => (Number.isFinite(v) ? Math.max(0, Number(v)) : 0);

/**
 * Priced round. The new option pool is carved out of the post-money (the common "pre-money pool" convention),
 * so existing holders are diluted by both the investor and the pool.
 */
export function dilution(input: { preMoney: number; investment: number; founderPct: number; newPoolPct: number }) {
  const pre = n(input.preMoney);
  const inv = n(input.investment);
  const post = pre + inv;
  const investorPct = post > 0 ? (inv / post) * 100 : 0;
  const poolPct = Math.min(n(input.newPoolPct), Math.max(0, 100 - investorPct));
  const existingAfterPct = Math.max(0, 100 - investorPct - poolPct);
  const founderAfterPct = (Math.min(100, n(input.founderPct)) / 100) * existingAfterPct;
  return { postMoney: post, investorPct, poolPct, founderAfterPct, founderValue: (founderAfterPct / 100) * post };
}

/** Amortizing term loan with monthly payments. */
export function loanRepayment(input: { principal: number; annualRatePct: number; years: number }) {
  const p = n(input.principal);
  const months = Math.round(n(input.years) * 12);
  const r = n(input.annualRatePct) / 100 / 12;
  if (!p || !months) return { monthly: 0, totalPaid: 0, totalInterest: 0, months };
  const monthly = r === 0 ? p / months : (p * r) / (1 - Math.pow(1 + r, -months));
  return { monthly, totalPaid: monthly * months, totalInterest: monthly * months - p, months };
}

/** Debt service coverage ratio. Lenders usually want 1.25× or better. */
export function dscr(input: { annualNetOperatingIncome: number; annualDebtService: number }) {
  const ds = n(input.annualDebtService);
  const ratio = ds > 0 ? input.annualNetOperatingIncome / ds : null;
  return { ratio, meetsTypical: ratio != null && ratio >= 1.25 };
}

/** What the program pays vs. what you must fund, with the program cap and any other government money for the same costs. */
export function grantCostShare(input: { projectCost: number; programPct: number; maxGrant?: number | null; otherGovernment?: number; stackingLimitPct?: number }) {
  const cost = n(input.projectCost);
  const pct = Math.min(100, n(input.programPct));
  const uncapped = (cost * pct) / 100;
  const grant = input.maxGrant != null && input.maxGrant > 0 ? Math.min(uncapped, input.maxGrant) : uncapped;
  const otherGov = n(input.otherGovernment);
  const limit = input.stackingLimitPct != null ? Math.min(100, n(input.stackingLimitPct)) : null;
  const govPct = cost > 0 ? ((grant + otherGov) / cost) * 100 : 0;
  return {
    grant,
    yourShare: Math.max(0, cost - grant - otherGov),
    capped: grant < uncapped,
    governmentPct: govPct,
    overStackingLimit: limit != null && govPct > limit,
  };
}

/** Months of cash left at the current net burn. */
export function runway(input: { cash: number; monthlyExpenses: number; monthlyRevenue?: number }, today = new Date()) {
  const burn = n(input.monthlyExpenses) - n(input.monthlyRevenue);
  if (burn <= 0) return { netBurn: burn, months: null as number | null, runsOutOn: null as Date | null, profitable: true };
  const months = n(input.cash) / burn;
  const runsOutOn = new Date(today.getTime() + months * 30.4375 * 864e5);
  return { netBurn: burn, months, runsOutOn, profitable: false };
}
