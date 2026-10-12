// Funding Roadmap rules engine and Capital Stack math (§7.3). Pure functions, unit-tested.

export type RoadmapInput = {
  stage: string | null;
  funding_preference: "dilutive" | "non_dilutive" | "either" | null;
  use_of_funds: string[];
  amount_sought: number | null;
  documents: string[];       // document kinds present
  hasAssessment: boolean;
  consent_matching: boolean;
};

export type RoadmapStep = {
  id: string;
  title: string;
  body: string;
  when: "now" | "next" | "later";
  kind: "prep" | "funding";
  href: string;
  dilutive?: boolean;
};

type FundingStep = Omit<RoadmapStep, "kind" | "when"> & { dilutive: boolean };

const F = {
  grants: { id: "grants", title: "Apply for grants and contributions", body: "Non-dilutive federal and provincial programs. Most pay 50–80% of eligible costs after you spend, so plan the cash gap.", href: "/app/grants", dilutive: false },
  wage: { id: "wage_subsidies", title: "Use wage subsidies for new hires", body: "Youth, co-op and student programs can cover part of each new salary. Check before you post the job.", href: "/app/grants?type=wage_subsidy", dilutive: false },
  tax: { id: "tax_credits", title: "Claim R&D tax credits (SR&ED)", body: "Refundable credits on eligible R&D salaries and contractors. Track time and costs from day one.", href: "/app/grants?type=tax_credit", dilutive: false },
  crowd: { id: "crowdfunding", title: "Test demand with crowdfunding", body: "Reward or equity crowdfunding raises money and proves customers want the product.", href: "/funding-paths/crowdfunding", dilutive: true },
  angels: { id: "angels", title: "Raise from angel investors", body: "Typically $25K–$500K on a SAFE or convertible note, with mentorship alongside.", href: "/funding-paths/angel-investment", dilutive: true },
  earlyVc: { id: "early_vc", title: "Approach seed-stage VCs", body: "Once traction is measurable, seed funds can lead a priced round.", href: "/funding-paths/venture-capital", dilutive: true },
  vc: { id: "vc", title: "Raise a venture round", body: "Series A+ funds look for repeatable growth and a large market.", href: "/funding-paths/venture-capital", dilutive: true },
  sbLoan: { id: "small_loans", title: "Take a small business loan", body: "Canada Small Business Financing Program (CSBFP), BDC and credit unions for equipment, leaseholds and working capital.", href: "/funding-paths/business-loans", dilutive: false },
  bank: { id: "bank_loans", title: "Line up bank and CSBFP financing", body: "Term loans and a line of credit sized to your cash flow. Lenders look for a debt service coverage ratio of 1.25× or better.", href: "/funding-paths/business-loans", dilutive: false },
  bigGrants: { id: "large_grants", title: "Go after larger grants and repayable contributions", body: "Scale-up programs (e.g., regional development agencies) fund productivity and expansion projects, often interest-free.", href: "/app/grants", dilutive: false },
  growthDebt: { id: "growth_debt", title: "Use growth debt, equipment and receivables financing", body: "Finance equipment against the asset and unlock cash tied up in invoices instead of selling equity.", href: "/funding-paths/business-loans", dilutive: false },
  export: { id: "export_programs", title: "Fund new markets with export programs", body: "CanExport and similar programs share the cost of trade shows, market research and international marketing.", href: "/app/grants?q=export", dilutive: false },
  pe: { id: "pe", title: "Talk to private equity", body: "Growth capital, recapitalization or a partial sale for profitable, established companies.", href: "/funding-paths/private-equity", dilutive: true },
  ma: { id: "ma", title: "Prepare for a sale (M&A)", body: "Valuation, quality of earnings and a buyer list with an M&A advisor.", href: "/funding-paths/ipo-acquisition", dilutive: true },
  ipo: { id: "ipo", title: "Explore a public listing", body: "TSXV and CSE listings for companies ready for public-market reporting.", href: "/funding-paths/ipo-acquisition", dilutive: true },
} satisfies Record<string, FundingStep>;

/** Ordered funding sources by stage (spec §7.3 default logic): [now, next, later]. */
const BY_STAGE: Record<string, [FundingStep[], FundingStep[], FundingStep[]]> = {
  idea: [[F.grants, F.wage], [F.crowd, F.tax], [F.angels]],
  preseed: [[F.grants, F.wage, F.tax], [F.angels, F.crowd], [F.earlyVc]],
  seed: [[F.grants, F.angels], [F.sbLoan, F.earlyVc], [F.vc]],
  growth: [[F.bigGrants, F.bank], [F.vc], [F.growthDebt]],
  expansion: [[F.growthDebt, F.bigGrants], [F.pe], [F.ma]],
  exit: [[F.ma, F.pe], [F.ipo], []],
};

export function generateRoadmap(b: RoadmapInput): RoadmapStep[] {
  const steps: RoadmapStep[] = [];
  const prep = (id: string, title: string, body: string, href: string) => steps.push({ id, title, body, href, when: "now", kind: "prep" });

  if (!b.hasAssessment) prep("assessment", "Take the readiness assessment", "Ten minutes. Your score and top gaps decide which steps below come first.", "/app/assessment");
  if (!b.documents.includes("financials")) prep("financials", "Upload financial statements", "Every lender and most grant programs ask for them first.", "/app/prep/data-room");
  if (!b.documents.includes("business_plan")) prep("business_plan", "Write your business plan", "Use the guided template in Prep Studio; lenders and grant officers read it closely.", "/app/prep/business-plan");

  const pref = b.funding_preference ?? "either";
  const wantsEquity = pref !== "non_dilutive";
  const stage = b.stage && BY_STAGE[b.stage] ? b.stage : "idea";
  if (wantsEquity && stage !== "idea" && !b.documents.includes("pitch_deck")) {
    prep("pitch_deck", "Build your pitch deck", "Follow the 12-slide outline in Prep Studio, then upload it to your data room.", "/app/prep/pitch-deck");
  }

  const seen = new Set<string>();
  const add = (s: FundingStep, when: RoadmapStep["when"]) => {
    if (seen.has(s.id)) return;
    if (pref === "non_dilutive" && s.dilutive) return;
    seen.add(s.id);
    steps.push({ ...s, when, kind: "funding" });
  };

  // Need-driven steps come first so they sit at the top of "now".
  const uses = new Set(b.use_of_funds);
  if (uses.has("hire_staff")) add(F.wage, "now");
  if (uses.has("rd") || uses.has("product_development")) add(F.tax, "now");
  if (uses.has("export_expansion")) add(F.export, "now");
  if (uses.has("inventory_equipment") || uses.has("working_capital")) add(stage === "idea" || stage === "preseed" ? F.sbLoan : F.growthDebt, "next");

  const [now, next, later] = BY_STAGE[stage];
  // Preference "dilutive": equity first in each group.
  const order = (xs: FundingStep[]) => (pref === "dilutive" ? [...xs].sort((a, c) => Number(c.dilutive) - Number(a.dilutive)) : xs);
  order(now).forEach((s) => add(s, "now"));
  order(next).forEach((s) => add(s, "next"));
  order(later).forEach((s) => add(s, "later"));

  steps.push({ id: "applications", title: "Track every application in one place", body: "Add each program, loan or raise to the Application Center so deadlines and documents don't slip.", href: "/app/applications", when: "next", kind: "prep" });
  if (!b.consent_matching) steps.push({ id: "matching", title: "Turn on private matching", body: "Let the Funding Lab Team introduce you to vetted funders. Your identity stays private until you accept.", href: "/app/settings", when: "next", kind: "prep" });

  const rank = { now: 0, next: 1, later: 2 } as const;
  return steps.map((s, i) => ({ s, i })).sort((a, c) => rank[a.s.when] - rank[c.s.when] || a.i - c.i).map((x) => x.s);
}

// ---------------------------------------------------------------------------
// Capital stack
// ---------------------------------------------------------------------------

export type StackSourceId =
  | "grant" | "wage_subsidy" | "tax_credit" | "repayable" | "bank_loan" | "csbfp" | "line_of_credit" | "equipment"
  | "receivables" | "bridge" | "crowdfunding" | "angel" | "venture_capital" | "private_equity" | "founder";

/** cost = indicative annual cost of capital (%): interest for debt, investors' expected return for equity. */
export const STACK_SOURCES: { id: StackSourceId; label: string; cost: number; dilutive: boolean; government: boolean }[] = [
  { id: "grant", label: "Grant / contribution", cost: 0, dilutive: false, government: true },
  { id: "wage_subsidy", label: "Wage subsidy", cost: 0, dilutive: false, government: true },
  { id: "tax_credit", label: "Tax credit (e.g., SR&ED)", cost: 0, dilutive: false, government: true },
  { id: "repayable", label: "Interest-free repayable contribution", cost: 0, dilutive: false, government: true },
  { id: "bank_loan", label: "Bank term loan", cost: 8, dilutive: false, government: false },
  { id: "csbfp", label: "CSBFP loan", cost: 8.5, dilutive: false, government: false },
  { id: "line_of_credit", label: "Line of credit", cost: 9, dilutive: false, government: false },
  { id: "equipment", label: "Equipment financing", cost: 9, dilutive: false, government: false },
  { id: "receivables", label: "Receivables financing", cost: 15, dilutive: false, government: false },
  { id: "bridge", label: "Bridge financing", cost: 12, dilutive: false, government: false },
  { id: "crowdfunding", label: "Equity crowdfunding", cost: 20, dilutive: true, government: false },
  { id: "angel", label: "Angel investment", cost: 30, dilutive: true, government: false },
  { id: "venture_capital", label: "Venture capital", cost: 35, dilutive: true, government: false },
  { id: "private_equity", label: "Private equity", cost: 25, dilutive: true, government: false },
  { id: "founder", label: "Founder cash / revenue", cost: 0, dilutive: false, government: false },
];
export const stackSource = (id: string) => STACK_SOURCES.find((s) => s.id === id);

export type StackItem = { id: string; source: StackSourceId; label?: string; amount: number; cost?: number };

/** Default combined-government-funding ceiling when no program-specific limit applies. */
export const DEFAULT_STACKING_LIMIT_PCT = 75;

export function stackMetrics(items: StackItem[], target: number, preMoney: number | null, stackingLimitPct = DEFAULT_STACKING_LIMIT_PCT) {
  const clean = items.filter((i) => stackSource(i.source) && Number(i.amount) > 0);
  const total = clean.reduce((s, i) => s + Number(i.amount), 0);
  const costOf = (i: StackItem) => (i.cost ?? stackSource(i.source)!.cost);
  const blendedCost = total > 0 ? clean.reduce((s, i) => s + costOf(i) * Number(i.amount), 0) / total : 0;
  const equity = clean.filter((i) => stackSource(i.source)!.dilutive).reduce((s, i) => s + Number(i.amount), 0);
  const government = clean.filter((i) => stackSource(i.source)!.government).reduce((s, i) => s + Number(i.amount), 0);
  const dilutionPct = equity > 0 && preMoney && preMoney > 0 ? (equity / (preMoney + equity)) * 100 : null;
  const base = Math.max(target || 0, total);
  const governmentPct = base > 0 ? (government / base) * 100 : 0;
  return {
    total,
    gap: Math.max(0, (target || 0) - total),
    progressPct: target > 0 ? Math.min(100, (total / target) * 100) : 0,
    blendedCost,
    equity,
    dilutionPct,
    needsValuation: equity > 0 && !(preMoney && preMoney > 0),
    government,
    governmentPct,
    stackingWarning: governmentPct > stackingLimitPct,
  };
}

/** A starting stack built from the roadmap's "now" funding steps, split evenly toward the target. */
export function suggestedStack(steps: RoadmapStep[], target: number): StackItem[] {
  const map: Record<string, StackSourceId> = {
    grants: "grant", large_grants: "grant", wage_subsidies: "wage_subsidy", tax_credits: "tax_credit", export_programs: "grant",
    crowdfunding: "crowdfunding", angels: "angel", early_vc: "venture_capital", vc: "venture_capital",
    small_loans: "csbfp", bank_loans: "bank_loan", growth_debt: "equipment", pe: "private_equity",
  };
  const sources = [...new Set(steps.filter((s) => s.kind === "funding" && s.when === "now").map((s) => map[s.id]).filter(Boolean))].slice(0, 3);
  if (!sources.length || !(target > 0)) return [];
  const each = Math.round(target / sources.length / 1000) * 1000;
  return sources.map((source, i) => ({ id: `s${i + 1}`, source, amount: each }));
}
