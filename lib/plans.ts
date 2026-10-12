// Business plans (§11). Prices live in Stripe (STRIPE_PRICE_STARTER / _GROWTH / _PRO), never in code.
// The effective plan comes from fl_my_plan(): paid or comped plan, Growth while enrolled in a cohort, Pro for admins.

export const PLANS = [
  { id: "free", name: "Free", priceEnv: null, blurb: "Get started and see where you stand.",
    features: ["Readiness assessment", "Business profile", "Federal grant history lookup", "Basic funding roadmap", "Top 5 matched programs", "Capital stack planner"] },
  { id: "starter", name: "Starter", priceEnv: "STRIPE_PRICE_STARTER", blurb: "Find and apply for the right programs.",
    features: ["Everything in Free", "Full program matcher + deadline alerts", "Funding calculators", "Application Center", "Prep Studio templates (business plan, pitch outline, cap table)", "Lender-ready loan package"] },
  { id: "growth", name: "Growth", priceEnv: "STRIPE_PRICE_GROWTH", blurb: "Get investor- and lender-ready.",
    features: ["Everything in Starter", "Data room with expiring viewer links", "Watermarked previews and view analytics", "Up to 10 active data room viewers"] },
  { id: "pro", name: "Pro", priceEnv: "STRIPE_PRICE_PRO", blurb: "For active raises with many investors.",
    features: ["Everything in Growth", "Unlimited data room viewers", "Quarterly advisor call with the Funding Lab Team"] },
] as const;

export type PlanId = (typeof PLANS)[number]["id"];
export const planName = (id: string | null | undefined) => PLANS.find((p) => p.id === id)?.name ?? "Free";
const RANK: Record<PlanId, number> = { free: 0, starter: 1, growth: 2, pro: 3 };
export const isPlan = (v: unknown): v is PlanId => typeof v === "string" && v in RANK;

/** Minimum plan for each gated feature. Anything not listed is free. */
export const FEATURE_PLAN = {
  full_matcher: "starter",
  program_alerts: "starter",
  calculators: "starter",
  applications: "starter",
  prep_templates: "starter",
  loan_package: "starter",
  data_room: "growth",
} as const satisfies Record<string, PlanId>;
export type Feature = keyof typeof FEATURE_PLAN;

export function hasFeature(plan: string | null | undefined, feature: Feature): boolean {
  const p = isPlan(plan) ? plan : "free";
  return RANK[p] >= RANK[FEATURE_PLAN[feature]];
}

/** Programs shown on the Free plan before the "see all" upgrade prompt. */
export const FREE_PROGRAM_LIMIT = 5;

/** Active (unexpired, unrevoked) data room viewers allowed per plan. */
export function dataRoomViewerLimit(plan: string | null | undefined): number {
  if (plan === "pro") return Infinity;
  if (plan === "growth") return 10;
  return 0;
}

/** Maps a Stripe price id back to a plan using the configured env vars. */
export function planForPrice(priceId: string | null | undefined, envs: Record<string, string | undefined> = process.env): PlanId | null {
  if (!priceId) return null;
  for (const p of PLANS) if (p.priceEnv && envs[p.priceEnv] === priceId) return p.id;
  return null;
}
