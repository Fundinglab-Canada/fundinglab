// Role-specific partner fields from the spec. Rendered by the partner application form and validated
// into partners.details (jsonb). "kind" drives the input type.
import type { PartnerTypeId } from "@/lib/constants";

export type FieldKind = "text" | "number" | "money" | "percent" | "boolean" | "url" | "textarea" | "multi";
export type PartnerField = { key: string; label: string; kind: FieldKind; options?: string[] };

export const PARTNER_FIELDS: Record<PartnerTypeId, PartnerField[]> = {
  crowdfunding_platform: [
    { key: "platform_type", label: "Platform type", kind: "multi", options: ["equity", "reward", "debt"] },
    { key: "raise_min", label: "Smallest raise (CAD)", kind: "money" },
    { key: "raise_max", label: "Largest raise (CAD)", kind: "money" },
    { key: "fees", label: "Fees", kind: "text" },
  ],
  angel_investor: [
    { key: "accredited", label: "Accredited investor", kind: "boolean" },
    { key: "previous_investments", label: "Number of previous investments", kind: "number" },
    { key: "average_cheque", label: "Average cheque size (CAD)", kind: "money" },
    { key: "capital_available", label: "Capital available to deploy (CAD)", kind: "money" },
  ],
  venture_capital: [
    { key: "thesis", label: "Thesis statement", kind: "textarea" },
    { key: "cheque_min", label: "Smallest cheque (CAD)", kind: "money" },
    { key: "cheque_max", label: "Largest cheque (CAD)", kind: "money" },
    { key: "fund_size", label: "Fund size (CAD)", kind: "money" },
  ],
  private_equity: [
    { key: "cheque_min", label: "Smallest cheque (CAD)", kind: "money" },
    { key: "cheque_max", label: "Largest cheque (CAD)", kind: "money" },
    { key: "fund_size", label: "Fund size (CAD)", kind: "money" },
  ],
  grant_writer: [
    { key: "grants_written", label: "Number of grants written", kind: "number" },
    { key: "years_experience", label: "Years of experience", kind: "number" },
    { key: "success_rate", label: "Success rate (%)", kind: "percent" },
  ],
  lending_partner: [
    { key: "loan_types", label: "Loan types", kind: "multi", options: ["term", "line_of_credit", "equipment", "bridge", "receivables", "bank_csbfp"] },
    { key: "loan_min", label: "Smallest loan (CAD)", kind: "money" },
    { key: "loan_max", label: "Largest loan (CAD)", kind: "money" },
  ],
  ipo_expert: [{ key: "years_experience", label: "Years of experience", kind: "number" }],
  ma_expert: [
    { key: "deal_min", label: "Smallest deal (CAD)", kind: "money" },
    { key: "deal_max", label: "Largest deal (CAD)", kind: "money" },
    { key: "side", label: "Buy-side / sell-side", kind: "multi", options: ["buy_side", "sell_side"] },
  ],
  development_expert: [
    { key: "specialties", label: "Specialties", kind: "multi", options: ["web", "app", "ai", "server"] },
    { key: "portfolio_url", label: "Portfolio link", kind: "url" },
    { key: "rates", label: "Rates", kind: "text" },
  ],
  marketing_expert: [
    { key: "channels", label: "Channels", kind: "multi", options: ["meta", "google", "social", "ai"] },
    { key: "portfolio_url", label: "Portfolio link", kind: "url" },
    { key: "rates", label: "Rates", kind: "text" },
  ],
  commercial_lawyer: [
    { key: "practice_areas", label: "Practice areas", kind: "text" },
    { key: "jurisdiction", label: "Jurisdiction", kind: "text" },
  ],
  recruiter: [
    { key: "specialties", label: "Roles you recruit for", kind: "text" },
    { key: "placement_types", label: "Placement types", kind: "multi", options: ["permanent", "contract", "co_op", "executive"] },
    { key: "regions", label: "Regions served", kind: "text" },
    { key: "fee_model", label: "Fee model", kind: "text" },
    { key: "wage_subsidy_experience", label: "Experience with wage-subsidy programs", kind: "boolean" },
  ],
  fractional_cpa: [
    { key: "services", label: "Services", kind: "text" },
    { key: "rates", label: "Rates", kind: "text" },
  ],
};

/** Coerces raw form values into typed details; unknown keys are dropped. */
export function parseDetails(type: PartnerTypeId, raw: Record<string, FormDataEntryValue | FormDataEntryValue[]>) {
  const out: Record<string, unknown> = {};
  for (const f of PARTNER_FIELDS[type]) {
    const v = raw[f.key];
    if (v == null || v === "") continue;
    const s = Array.isArray(v) ? v.map(String) : String(v);
    switch (f.kind) {
      case "number":
      case "money":
        if (!Array.isArray(s) && Number.isFinite(Number(s))) out[f.key] = Number(s);
        break;
      case "percent":
        if (!Array.isArray(s) && Number.isFinite(Number(s))) out[f.key] = Math.min(100, Math.max(0, Number(s))) / 100;
        break;
      case "boolean":
        out[f.key] = s === "on" || s === "true" || s === "yes";
        break;
      case "multi":
        out[f.key] = (Array.isArray(s) ? s : [s]).filter((x) => f.options?.includes(x));
        break;
      default:
        if (!Array.isArray(s)) out[f.key] = s.slice(0, 1500);
    }
  }
  return out;
}

/** Amount range used by the matching engine, derived from role-specific fields. */
export function amountRange(details: Record<string, unknown>): { min: number | null; max: number | null } {
  const n = (k: string) => (typeof details[k] === "number" ? (details[k] as number) : null);
  return {
    min: n("cheque_min") ?? n("loan_min") ?? n("raise_min") ?? n("deal_min"),
    max: n("cheque_max") ?? n("loan_max") ?? n("raise_max") ?? n("deal_max") ?? n("capital_available"),
  };
}
