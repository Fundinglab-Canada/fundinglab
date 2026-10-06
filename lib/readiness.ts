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
