// Funding Readiness Assessment (§7.2): 20 scored questions across 6 weighted pillars, plus stage.
// Pure and shared by the public /assessment page (teaser) and the saved report.

export type Pillar = "business_model" | "traction" | "financials" | "team" | "documentation" | "compliance";

export const PILLARS: { id: Pillar; label: string; weight: number }[] = [
  { id: "business_model", label: "Business Model", weight: 0.2 },
  { id: "traction", label: "Traction", weight: 0.2 },
  { id: "financials", label: "Financials", weight: 0.2 },
  { id: "team", label: "Team", weight: 0.15 },
  { id: "documentation", label: "Documentation", weight: 0.15 },
  { id: "compliance", label: "Compliance / Legal", weight: 0.1 },
];

export type Question = {
  id: string;
  pillar: Pillar;
  text: string;
  help?: string;
  options: { label: string; points: number }[]; // points 0–3
  fix: string;
  service?: { label: string; href: string };
};

const yn = (yes: string, partial: string, no: string) => [
  { label: yes, points: 3 },
  { label: partial, points: 1.5 },
  { label: no, points: 0 },
];

export const STAGE_QUESTION = {
  id: "stage",
  text: "Where is your business today?",
  options: [
    { id: "idea", label: "Idea — concept only" },
    { id: "preseed", label: "Pre-Seed — MVP ready" },
    { id: "seed", label: "Seed — product-market fit tested" },
    { id: "growth", label: "Growth — validated go-to-market" },
    { id: "expansion", label: "Expansion — revenue with a proven model" },
    { id: "exit", label: "Exit — established, seeking exit" },
  ],
} as const;

export const QUESTIONS: Question[] = [
  { id: "bm_model", pillar: "business_model", text: "Can you explain in one sentence who pays you, for what, and how much?",
    options: yn("Yes, clearly", "Roughly", "Not yet"), fix: "Write a one-line revenue model: customer, offer, price." },
  { id: "bm_validation", pillar: "business_model", text: "Have customers validated that they'll pay?",
    options: [{ label: "Paying customers", points: 3 }, { label: "Letters of intent or pilots", points: 2 }, { label: "Interviews only", points: 1 }, { label: "Not yet", points: 0 }],
    fix: "Get three signed letters of intent or a paid pilot." },
  { id: "bm_market", pillar: "business_model", text: "Do you know your target market size and your main competitors?",
    options: yn("Yes, with sources", "Roughly", "No"), fix: "Size your market (TAM/SAM/SOM) and map five competitors." , service: { label: "Business Plan", href: "/services#business_plan" } },
  { id: "bm_moat", pillar: "business_model", text: "Do you have a clear advantage competitors can't easily copy?",
    options: yn("Yes", "Somewhat", "Not yet"), fix: "Name your edge: IP, data, cost, channel, or team expertise." },

  { id: "tr_revenue", pillar: "traction", text: "Revenue in the last 12 months?",
    options: [{ label: "Over $1M", points: 3 }, { label: "$100K – $1M", points: 2.25 }, { label: "Under $100K", points: 1.25 }, { label: "Pre-revenue", points: 0 }],
    fix: "Focus on first revenue or a funded pilot before equity rounds." },
  { id: "tr_growth", pillar: "traction", text: "How fast is revenue or usage growing?",
    options: [{ label: "Over 50% a year", points: 3 }, { label: "10–50% a year", points: 2 }, { label: "Flat", points: 1 }, { label: "Too early to tell", points: 0 }],
    fix: "Track monthly growth and show the trend in your deck." },
  { id: "tr_customers", pillar: "traction", text: "How many paying customers do you have?",
    options: [{ label: "50+", points: 3 }, { label: "10–49", points: 2 }, { label: "1–9", points: 1 }, { label: "None yet", points: 0 }],
    fix: "Build a referenceable customer list." },
  { id: "tr_metrics", pillar: "traction", text: "Do you track key metrics monthly (e.g. CAC, churn, margin)?",
    options: yn("Yes, in a dashboard", "Some", "No"), fix: "Start a monthly KPI sheet with 5–7 metrics." },

  { id: "fi_statements", pillar: "financials", text: "Do you have financial statements prepared by an accountant?",
    options: [{ label: "Yes, last 2 years", points: 3 }, { label: "Last year only", points: 2 }, { label: "Internal only", points: 1 }, { label: "No", points: 0 }],
    fix: "Get year-end statements prepared by a CPA — lenders and most grants require them.", service: { label: "Legal & CPA Review", href: "/services#legal_cpa_review" } },
  { id: "fi_forecast", pillar: "financials", text: "Do you have a 12–36 month financial forecast?",
    options: yn("Yes, three-statement", "Revenue only", "No"), fix: "Build a monthly forecast with cash flow.", service: { label: "Financial Model", href: "/services#financial_model" } },
  { id: "fi_books", pillar: "financials", text: "Is your bookkeeping up to date?",
    options: yn("Yes, monthly", "Behind by a few months", "No"), fix: "Catch up bookkeeping before applying for anything." },
  { id: "fi_use", pillar: "financials", text: "Do you know exactly how much you need and how you'll spend it?",
    options: yn("Yes, itemized", "Roughly", "No"), fix: "Write an itemized use-of-funds table." },

  { id: "tm_fulltime", pillar: "team", text: "How many founders or leaders work on the business full-time?",
    options: [{ label: "Two or more", points: 3 }, { label: "One", points: 2 }, { label: "None yet", points: 0 }],
    fix: "Funders want at least one full-time leader." },
  { id: "tm_skills", pillar: "team", text: "Does your team cover product, sales and finance?",
    options: yn("All three", "Two of three", "One or none"), fix: "Fill the gap with a hire, contractor or advisor.", service: { label: "Hiring Staff", href: "/services/hiring" } },
  { id: "tm_advisors", pillar: "team", text: "Do you have advisors or a board with relevant experience?",
    options: yn("Yes, active", "Informal", "No"), fix: "Recruit 2–3 advisors from your industry." },

  { id: "dc_deck", pillar: "documentation", text: "Do you have a current pitch deck?",
    options: yn("Yes, updated this quarter", "Out of date", "No"), fix: "Build a 12-slide deck.", service: { label: "Pitch Deck", href: "/services#pitch_deck" } },
  { id: "dc_plan", pillar: "documentation", text: "Do you have a business plan?",
    options: yn("Yes, current", "Outdated or partial", "No"), fix: "Most lenders and grants ask for a business plan.", service: { label: "Business Plan", href: "/services#business_plan" } },
  { id: "dc_dataroom", pillar: "documentation", text: "Are your key documents organized in one place (cap table, incorporation, contracts)?",
    options: yn("Yes, a data room", "Scattered", "No"), fix: "Set up a data room before investor meetings.", service: { label: "Data Room", href: "/services#data_room" } },

  { id: "cl_corp", pillar: "compliance", text: "Is the business incorporated, with a CRA business number and taxes filed?",
    options: yn("Yes, all current", "Partly", "No"), fix: "Incorporate and get current on filings — most programs require it." },
  { id: "cl_ip", pillar: "compliance", text: "Is your IP protected and are key contracts in writing?",
    options: yn("Yes", "Partly", "No"), fix: "Assign IP to the company and paper key agreements.", service: { label: "Legal & CPA Review", href: "/services#legal_cpa_review" } },
];

export type Answers = Record<string, number | string>; // question id -> option index; "stage" -> stage id

export function bandFor(score: number) {
  if (score >= 85) return { id: "investor_grade", label: "Investor-Grade" };
  if (score >= 70) return { id: "ready", label: "Ready" };
  if (score >= 40) return { id: "developing", label: "Developing" };
  return { id: "early", label: "Early" };
}

const PATHS_NOW: Record<string, string[]> = {
  idea: ["grants", "crowdfunding", "angel"],
  preseed: ["grants", "crowdfunding", "angel"],
  seed: ["grants", "angel", "venture_capital", "loans"],
  growth: ["venture_capital", "loans", "grants"],
  expansion: ["loans", "private_equity", "grants"],
  exit: ["ipo", "private_equity"],
};
const NEXT_STAGE: Record<string, string> = { idea: "preseed", preseed: "seed", seed: "growth", growth: "expansion", expansion: "exit", exit: "exit" };

export function scoreAssessment(answers: Answers) {
  const pillarScores: Record<Pillar, number> = { business_model: 0, traction: 0, financials: 0, team: 0, documentation: 0, compliance: 0 };
  const gaps: { id: string; pillar: Pillar; question: string; fix: string; service?: { label: string; href: string }; points: number }[] = [];
  for (const p of PILLARS) {
    const qs = QUESTIONS.filter((q) => q.pillar === p.id);
    let got = 0;
    for (const q of qs) {
      const idx = Number(answers[q.id]);
      const pts = Number.isInteger(idx) && q.options[idx] ? q.options[idx].points : 0;
      got += pts;
      if (pts < 2) gaps.push({ id: q.id, pillar: p.id, question: q.text, fix: q.fix, service: q.service, points: pts });
    }
    pillarScores[p.id] = Math.round((got / (qs.length * 3)) * 100);
  }
  const score = Math.round(PILLARS.reduce((s, p) => s + pillarScores[p.id] * p.weight, 0));
  // Biggest gaps first: lowest points, then heaviest pillar.
  const weight = (p: Pillar) => PILLARS.find((x) => x.id === p)!.weight;
  gaps.sort((a, b) => a.points - b.points || weight(b.pillar) - weight(a.pillar));
  const stage = String(answers.stage ?? "idea");
  const now = PATHS_NOW[stage] ?? PATHS_NOW.idea;
  // Equity paths need a reasonable score; below 40, lead with grants and crowdfunding.
  const pathsNow = score < 40 ? now.filter((p) => ["grants", "crowdfunding", "loans"].includes(p)) : now;
  const later = (PATHS_NOW[NEXT_STAGE[stage]] ?? []).filter((p) => !pathsNow.includes(p));
  return { score, band: bandFor(score), pillarScores, topGaps: gaps.slice(0, 3), pathsNow, pathsLater: later, stage };
}

export const answeredCount = (a: Answers) => QUESTIONS.filter((q) => a[q.id] !== undefined && a[q.id] !== "").length;
