// Business <-> partner fit score (0–100). Pure function: used by the admin "recompute suggestions" action
// and unit-tested. Weights: stage 30, industry 25, geography 15, amount vs cheque/loan range 20, use of funds 10.

export type BusinessForMatch = {
  stage: string | null;
  industry: string | null;
  province: string | null;
  amount_sought: number | null;
  use_of_funds: string[];
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

export type MatchResult = { score: number; reasons: string[] };

const SERVICE_TYPES = new Set([
  "grant_writer", "ipo_expert", "ma_expert", "development_expert", "marketing_expert", "commercial_lawyer", "fractional_cpa",
]);

// Use-of-funds signals that point to a service partner even if they didn't list it.
const USE_TO_PARTNER: Record<string, string[]> = {
  ip_patent: ["commercial_lawyer"],
  hire_staff: ["grant_writer"], // wage subsidies (e.g. Student Work Placement, Canada Summer Jobs)
  rd: ["grant_writer", "fractional_cpa"], // IRAP, SR&ED
  partner_buyout: ["ma_expert", "commercial_lawyer", "lending_partner"],
  inventory_equipment: ["lending_partner"],
  marketing: ["marketing_expert"],
  product_development: ["development_expert"],
};

export function scoreMatch(b: BusinessForMatch, p: PartnerForMatch): MatchResult {
  let score = 0;
  const reasons: string[] = [];

  if (b.stage && p.stages.includes(b.stage)) {
    score += 30;
    reasons.push("stage");
  }

  if (!p.industries.length || (b.industry && p.industries.includes(b.industry))) {
    score += 25;
    reasons.push(p.industries.length ? "industry" : "any industry");
  }

  if (!p.provinces.length || (b.province && p.provinces.includes(b.province))) {
    score += 15;
    reasons.push(p.provinces.length ? "geography" : "Canada-wide");
  }

  const amount = b.amount_sought ?? 0;
  const isService = SERVICE_TYPES.has(p.type);
  if (isService) {
    score += 10;
    reasons.push("service fit");
  } else if (amount > 0 && (p.min_amount != null || p.max_amount != null)) {
    const min = p.min_amount ?? 0;
    const max = p.max_amount ?? Number.POSITIVE_INFINITY;
    if (amount >= min && amount <= max) {
      score += 20;
      reasons.push("cheque range");
    } else if (amount >= min * 0.5 && amount <= max * 1.5) {
      score += 10;
      reasons.push("near cheque range");
    }
  }

  const listed = p.uses_of_funds.find((u) => b.use_of_funds.includes(u));
  const implied = b.use_of_funds.find((u) => USE_TO_PARTNER[u]?.includes(p.type));
  const hit = listed ?? implied;
  if (hit) {
    score += 10;
    reasons.push(useReason(hit, p.type));
  }

  return { score: Math.min(100, score), reasons };
}

function useReason(use: string, type: string): string {
  if (use === "ip_patent" && type === "commercial_lawyer") return "IP filing → lawyer";
  if (use === "hire_staff" && type === "grant_writer") return "hiring → wage subsidies";
  if (use === "rd") return "R&D → IRAP / SR&ED";
  return `use of funds: ${use.replace(/_/g, " ")}`;
}

export function rankPartners<T extends PartnerForMatch>(b: BusinessForMatch, partners: T[]) {
  return partners
    .map((p) => ({ partner: p, ...scoreMatch(b, p) }))
    .sort((x, y) => y.score - x.score);
}
