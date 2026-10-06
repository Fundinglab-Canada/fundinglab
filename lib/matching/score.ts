// Business <-> partner fit score (0–100). Pure function: used by the admin "recompute suggestions" action
// and unit-tested. Weights (spec §9): stage 30, industry 20, geography 15, amount vs cheque/loan range 20,
// use of funds 10, readiness bonus 5 (assessment/readiness score >= 70).

export type BusinessForMatch = {
  stage: string | null;
  industry: string | null;
  province: string | null;
  amount_sought: number | null;
  use_of_funds: string[];
  readiness_score?: number | null;
};

export type PartnerForMatch = {
  type: string;
  stages: string[];
  industries: string[]; // empty = all
  provinces: string[]; // empty = Canada-wide
  min_amount: number | null;
  max_amount: number | null;
  uses_of_funds: string[]; // service partners: which needs they solve
};

export type ScoreBreakdown = { stage: number; industry: number; geography: number; ticket: number; use: number; readiness: number };
export type MatchResult = { score: number; reasons: string[]; breakdown: ScoreBreakdown };

const SERVICE_TYPES = new Set([
  "grant_writer", "ipo_expert", "ma_expert", "development_expert", "marketing_expert", "commercial_lawyer", "fractional_cpa", "recruiter",
]);

// Use-of-funds signals that point to a service partner even if they didn't list it.
const USE_TO_PARTNER: Record<string, string[]> = {
  ip_patent: ["commercial_lawyer"],
  hire_staff: ["grant_writer", "recruiter"], // wage subsidies (e.g. Student Work Placement, Canada Summer Jobs)
  rd: ["grant_writer", "fractional_cpa"], // IRAP, SR&ED
  partner_buyout: ["ma_expert", "commercial_lawyer", "lending_partner"],
  inventory_equipment: ["lending_partner"],
  marketing: ["marketing_expert"],
  product_development: ["development_expert"],
};

export function scoreMatch(b: BusinessForMatch, p: PartnerForMatch): MatchResult {
  let score = 0;
  const reasons: string[] = [];
  const breakdown: ScoreBreakdown = { stage: 0, industry: 0, geography: 0, ticket: 0, use: 0, readiness: 0 };
  const add = (k: keyof ScoreBreakdown, n: number) => { breakdown[k] += n; score += n; };

  if (b.stage && p.stages.includes(b.stage)) {
    add("stage", 30);
    reasons.push("stage");
  }

  if (!p.industries.length || (b.industry && p.industries.includes(b.industry))) {
    add("industry", 20);
    reasons.push(p.industries.length ? "industry" : "any industry");
  }

  if (!p.provinces.length || (b.province && p.provinces.includes(b.province))) {
    add("geography", 15);
    reasons.push(p.provinces.length ? "geography" : "Canada-wide");
  }

  const amount = b.amount_sought ?? 0;
  const isService = SERVICE_TYPES.has(p.type);
  if (isService) {
    add("ticket", 20);
    reasons.push("service fit");
  } else if (amount > 0 && (p.min_amount != null || p.max_amount != null)) {
    const min = p.min_amount ?? 0;
    const max = p.max_amount ?? Number.POSITIVE_INFINITY;
    if (amount >= min && amount <= max) {
      add("ticket", 20);
      reasons.push("cheque range");
    } else if (amount >= min * 0.5 && amount <= max * 1.5) {
      add("ticket", 10);
      reasons.push("near cheque range");
    }
  }

  const listed = p.uses_of_funds.find((u) => b.use_of_funds.includes(u));
  const implied = b.use_of_funds.find((u) => USE_TO_PARTNER[u]?.includes(p.type));
  const hit = listed ?? implied;
  if (hit) {
    add("use", 10);
    reasons.push(useReason(hit, p.type));
  }

  if ((b.readiness_score ?? 0) >= 70) {
    add("readiness", 5);
    reasons.push("funding-ready");
  }

  return { score: Math.min(100, score), reasons, breakdown };
}

function useReason(use: string, type: string): string {
  if (use === "ip_patent" && type === "commercial_lawyer") return "IP filing → lawyer";
  if (use === "hire_staff" && type === "grant_writer") return "hiring → wage subsidies";
  if (use === "hire_staff" && type === "recruiter") return "hiring → recruitment";
  if (use === "rd") return "R&D → IRAP / SR&ED";
  return `use of funds: ${use.replace(/_/g, " ")}`;
}

export function rankPartners<T extends PartnerForMatch>(b: BusinessForMatch, partners: T[]) {
  return partners
    .map((p) => ({ partner: p, ...scoreMatch(b, p) }))
    .sort((x, y) => y.score - x.score);
}
