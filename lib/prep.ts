// Prep Studio content (§7.5): data room folders and expected files, business plan template,
// 12-slide pitch outline, cap table math, and completeness for each item.

export const DATA_ROOM_FOLDERS = [
  { id: "corporate", label: "Corporate", expected: ["Pitch deck", "Business plan", "Executive summary"] },
  { id: "financial", label: "Financial", expected: ["Financial statements (2–3 years)", "Current-year management accounts", "Financial model / projections", "Cap table", "Tax returns"] },
  { id: "legal", label: "Legal", expected: ["Articles of incorporation", "Shareholder agreement", "Material contracts", "Business registration"] },
  { id: "ip", label: "IP", expected: ["Patents / trademark filings", "IP assignment agreements"] },
  { id: "team", label: "Team", expected: ["Org chart", "Key employee agreements", "Founder bios"] },
  { id: "customers", label: "Customers", expected: ["Top customer list or contracts", "Sales pipeline", "Testimonials / case studies"] },
  { id: "product", label: "Product", expected: ["Product overview or demo", "Roadmap", "Technical architecture"] },
] as const;
export type FolderId = (typeof DATA_ROOM_FOLDERS)[number]["id"] | "other";
export const FOLDER_IDS = [...DATA_ROOM_FOLDERS.map((f) => f.id), "other"] as const;
export const folderLabel = (id: string) => DATA_ROOM_FOLDERS.find((f) => f.id === id)?.label ?? "Other";

/** Share of the 7 standard folders that have at least one file. */
export function dataRoomCompleteness(folders: string[]): number {
  const have = new Set(folders);
  return Math.round((DATA_ROOM_FOLDERS.filter((f) => have.has(f.id)).length / DATA_ROOM_FOLDERS.length) * 100);
}

/** Default folder for each profile document kind (step 6 uploads land in the data room too). */
export const KIND_FOLDER: Record<string, FolderId> = {
  pitch_deck: "corporate", business_plan: "corporate", financials: "financial", tax_returns: "financial", cap_table: "financial",
  incorporation: "legal", registration_noa: "legal", other: "other",
};

export const BUSINESS_PLAN_SECTIONS = [
  { id: "summary", title: "Executive summary", prompt: "In one page: what you do, for whom, how you make money, how much you need and what it achieves." },
  { id: "problem", title: "Problem and solution", prompt: "The customer problem in their words, and why your product solves it better than today's alternatives." },
  { id: "market", title: "Market", prompt: "Who buys, how many of them there are, and what they spend. Show your math (TAM / SAM / SOM)." },
  { id: "competition", title: "Competition", prompt: "Direct and indirect competitors and your edge. Be honest; reviewers notice when this is missing." },
  { id: "model", title: "Business model and pricing", prompt: "How you charge, typical deal size, margins and how revenue grows." },
  { id: "marketing", title: "Sales and marketing plan", prompt: "Channels, cost to acquire a customer, sales cycle and the next 12 months of targets." },
  { id: "operations", title: "Operations", prompt: "Location, suppliers, key processes, regulatory approvals and anything that could slow delivery." },
  { id: "team", title: "Management team", prompt: "Founders and key hires, relevant experience, and the roles you still need to fill." },
  { id: "financials", title: "Financial plan", prompt: "Revenue, expenses and cash for 3 years, with the main assumptions. Attach the model in your data room." },
  { id: "funding", title: "Funding request and use of funds", prompt: "How much, from which sources, and exactly what it pays for. Match the numbers to your capital stack." },
  { id: "risks", title: "Risks and mitigation", prompt: "The three biggest risks and what you're doing about each." },
] as const;

/** A section counts as written at 150+ characters. */
export function businessPlanCompleteness(sections: Record<string, string | undefined>): number {
  const done = BUSINESS_PLAN_SECTIONS.filter((s) => (sections[s.id] ?? "").trim().length >= 150).length;
  return Math.round((done / BUSINESS_PLAN_SECTIONS.length) * 100);
}

export const PITCH_OUTLINE = [
  { title: "Title", tip: "Company name, one-line description, your name and contact." },
  { title: "Problem", tip: "One painful, specific problem. Use a number or a customer quote." },
  { title: "Solution", tip: "What you built and why it's better. A screenshot beats a paragraph." },
  { title: "Why now", tip: "The change (technology, regulation, behaviour) that makes this the moment." },
  { title: "Market size", tip: "Bottom-up TAM / SAM / SOM. Show the math, not just a big number." },
  { title: "Product", tip: "How it works and what's next on the roadmap." },
  { title: "Traction", tip: "Revenue, growth rate, customers, pilots, retention. Your strongest slide." },
  { title: "Business model", tip: "Pricing, unit economics, margins." },
  { title: "Competition", tip: "A positioning map or table and your unfair advantage." },
  { title: "Go-to-market", tip: "How you'll acquire customers and what it costs." },
  { title: "Team", tip: "Why this team wins. Relevant experience, advisors, key hires planned." },
  { title: "The ask", tip: "Amount, instrument, use of funds and the milestones it gets you to." },
] as const;

// ---------------------------------------------------------------------------
// Cap table
// ---------------------------------------------------------------------------
export type CapEntry = { holder: string; class: string; shares: number; options: number };
export const SHARE_CLASSES = ["Common", "Preferred", "SAFE / note (as-converted)", "Option pool"] as const;

export function capTableSummary(entries: CapEntry[]) {
  const rows = entries.filter((e) => e.holder.trim() && (Number(e.shares) > 0 || Number(e.options) > 0));
  const fullyDiluted = rows.reduce((s, e) => s + Number(e.shares || 0) + Number(e.options || 0), 0);
  return {
    fullyDiluted,
    rows: rows.map((e) => {
      const total = Number(e.shares || 0) + Number(e.options || 0);
      return { ...e, total, pct: fullyDiluted > 0 ? (total / fullyDiluted) * 100 : 0 };
    }).sort((a, b) => b.total - a.total),
  };
}
