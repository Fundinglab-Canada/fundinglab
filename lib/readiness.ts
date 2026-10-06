// Funding Readiness Score (0–100): Stage 25 · Traction 25 · Documents 20 · Funding history 20 · Profile 10.
import { stageIndex } from "./constants";

export type ReadinessInput = {
  stage: string | null;
  years_in_business: number | null;
  annual_revenue: number | null;
  documents: string[]; // document kinds present
  funding_history_count: number;
  has_basics: boolean; // name, industry, amount and at least one use of funds
};

export type ReadinessPart = { label: string; value: number; max: number };

export function readiness(input: ReadinessInput): { total: number; parts: ReadinessPart[] } {
  const si = Math.max(0, stageIndex(input.stage));
  const stage = Math.round((si / 5) * 25);
  const revenue = (input.annual_revenue ?? 0) > 0 ? 10 : 0;
  const tenure = Math.min(15, Math.floor((input.years_in_business ?? 0) * 2.5));
  const traction = Math.min(25, revenue + tenure);
  const docs =
    (input.documents.includes("pitch_deck") ? 6 : 0) +
    (input.documents.includes("financials") ? 7 : 0) +
    (input.documents.includes("business_plan") ? 7 : 0);
  const history = Math.min(20, input.funding_history_count * 5);
  const profile = input.has_basics ? 10 : 4;
  const parts: ReadinessPart[] = [
    { label: "Stage", value: stage, max: 25 },
    { label: "Traction", value: traction, max: 25 },
    { label: "Documents", value: docs, max: 20 },
    { label: "Funding history", value: history, max: 20 },
    { label: "Profile completeness", value: profile, max: 10 },
  ];
  return { total: parts.reduce((s, p) => s + p.value, 0), parts };
}

export function nextStep(parts: ReadinessPart[], documents: string[]): string | null {
  if (!documents.includes("business_plan")) return "Adding a business plan raises your score by 7 points.";
  if (!documents.includes("financials")) return "Uploading financial statements raises your score by 7 points.";
  const hist = parts.find((p) => p.label === "Funding history");
  if (hist && hist.value < hist.max) return "Add past funding, including grants, to strengthen your history.";
  return null;
}

export type CompletenessInput = {
  business: {
    name: string | null; industry: string | null; province: string | null; city: string | null; legal_structure: string | null;
    description: string | null; stage: string | null; amount_sought: number | null; use_of_funds: string[];
    revenue_12m: number | null; customers: number | null; consent_matching: boolean;
  };
  documents: string[];
  historyCount: number;
  hasAssessment: boolean;
};

export type ChecklistItem = { id: string; label: string; done: boolean; href: string };

/** Profile completeness checklist (dashboard) and percentage stored in businesses.profile_completeness. */
export function completeness({ business: b, documents, historyCount, hasAssessment }: CompletenessInput) {
  const items: ChecklistItem[] = [
    { id: "basics", label: "Business basics", done: !!(b.name && b.industry && b.province && b.city && b.legal_structure), href: "/app/profile?step=1" },
    { id: "description", label: "One-paragraph description", done: !!b.description && b.description.length >= 40, href: "/app/profile?step=1" },
    { id: "stage", label: "Business stage", done: !!b.stage, href: "/app/profile?step=2" },
    { id: "need", label: "Funding need and use of funds", done: !!(b.amount_sought && b.use_of_funds.length), href: "/app/profile?step=3" },
    { id: "history", label: "Funding history", done: historyCount > 0, href: "/app/profile?step=4" },
    { id: "traction", label: "Traction (revenue or customers)", done: b.revenue_12m != null || b.customers != null, href: "/app/profile?step=5" },
    { id: "pitch_deck", label: "Pitch deck uploaded", done: documents.includes("pitch_deck"), href: "/app/profile?step=6" },
    { id: "financials", label: "Financial statements uploaded", done: documents.includes("financials"), href: "/app/profile?step=6" },
    { id: "business_plan", label: "Business plan uploaded", done: documents.includes("business_plan"), href: "/app/profile?step=6" },
    { id: "consent", label: "Matching consent on", done: b.consent_matching, href: "/app/profile?step=6" },
    { id: "assessment", label: "Readiness assessment taken", done: hasAssessment, href: "/app/assessment" },
  ];
  const pct = Math.round((items.filter((i) => i.done).length / items.length) * 100);
  return { items, pct };
}
