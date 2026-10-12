// Application Center (§7.6): statuses, types and checklist building. Pure, unit-tested.

export const APP_STATUSES = [
  { id: "planning", label: "Planning" },
  { id: "drafting", label: "Drafting" },
  { id: "under_review", label: "Under Review" },
  { id: "submitted", label: "Submitted" },
  { id: "approved", label: "Approved" },
  { id: "declined", label: "Declined" },
] as const;
export type AppStatus = (typeof APP_STATUSES)[number]["id"];
export const appStatusLabel = (id: string) => APP_STATUSES.find((s) => s.id === id)?.label ?? id;
export const isAppStatus = (v: unknown): v is AppStatus => APP_STATUSES.some((s) => s.id === v);

export const APP_TYPES = [
  { id: "grant", label: "Grant / contribution" },
  { id: "loan", label: "Loan" },
  { id: "investor", label: "Investor round" },
  { id: "crowdfunding", label: "Crowdfunding" },
] as const;
export const appTypeLabel = (id: string) => APP_TYPES.find((t) => t.id === id)?.label ?? id;

export const DECLINE_REASONS = [
  "Not eligible",
  "Incomplete application",
  "Program oversubscribed",
  "Project didn't fit priorities",
  "Weak financials",
  "Other",
] as const;

/** Specific fixes to try before reapplying, per decline reason. */
export const DECLINE_FIXES: Record<string, string[]> = {
  "Not eligible": ["Re-check the eligibility rules against your profile before the next intake.", "Ask the program officer which criterion you missed."],
  "Incomplete application": ["Use the document checklist and attach every file before submitting.", "Have a grant writer review the package."],
  "Program oversubscribed": ["Apply earlier in the next intake if it's first come, first served.", "Strengthen job numbers and partner letters to stand out."],
  "Project didn't fit priorities": ["Re-frame the project around the program's stated priorities.", "Try a program whose priorities match the project as it is."],
  "Weak financials": ["Get a fractional CPA to tidy statements and projections.", "Show the matching funds are committed (bank statements, signed letters)."],
  Other: ["Ask for feedback from the program officer.", "Book a fit call with the Funding Lab Team before reapplying."],
};

export type ChecklistItem = { id: string; label: string; done: boolean; document_id?: string | null };
type Doc = { id: string; kind: string; folder: string; file_name: string };

/** Keyword → document kinds/folders that satisfy a required document. */
const DOC_HINTS: { re: RegExp; kinds?: string[]; folders?: string[] }[] = [
  { re: /financial statement|financials|balance sheet|income statement/i, kinds: ["financials"] },
  { re: /tax return|notice of assessment|\bnoa\b/i, kinds: ["tax_returns", "registration_noa"] },
  { re: /business plan/i, kinds: ["business_plan"] },
  { re: /pitch|deck/i, kinds: ["pitch_deck"] },
  { re: /cap table/i, kinds: ["cap_table"] },
  { re: /incorporat|articles|registration|business number/i, kinds: ["incorporation", "registration_noa"] },
  { re: /forecast|projection|model|budget/i, folders: ["financial"] },
  { re: /quote|estimate/i, folders: ["product", "other"] },
];

export function buildChecklist(requiredDocs: string[], docs: Doc[]): ChecklistItem[] {
  return requiredDocs.map((label, i) => {
    const hint = DOC_HINTS.find((h) => h.re.test(label));
    const doc = hint ? docs.find((d) => hint.kinds?.includes(d.kind) || hint.folders?.includes(d.folder)) : undefined;
    return { id: `r${i + 1}`, label, done: !!doc, document_id: doc?.id ?? null };
  });
}

/** Checklist used when an application isn't linked to a program (or the program lists no documents). */
export const DEFAULT_CHECKLIST: Record<string, string[]> = {
  grant: ["Project description and budget", "Financial statements", "Quotes for major costs", "Business registration / incorporation documents"],
  loan: ["Financial statements (2–3 years)", "Tax returns / Notice of Assessment", "Business plan", "Cash-flow forecast", "Personal net worth statement"],
  investor: ["Pitch deck", "Financial model / projections", "Cap table", "Incorporation documents"],
  crowdfunding: ["Campaign page and video", "Financial statements", "Business plan", "Offering document (equity crowdfunding)"],
};

export function checklistProgress(items: ChecklistItem[]) {
  const done = items.filter((i) => i.done).length;
  return { done, total: items.length, pct: items.length ? Math.round((done / items.length) * 100) : 0 };
}
