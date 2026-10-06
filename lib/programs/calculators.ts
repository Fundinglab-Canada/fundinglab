// Program-specific calculators for featured grant pages (§4G). Pure functions, unit-tested.

/** REDIP cost share: < $500K → 80% (max $400K); ≥ $500K → 60% (max $1M). */
export function redipShare(totalEligibleCost: number) {
  const cost = Math.max(0, totalEligibleCost || 0);
  const rate = cost < 500_000 ? 0.8 : 0.6;
  const cap = cost < 500_000 ? 400_000 : 1_000_000;
  const grant = Math.min(cost * rate, cap);
  return { rate, grant: Math.round(grant), applicant: Math.round(cost - grant), capped: cost * rate > cap };
}

/** RTRI liquidity: min(50% × monthly payroll × 12, $2M, proven cash need). */
export function rtriLiquidity(monthlyPayroll: number, provenCashNeed?: number | null) {
  const payroll = Math.max(0, monthlyPayroll || 0);
  const formula = payroll * 0.5 * 12;
  const caps = [formula, 2_000_000];
  if (provenCashNeed != null && provenCashNeed >= 0) caps.push(provenCashNeed);
  const support = Math.min(...caps);
  const limitedBy = support === 2_000_000 ? "cap" : provenCashNeed != null && support === provenCashNeed && support < formula ? "cash_need" : "payroll";
  return { monthly: Math.round(Math.min(payroll * 0.5, support / 12)), support: Math.round(support), limitedBy };
}

/** Monthly payroll at which the $2M liquidity cap is reached (~$333K). */
export const RTRI_LIQUIDITY_CAP_PAYROLL = 2_000_000 / 12 / 0.5;

/** RTRI pivot: non-repayable up to 50% (max $1M); repayable up to 75%. Min 10% non-government. */
export function rtriPivot(projectCost: number, kind: "non_repayable" | "repayable") {
  const cost = Math.max(0, projectCost || 0);
  const contribution = kind === "non_repayable" ? Math.min(cost * 0.5, 1_000_000) : Math.min(cost * 0.75, 20_000_000);
  return { contribution: Math.round(contribution), applicant: Math.round(cost - contribution), minPrivate: Math.round(cost * 0.1) };
}

/** RTRI repayable schedule: 0% interest, 12-month grace, then 60 equal monthly payments. */
export function rtriRepayment(amount: number) {
  const a = Math.max(0, amount || 0);
  return { graceMonths: 12, payments: 60, monthly: Math.round(a / 60) };
}
