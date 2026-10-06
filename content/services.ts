// Long-form content for each service page (/services/[kind]). Plain language; no prices.
import type { ServiceKind } from "@/lib/constants";

export type ServiceSection = { title: string; intro?: string; items: { name: string; body: string }[] };
export type ServicePage = { headline: string; sections: ServiceSection[]; steps: string[] };

const STEPS = [
  "Book a free 15-minute meeting or send us the short requirement form",
  "We confirm scope and send you a written quote",
  "You approve the quote and pay online",
  "We deliver, with a review round before anything is final",
];

export const SERVICE_PAGES: Record<ServiceKind, ServicePage> = {
  data_room: {
    headline: "Everything an investor or lender asks for, in one organized place",
    sections: [{
      title: "What goes into a data room",
      intro: "Diligence goes faster when every answer is one click away. We build your data room around the folders investors and lenders expect.",
      items: [
        { name: "Corporate", body: "Articles of incorporation, business registration, minute book, shareholder and board resolutions, org chart." },
        { name: "Cap table & equity", body: "Current cap table, option plan, SAFEs and convertible notes, shareholder agreements." },
        { name: "Financial", body: "Financial statements (last 2–3 years plus year to date), tax returns or NOAs, management accounts, budget and forecast." },
        { name: "Financial model", body: "Three-statement model with assumptions, scenarios and use of funds." },
        { name: "Legal & contracts", body: "Key customer, supplier and partner contracts, leases, loan agreements, any litigation." },
        { name: "Intellectual property", body: "Patents, trademarks, IP assignments from founders and contractors, licences." },
        { name: "Team & HR", body: "Leadership bios, employment agreements, contractor agreements, ESOP grants." },
        { name: "Customers & traction", body: "Customer list (anonymized where needed), pipeline, KPIs, case studies and references." },
        { name: "Product & technology", body: "Product overview, roadmap, architecture summary, security and privacy practices." },
        { name: "Diligence checklist & access", body: "A checklist that tracks what's complete, plus folder-level permissions and viewer tracking." },
      ],
    }],
    steps: STEPS,
  },
  business_plan: {
    headline: "A business plan built around the questions lenders and investors actually ask",
    sections: [{
      title: "The parameters your plan covers",
      intro: "Every plan is tailored to its reader — a bank, an investor or a grant program — but all of them are judged on the same core parameters.",
      items: [
        { name: "Executive summary", body: "The business, the ask, the use of funds and the return, on one page." },
        { name: "Problem & solution", body: "Who has the problem, how painful it is, and why your product solves it better." },
        { name: "Market size", body: "TAM, SAM and SOM with sources, plus the segment you'll win first." },
        { name: "Competition", body: "Direct and indirect competitors, and your defensible advantage." },
        { name: "Business model", body: "How you make money: pricing, margins, unit economics and customer lifetime value." },
        { name: "Go-to-market", body: "Channels, sales process, partnerships and customer acquisition cost." },
        { name: "Operations", body: "Suppliers, facilities, technology, key processes and milestones." },
        { name: "Team", body: "Founders, key hires, advisors and the gaps you'll fill with this funding." },
        { name: "Financial projections", body: "Three-year income statement, cash flow and balance sheet, with clear assumptions." },
        { name: "Funding ask & use of funds", body: "How much, what it buys, and the milestones it gets you to." },
        { name: "Risks & mitigation", body: "The risks a reader will spot, and how you've addressed them." },
      ],
    }],
    steps: STEPS,
  },
  grant_writing: {
    headline: "Find the right program, then submit an application that scores",
    sections: [{
      title: "What we do",
      items: [
        { name: "Program selection", body: "We match your project to federal and provincial programs you actually qualify for." },
        { name: "Application writing", body: "Narrative, budget, workplan and supporting documents, written to the program's scoring criteria." },
        { name: "Stacking & cost share", body: "We plan how grants, loans and your own funds combine so the budget meets each program's rules." },
        { name: "Claims & reporting", body: "After approval, we help with claims, progress reports and audits so the money keeps flowing." },
      ],
    }],
    steps: STEPS,
  },
  loan_consulting: {
    headline: "A complete loan package, matched to lenders likely to say yes",
    sections: [{
      title: "What's included",
      items: [
        { name: "Lender matching", body: "Banks, credit unions, BDC, CSBFP lenders and alternative lenders that fit your size and purpose." },
        { name: "Loan package", body: "Summary, financials, projections, collateral and personal net-worth statements in the format lenders expect." },
        { name: "Bridge financing", body: "Short-term options while grant or tax-credit reimbursements are pending." },
      ],
    }],
    steps: STEPS,
  },
  financial_model: {
    headline: "A financial model that holds up in diligence",
    sections: [{ title: "What's included", items: [
      { name: "Three statements", body: "Linked income statement, balance sheet and cash flow." },
      { name: "Assumptions sheet", body: "Every driver in one place, so investors can test it." },
      { name: "Scenarios", body: "Base, upside and downside cases, plus use of funds and runway." },
    ] }],
    steps: STEPS,
  },
  pitch_deck: {
    headline: "A deck that earns the second meeting",
    sections: [{ title: "What's included", items: [
      { name: "Story", body: "Problem, solution, why now, and why your team." },
      { name: "Proof", body: "Traction, market size, business model and competition, shown clearly." },
      { name: "The ask", body: "How much, what it buys, and the milestones it reaches." },
    ] }],
    steps: STEPS,
  },
  legal_cpa_review: {
    headline: "Know exactly what you're signing",
    sections: [{ title: "What's included", items: [
      { name: "Term sheets", body: "Valuation, dilution, liquidation preferences, board seats and protective provisions explained." },
      { name: "Loan offers", body: "Rates, covenants, security and personal guarantees reviewed." },
      { name: "Funding agreements", body: "Grant and contribution agreements, claims rules and repayment conditions." },
    ] }],
    steps: STEPS,
  },
  development: {
    headline: "Build the product your funding is paying for",
    sections: [{ title: "What we build", items: [
      { name: "MVPs & prototypes", body: "Get a working first version in front of customers and investors." },
      { name: "Web & mobile apps", body: "Customer-facing products, portals and internal tools." },
      { name: "CRM, ERP & e-commerce", body: "Systems that run sales, operations and online stores." },
      { name: "AI & automation", body: "Automate repetitive work and add AI features to your product." },
    ] }],
    steps: STEPS,
  },
  marketing: {
    headline: "Turn funding into customers and revenue",
    sections: [{ title: "What we run", items: [
      { name: "Paid ads", body: "Meta, Google and LinkedIn campaigns with clear cost-per-lead targets." },
      { name: "SEO & content", body: "Content that ranks and brings in buyers, not just traffic." },
      { name: "Brand & website", body: "Positioning, messaging and a site that converts." },
      { name: "Export markets", body: "Campaigns for new markets, often eligible for export-program cost sharing." },
    ] }],
    steps: STEPS,
  },
  hiring: {
    headline: "Hire the right people, with subsidies covering part of the cost",
    sections: [{ title: "What's included", items: [
      { name: "Role definition", body: "Job descriptions, compensation ranges and interview plans." },
      { name: "Sourcing & screening", body: "Candidates sourced, screened and shortlisted for you." },
      { name: "Wage subsidies", body: "We check which wage-subsidy and job-grant programs can cover part of each hire." },
      { name: "Co-op, interns & contractors", body: "Flexible options while you grow." },
    ] }],
    steps: STEPS,
  },
  ip_trademark: {
    headline: "Protect your brand, inventions and designs",
    sections: [{ title: "What's included", items: [
      { name: "Trademark search & filing", body: "Clearance search and filing with the Canadian Intellectual Property Office (CIPO), plus U.S. and international filings." },
      { name: "Patent strategy & filing", body: "Patentability assessment, provisional and full filings prepared with registered patent agents." },
      { name: "Industrial design & copyright", body: "Protection for product appearance and creative work." },
      { name: "IP funding", body: "We check IP assistance programs that can cover part of the cost of professional IP services." },
    ] }],
    steps: STEPS,
  },
};
