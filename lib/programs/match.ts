// Grant Intelligence eligibility matcher (§7.4). Scores each program against the business profile and
// explains "Why you match" and "What might disqualify you". Pure and unit-tested.
import { industryLabel, stageName, useLabel } from "@/lib/constants";
import type { EligibilityRules, ProgramRow } from "./types";

export type MatchBusiness = {
  province: string | null;
  stage: string | null;
  industry: string | null;
  amount_sought: number | null;
  use_of_funds: string[];
  ownership_tags: string[];
  legal_structure: string | null;
  revenue_12m: number | null;
  annual_revenue: number | null;
  revenue_band: string | null;
  employees: number | null;
};

export type MatchProgram = Pick<
  ProgramRow,
  "level" | "province" | "type" | "name" | "summary" | "industries" | "stages" | "min_amount" | "max_amount" | "intake_close" | "close_at" | "rolling"
> & { eligibility_rules: EligibilityRules | null };

export type ProgramMatch = { score: number; blocked: boolean; why: string[]; risks: string[]; closed: boolean };

const BAND_FLOOR: Record<string, number> = {
  pre_revenue: 0, under_100k: 0, "100k_500k": 100_000, "500k_1m": 500_000, "1m_5m": 1_000_000, "5m_20m": 5_000_000, over_20m: 20_000_000,
};
// Band ceilings are exclusive: "$500K – $1M" can't confirm a $1M minimum.
const BAND_CEIL: Record<string, number> = {
  pre_revenue: 0, under_100k: 99_999, "100k_500k": 499_999, "500k_1m": 999_999, "1m_5m": 4_999_999, "5m_20m": 19_999_999, over_20m: Infinity,
};
const LEGAL: Record<string, string> = {
  sole_prop: "sole proprietorships", partnership: "partnerships", corporation: "corporations", nonprofit: "not-for-profits", coop: "co-operatives",
};
const fmt = (v: number) => (v >= 1_000_000 ? `$${+(v / 1_000_000).toFixed(2)}M` : `$${Math.round(v / 1000)}K`);

/** Uses of funds that each program type naturally pays for (used when the program has no explicit rule). */
const TYPE_USES: Record<string, string[]> = {
  wage_subsidy: ["hire_staff"],
  tax_credit: ["rd", "product_development"],
  loan: ["inventory_equipment", "working_capital", "export_expansion", "partner_buyout"],
  repayable: ["inventory_equipment", "export_expansion", "product_development"],
};

export function programDeadline(p: Pick<MatchProgram, "close_at" | "intake_close">): Date | null {
  const d = p.close_at ?? p.intake_close;
  return d ? new Date(d) : null;
}

export function matchProgram(p: MatchProgram, b: MatchBusiness, now = new Date()): ProgramMatch {
  const rules = p.eligibility_rules ?? {};
  const why: string[] = [];
  const risks: string[] = [];
  let blocked = false;
  let score = 0;

  // Location (15)
  const provinces = rules.provinces?.length ? rules.provinces : p.province ? [p.province] : [];
  if (!provinces.length) { score += 10; why.push("Open to businesses across Canada"); }
  else if (!b.province) risks.push(`Only for businesses in ${provinces.join(", ")}. Add your province to confirm.`);
  else if (provinces.includes(b.province)) { score += 15; why.push(`Available in ${b.province}`); }
  else { blocked = true; risks.push(`Only for businesses in ${provinces.join(", ")}`); }

  // Stage (30)
  if (!p.stages.length) score += 20;
  else if (b.stage && p.stages.includes(b.stage)) { score += 30; why.push(`Fits the ${stageName(b.stage)} stage`); }
  else if (b.stage) risks.push(`Usually funds ${p.stages.map(stageName).join(", ")} stage businesses`);

  // Industry (20)
  if (!p.industries.length) score += 12;
  else if (b.industry && p.industries.includes(b.industry)) { score += 20; why.push(`Targets ${industryLabel(b.industry)}`); }
  else { score += 2; risks.push(`Focused on ${p.industries.map(industryLabel).join(", ")}`); }

  // Amount (15)
  const need = Number(b.amount_sought ?? 0);
  const min = p.min_amount != null ? Number(p.min_amount) : null;
  const max = p.max_amount != null ? Number(p.max_amount) : null;
  if (!need || (min == null && max == null)) score += 8;
  else if ((min == null || need >= min) && (max == null || need <= max)) { score += 15; why.push(`Your ${fmt(need)} need is within the program range`); }
  else if (max != null && need > max) { score += 8; why.push(`Can cover up to ${fmt(max)} of your ${fmt(need)} need`); }
  else if (min != null && need < min) risks.push(`Minimum funding is ${fmt(min)}`);

  // Use of funds (15)
  const fits = rules.uses_of_funds?.length ? rules.uses_of_funds : TYPE_USES[p.type] ?? [];
  const exportProgram = /export|international|market development/i.test(`${p.name} ${p.summary ?? ""}`);
  const overlap = b.use_of_funds.filter((u) => fits.includes(u) || (u === "export_expansion" && exportProgram));
  if (overlap.length) { score += 15; why.push(`Pays for ${overlap.map((u) => useLabel(u).toLowerCase()).join(" and ")}`); }
  else if (!fits.length && !exportProgram) score += 5;

  // Ownership (5) — targeted programs require the tag.
  if (rules.ownership_tags?.length) {
    const has = rules.ownership_tags.filter((t) => b.ownership_tags.includes(t));
    if (has.length) { score += 5; why.push("Matches your ownership profile"); }
    else { blocked = true; risks.push(`Reserved for ${rules.ownership_tags.map((t) => t.replace(/_/g, "-")).join(" or ")} businesses`); }
  }

  // Legal structure
  if (rules.legal_structures?.length) {
    if (!b.legal_structure) risks.push(`Open to ${rules.legal_structures.map((l) => LEGAL[l] ?? l).join(", ")}. Add your legal structure to confirm.`);
    else if (!rules.legal_structures.includes(b.legal_structure)) { blocked = true; risks.push(`Applicants must be ${rules.legal_structures.map((l) => LEGAL[l] ?? l).join(" or ")}`); }
  }

  // Revenue and size
  const revenue = b.revenue_12m ?? b.annual_revenue ?? null;
  const revLow = revenue ?? (b.revenue_band ? BAND_FLOOR[b.revenue_band] : null);
  const revHigh = revenue ?? (b.revenue_band ? BAND_CEIL[b.revenue_band] : null);
  if (rules.min_revenue != null) {
    if (revHigh == null) risks.push(`Requires at least ${fmt(rules.min_revenue)} in annual revenue. Add your revenue to confirm.`);
    else if (revHigh < rules.min_revenue) { blocked = true; risks.push(`Requires at least ${fmt(rules.min_revenue)} in annual revenue`); }
    else if (revLow != null && revLow >= rules.min_revenue) why.push(`Meets the ${fmt(rules.min_revenue)} revenue minimum`);
  }
  if (rules.max_revenue != null && revLow != null && revLow > rules.max_revenue) { blocked = true; risks.push(`For businesses under ${fmt(rules.max_revenue)} in revenue`); }
  if (rules.min_employees != null && b.employees != null && b.employees < rules.min_employees) {
    blocked = true; risks.push(`Requires at least ${rules.min_employees} employees`);
  }

  // Intake
  const deadline = programDeadline(p);
  const closed = !!deadline && deadline.getTime() < now.getTime() && !p.rolling;
  if (closed) risks.push("Current intake is closed. Save it to hear when the next one opens.");
  else if (deadline) {
    const days = Math.ceil((deadline.getTime() - now.getTime()) / 864e5);
    if (days <= 30) risks.push(`Closes in ${days} day${days === 1 ? "" : "s"}`);
  }
  for (const note of rules.notes ?? []) risks.push(note);

  score = Math.min(100, score);
  if (blocked) score = Math.min(score, 25);
  else if (closed) score = Math.min(score, 50);
  return { score, blocked, why, risks, closed };
}

export function rankPrograms<T extends MatchProgram>(programs: T[], b: MatchBusiness, now = new Date()) {
  return programs
    .map((program) => ({ program, match: matchProgram(program, b, now) }))
    .sort((a, c) => Number(a.match.blocked) - Number(c.match.blocked) || c.match.score - a.match.score);
}

// ---------------------------------------------------------------------------
// Deadline alerts: 30 / 14 / 3 days before intake close (§7.4)
// ---------------------------------------------------------------------------
export const ALERT_DAYS = [30, 14, 3] as const;

/**
 * Which alert (if any) is due. Only the tightest threshold reached is sent, so a program saved 10 days
 * before close gets the 14-day alert once, not the 30-day one too. Returns the thresholds to mark as sent.
 */
export function alertDue(deadline: Date, sent: number[], now = new Date()): { threshold: number; markSent: number[] } | null {
  const daysLeft = (deadline.getTime() - now.getTime()) / 864e5;
  if (daysLeft <= 0) return null;
  const reached = ALERT_DAYS.filter((t) => daysLeft <= t);
  if (!reached.length) return null;
  const tightest = Math.min(...reached);
  if (sent.includes(tightest)) return null;
  return { threshold: tightest, markSent: reached.filter((t) => !sent.includes(t)) };
}
