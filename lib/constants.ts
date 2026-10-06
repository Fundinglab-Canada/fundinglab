// Single source of truth for product vocabulary and required copy. Ids match the Postgres enums in supabase/migrations.
// User-facing chrome strings also live in messages/en.json for French localization (next-intl).

import en from "@/messages/en.json";

export const BRAND = {
  ...en.brand,
  contactEmail: "fundinglab.ca@gmail.com",
  contactLine: `${en.brand.contactName} · fundinglab.ca@gmail.com`,
} as const;

export const CTA = { ...en.cta, href: "/signup" } as const;

export const CONSENT = en.consent;

export const STAGES = [
  { id: "idea", name: "Idea", desc: "Concept only" },
  { id: "preseed", name: "Pre-Seed", desc: "MVP (Minimum Viable Product) ready" },
  { id: "seed", name: "Seed", desc: "Product-market fit tested" },
  { id: "growth", name: "Growth", desc: "Validated go-to-market strategy" },
  { id: "expansion", name: "Expansion", desc: "Revenue with a proven business model" },
  { id: "exit", name: "Exit", desc: "Established for years, seeking exit" },
] as const;
export type StageId = (typeof STAGES)[number]["id"];
export const stageIndex = (id: string | null | undefined) => STAGES.findIndex((s) => s.id === id);
export const stageName = (id: string | null | undefined) => STAGES.find((s) => s.id === id)?.name ?? "—";

export const FUNDING_PATHS = [
  { id: "crowdfunding", slug: "crowdfunding", name: "Crowdfunding", icon: "trending-up", stages: ["idea", "preseed", "seed"], range: "$10K – $1.5M",
    who: "Consumer-facing products with a community ready to back them. Equity, reward or debt models.",
    help: ["Check whether equity, reward or debt crowdfunding fits", "Prepare the campaign page, video and financial disclosures", "Introduce you to vetted platforms"] },
  { id: "angel", slug: "angel-investment", name: "Angel Investment", icon: "star", stages: ["preseed", "seed"], range: "$25K – $500K",
    who: "Founders with an MVP and early traction who want smart money and mentorship alongside capital.",
    help: ["Get your deck, data room and cap table angel-ready", "Private introductions to vetted angels and groups", "Plain-language help with SAFE and convertible-note terms"] },
  { id: "venture_capital", slug: "venture-capital", name: "Venture Capital", icon: "bar-chart", stages: ["seed", "growth", "expansion"], range: "$500K – $20M+",
    who: "Scalable companies with a large market and the ambition to grow 3–10× in a few years.",
    help: ["Test VC fit: market size, growth rate, team", "Build the data room and investor snapshot", "Curated introductions to funds whose thesis fits"] },
  { id: "private_equity", slug: "private-equity", name: "Private Equity", icon: "briefcase", stages: ["expansion", "exit"], range: "$2M – $100M+",
    who: "Profitable, established companies looking for growth capital, recapitalization or ownership transition.",
    help: ["Quality-of-earnings preparation with a fractional CPA", "Control vs minority options explained", "Introductions to PE firms by size and sector"] },
  { id: "grants", slug: "grants", name: "Grants", icon: "landmark", stages: ["idea", "preseed", "seed", "growth", "expansion"], range: "$5K – $1M+",
    who: "Non-dilutive federal and provincial programs for R&D, hiring, export and innovation in every industry (IRAP, SR&ED, CanExport, wage subsidies).",
    help: ["Find programs you qualify for in the Grants Hub", "Grant writers who build and submit the application", "Claims and reporting support after you're funded"] },
  { id: "loans", slug: "business-loans", name: "Business Loans", icon: "building", stages: ["growth", "expansion", "exit"], range: "$25K – $5M",
    who: "Bridge funding, equipment loans, receivables financing, bank loans (Canada Small Business Financing Program, CALA, other) and lines of credit.",
    help: ["Lender-ready loan package from your profile", "Matching with credit unions, banks and alternative lenders", "Bridge financing while grants reimburse you"] },
  { id: "ipo", slug: "ipo-acquisition", name: "IPO / Acquisition", icon: "check-circle", stages: ["exit"], range: "$10M+",
    who: "Mature companies preparing for a public listing (TSX, TSXV, CSE) or a strategic sale.",
    help: ["Valuation and exit-readiness checklist", "M&A advisors for buy-side or sell-side", "Go-public experts for TSXV and CSE listings"] },
] as const;
export type FundingPath = (typeof FUNDING_PATHS)[number];

// Homepage "Sound familiar?" (§4). Modules not yet live link to the closest Phase 1 surface.
export const PAIN_POINTS = [
  { quote: "I don't know which funding I qualify for.", module: "Readiness Assessment + Funding Roadmap", href: "/assessment" },
  { quote: "Grants are scattered across dozens of websites.", module: "Grant Intelligence", href: "/grants" },
  { quote: "I'm not investor- or lender-ready.", module: "Prep Studio", href: "/services" },
  { quote: "Applications take forever and get rejected.", module: "Application Center", href: "/services#grant_writing" },
  { quote: "I can't reach the right investors or lenders.", module: "Private Matchmaking", href: "/signup" },
  { quote: "I don't understand term sheets or loan terms.", module: "Deal Close Support", href: "/services#legal_cpa_review" },
  { quote: "Grants pay after I spend — I have a cash gap.", module: "Bridge Financing", href: "/funding-paths/business-loans" },
  { quote: "Post-funding reporting is a nightmare.", module: "Post-Funding Hub", href: "/services#grant_writing" },
  { quote: "I start from zero every time I raise.", module: "Next Round Engine", href: "/signup" },
] as const;

export const INDUSTRIES = [
  { id: "advanced_manufacturing", label: "Advanced Manufacturing" },
  { id: "agrifood", label: "Agriculture, Food & Beverage" },
  { id: "cleantech", label: "Clean Technology" },
  { id: "construction", label: "Construction & Trades" },
  { id: "consumer", label: "Consumer Products" },
  { id: "digital_media", label: "Digital Media" },
  { id: "education", label: "Education" },
  { id: "fintech", label: "Fintech" },
  { id: "forestry", label: "Forestry & Wood Products" },
  { id: "health", label: "Healthtech & Life Sciences" },
  { id: "hospitality", label: "Hospitality & Tourism" },
  { id: "logistics", label: "Transportation & Logistics" },
  { id: "mining_energy", label: "Mining & Energy" },
  { id: "professional_services", label: "Professional Services" },
  { id: "retail", label: "Retail & E-commerce" },
  { id: "software", label: "Information Technology / SaaS" },
  { id: "other", label: "Other" },
] as const;
export const industryLabel = (id: string | null | undefined) => INDUSTRIES.find((i) => i.id === id)?.label ?? "—";

export const PROVINCES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"] as const;

export const LEGAL_STRUCTURES = [
  { id: "sole_prop", label: "Sole proprietorship" },
  { id: "partnership", label: "Partnership" },
  { id: "corporation", label: "Corporation" },
  { id: "nonprofit", label: "Not-for-profit" },
  { id: "coop", label: "Co-operative" },
] as const;

export const REVENUE_BANDS = [
  { id: "pre_revenue", label: "Pre-revenue" },
  { id: "under_100k", label: "Under $100K" },
  { id: "100k_500k", label: "$100K – $500K" },
  { id: "500k_1m", label: "$500K – $1M" },
  { id: "1m_5m", label: "$1M – $5M" },
  { id: "5m_20m", label: "$5M – $20M" },
  { id: "over_20m", label: "Over $20M" },
] as const;

export const OWNERSHIP_TAGS = [
  { id: "women_owned", label: "Women-owned" },
  { id: "indigenous_owned", label: "Indigenous-owned" },
  { id: "youth_owned", label: "Youth-owned (under 40)" },
  { id: "newcomer_owned", label: "Newcomer-owned" },
  { id: "black_owned", label: "Black-owned" },
  { id: "disability_owned", label: "Owned by a person with a disability" },
  { id: "francophone", label: "Francophone" },
  { id: "rural", label: "Rural-based" },
] as const;

export const USES_OF_FUNDS = [
  { id: "product_development", label: "Product Development" },
  { id: "marketing", label: "Marketing" },
  { id: "hire_staff", label: "Hire Staff" },
  { id: "rd", label: "R&D" },
  { id: "ip_patent", label: "IP / Patent Filing" },
  { id: "inventory_equipment", label: "Inventory or Equipment" },
  { id: "partner_buyout", label: "Partner Buyout" },
  { id: "working_capital", label: "Working Capital" },
  { id: "export_expansion", label: "Export / Expansion" },
  { id: "other", label: "Other" },
] as const;
export const useLabel = (id: string) => USES_OF_FUNDS.find((u) => u.id === id)?.label ?? id;

export const FUNDING_SOURCES = [
  { id: "crowdfunding", label: "Crowdfunding" },
  { id: "angel", label: "Angel Investment" },
  { id: "venture_capital", label: "Venture Capital" },
  { id: "private_equity", label: "Private Equity" },
  { id: "grant_federal", label: "Grants – Federal" },
  { id: "grant_provincial", label: "Grants – Provincial" },
  { id: "business_loan", label: "Business Loan" },
  { id: "ipo_acquisition", label: "IPO / Acquisition" },
] as const;
export const sourceLabel = (id: string) => FUNDING_SOURCES.find((s) => s.id === id)?.label ?? id;

export const LOAN_SUBTYPES = [
  { id: "bridge", label: "Bridge Funding" },
  { id: "equipment", label: "Equipment Loan" },
  { id: "receivables", label: "Receivables Financing" },
  { id: "bank_csbfp", label: "Bank Loan – Canada Small Business Financing Program" },
  { id: "bank_cala", label: "Bank Loan – CALA" },
  { id: "bank_other", label: "Bank Loan – Other" },
  { id: "line_of_credit", label: "Line of Credit" },
] as const;

export const FUNDING_STATUSES = [
  { id: "received", label: "Received" },
  { id: "active", label: "Active" },
  { id: "repaid", label: "Repaid" },
  { id: "closed", label: "Closed" },
] as const;

export const PARTNER_TYPES = [
  { id: "crowdfunding_platform", label: "Crowdfunding Platform", funder: true },
  { id: "angel_investor", label: "Angel Investor", funder: true },
  { id: "venture_capital", label: "Venture Capital", funder: true },
  { id: "private_equity", label: "Private Equity Firm", funder: true },
  { id: "grant_writer", label: "Grant Writer", funder: false },
  { id: "lending_partner", label: "Lending Partner", funder: true },
  { id: "ipo_expert", label: "IPO Expert", funder: false },
  { id: "ma_expert", label: "M&A Expert", funder: false },
  { id: "development_expert", label: "Development Expert", funder: false },
  { id: "marketing_expert", label: "Marketing Expert", funder: false },
  { id: "commercial_lawyer", label: "Commercial Lawyer", funder: false },
  { id: "fractional_cpa", label: "Fractional CPA", funder: false },
  { id: "recruiter", label: "Recruitment Partner", funder: false },
] as const;
export type PartnerTypeId = (typeof PARTNER_TYPES)[number]["id"];
export const partnerTypeLabel = (id: string) => PARTNER_TYPES.find((p) => p.id === id)?.label ?? id;

export const DEAL_STATUSES = [
  { id: "new", label: "New" },
  { id: "introduced", label: "Introduced" },
  { id: "in_discussion", label: "In Discussion" },
  { id: "diligence", label: "Diligence" },
  { id: "term_sheet", label: "Term Sheet" },
  { id: "approved", label: "Approved" },
  { id: "funded", label: "Funded" },
  { id: "closed_lost", label: "Closed Lost" },
] as const;
export type DealStatus = (typeof DEAL_STATUSES)[number]["id"];

// Services (§4H, §11). Prices in CAD cents; "quote" services have no fixed price. Admin-configurable packages are Phase 2.
export const SERVICES = [
  { kind: "data_room", category: "funding", name: "Data Room", priceCents: 150000, priceLabel: "from $1,500", promise: "Investor-ready, organized the way VCs and lenders expect.",
    desc: "Virtual data room with corporate, financial, legal, IP, team, customer and product folders, a diligence checklist and access controls." },
  { kind: "business_plan", category: "funding", name: "Business Plan", priceCents: 350000, priceLabel: "from $3,500", promise: "A plan lenders and investors actually read.",
    desc: "Lender- and investor-grade business plan with 3-year projections, market sizing and a use-of-funds narrative." },
  { kind: "grant_writing", category: "funding", name: "Grant Writing", priceCents: 250000, priceLabel: "from $2,500 + success fee", promise: "The right program, a complete application.",
    desc: "Program selection and full application drafting for federal and B.C. programs, plus claims and reporting support." },
  { kind: "loan_consulting", category: "funding", name: "Loan Consulting", priceCents: 120000, priceLabel: "from $1,200", promise: "A loan package lenders say yes to.",
    desc: "Lender matching and loan package preparation for CSBFP, BDC, credit unions and alternative lenders." },
  { kind: "financial_model", category: "funding", name: "Financial Model", priceCents: null, priceLabel: "Quote", promise: "Numbers that hold up in diligence.",
    desc: "Three-statement financial model with scenarios, built from your actuals." },
  { kind: "pitch_deck", category: "funding", name: "Pitch Deck", priceCents: null, priceLabel: "Quote", promise: "A deck that earns the second meeting.",
    desc: "Twelve-slide investor deck review or build, with story, traction and ask." },
  { kind: "legal_cpa_review", category: "funding", name: "Legal & CPA Review", priceCents: null, priceLabel: "Quote", promise: "Know what you're signing.",
    desc: "Commercial lawyer or fractional CPA review of term sheets, loan offers and funding agreements." },
  { kind: "hiring", category: "growth", name: "Hiring Staff", priceCents: null, priceLabel: "Quote", href: "/services/hiring",
    promise: "Hire the right people, and use wage subsidies to pay for part of it.",
    desc: "Role definition, sourcing, screening, interview support, contract staff, co-op students and interns." },
  { kind: "development", category: "growth", name: "Development", priceCents: null, priceLabel: "Quote", href: "/services/development",
    promise: "Build the technology your business runs on.",
    desc: "Websites, web and mobile apps, CRM and ERP, e-commerce, AI and automation, integrations and cloud." },
  { kind: "marketing", category: "growth", name: "Sales & Marketing", priceCents: null, priceLabel: "Quote", href: "/services/marketing",
    promise: "Turn funding into customers and revenue.",
    desc: "Social media, Meta and Google Ads, SEO, content, email, branding, lead generation and export-market campaigns." },
] as const;
export type ServiceKind = (typeof SERVICES)[number]["kind"];
export const serviceName = (k: string) => SERVICES.find((s) => s.kind === k)?.name ?? (k === "cohort" ? "Road to Funding" : k === "partner_membership" ? "Partner membership" : k);

export const PARTNER_TIERS = [
  { id: "pro", name: "Partner Pro", priceEnv: "STRIPE_PRICE_PARTNER_PRO" },
  { id: "premier", name: "Partner Premier", priceEnv: "STRIPE_PRICE_PARTNER_PREMIER" },
] as const;

export const CONTACT_ROLES = ["Business owner", "Investor / Funder", "Service provider / Partner", "Job seeker", "Media", "Other"] as const;
export const CONTACT_TOPICS = ["General question", "Grants", "Loans", "Investors", "Funding Webinar", "Road to Funding Cohort", "Become a Partner", "Careers", "Other"] as const;

export const JOB_TYPES = [
  { id: "full_time", label: "Full-time" },
  { id: "part_time", label: "Part-time" },
  { id: "contract", label: "Contract" },
  { id: "internship", label: "Internship / Co-op" },
  { id: "volunteer", label: "Volunteer" },
  { id: "ambassador", label: "Ambassador" },
] as const;
export const jobTypeLabel = (id: string) => JOB_TYPES.find((j) => j.id === id)?.label ?? id;
export const DEPARTMENTS = ["Funding Advisory", "Grant Writing", "Business Development & Partnerships", "Marketing & Community", "Technology", "Operations"] as const;

export const TIMEZONE = "America/Vancouver";

/** Use-of-funds answers that surface a "Grow With Your Funding" service (§ services triggers). */
export const SERVICE_TRIGGERS: Record<string, "hiring" | "development" | "marketing"> = {
  hire_staff: "hiring",
  product_development: "development",
  marketing: "marketing",
};

/** Service-specific quote fields for the growth services. */
export const GROWTH_QUOTE_FIELDS = {
  hiring: {
    title: "Hiring Staff",
    intro: "Tell us who you need. We'll scope recruitment support and check which wage subsidies could cover part of the cost.",
    fields: [
      { key: "roles", label: "Roles you want to hire", kind: "text", required: true },
      { key: "headcount", label: "How many people?", kind: "number" },
      { key: "employment_type", label: "Employment type", kind: "select", options: ["Full-time", "Part-time", "Contract", "Co-op / Intern", "Mixed"] },
      { key: "wage_subsidy", label: "Interested in wage subsidies?", kind: "select", options: ["Yes", "No", "Not sure"] },
    ],
  },
  development: {
    title: "Development",
    intro: "Describe what you want to build. We'll come back with scope options and a quote.",
    fields: [
      { key: "project_type", label: "Project type", kind: "select", options: ["Website", "Web app", "Mobile app", "CRM / ERP", "E-commerce", "AI & automation", "Integrations", "Cloud / infrastructure"], required: true },
      { key: "has_design", label: "Do you have designs or specs?", kind: "select", options: ["Yes", "Partly", "No"] },
    ],
  },
  marketing: {
    title: "Sales & Marketing",
    intro: "Tell us your goal and market. We'll propose channels and a plan.",
    fields: [
      { key: "goal", label: "Main goal", kind: "select", options: ["Leads", "Online sales", "Brand awareness", "Export market entry", "Retention"], required: true },
      { key: "channels", label: "Channels of interest", kind: "text" },
      { key: "markets", label: "Target markets", kind: "text" },
    ],
  },
} as const;
export type GrowthKind = keyof typeof GROWTH_QUOTE_FIELDS;
export const QUOTE_TIMELINES = ["ASAP", "1–3 months", "3–6 months", "Flexible"] as const;
export const QUOTE_BUDGETS = ["Under $5,000", "$5,000–$15,000", "$15,000–$50,000", "$50,000+", "Not sure yet"] as const;
