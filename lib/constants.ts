// Single source of truth for product vocabulary. Ids match the Postgres enums in supabase/migrations.

export const BRAND = {
  name: "Funding Lab",
  tagline: "Every funding path. One place.",
  contactLine: "Pankaj Bagga · Funding Lab · +1 604 360 7088",
  disclaimer:
    "Funding Lab is not a registered securities dealer and does not offer or sell securities. Introductions only.",
  grantSourceNote: "Source: Government of Canada Open Data (federal only).",
  featuredPartners: ["LaunchBC Fund", "TiE Angels", "GrowthX Capital", "Thiara Advisory"],
} as const;

export const CONSENT = {
  matching:
    "I consent to Funding Lab using my profile to match me with vetted funding partners and service experts.",
  sharing: "I consent to Funding Lab sharing my investor snapshot with partners I approve.",
} as const;

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
  { id: "crowdfunding", name: "Crowdfunding", icon: "trending-up", stages: ["idea", "preseed", "seed"], range: "$10K – $1.5M",
    who: "Consumer-facing products with a community ready to back them. Equity, reward or debt models." },
  { id: "angel", name: "Angel Investment", icon: "star", stages: ["preseed", "seed"], range: "$25K – $500K",
    who: "Founders with an MVP and early traction who want smart money and mentorship alongside capital." },
  { id: "venture_capital", name: "Venture Capital", icon: "bar-chart", stages: ["seed", "growth", "expansion"], range: "$500K – $20M+",
    who: "Scalable companies with a large market and the ambition to grow 3–10× in a few years." },
  { id: "private_equity", name: "Private Equity", icon: "briefcase", stages: ["expansion", "exit"], range: "$2M – $100M+",
    who: "Profitable, established companies looking for growth capital, recapitalization or ownership transition." },
  { id: "grants", name: "Grants", icon: "landmark", stages: ["idea", "preseed", "seed", "growth", "expansion"], range: "$5K – $1M+",
    who: "Non-dilutive federal and provincial programs for R&D, hiring, export and innovation (IRAP, SR&ED, CanExport, wage subsidies)." },
  { id: "loans", name: "Business Loans", icon: "building", stages: ["growth", "expansion", "exit"], range: "$25K – $5M",
    who: "Businesses with revenue or assets: term loans, CSBFP, equipment, bridge, receivables financing and lines of credit." },
  { id: "ipo", name: "IPO / Acquisition", icon: "check-circle", stages: ["exit"], range: "$10M+",
    who: "Mature companies preparing for a public listing (TSXV, CSE) or a strategic sale." },
] as const;

export const INDUSTRIES = [
  { id: "advanced_manufacturing", label: "Advanced Manufacturing" },
  { id: "agrifood", label: "AgriFood" },
  { id: "cleantech", label: "Clean Technology" },
  { id: "consumer", label: "Consumer Products" },
  { id: "digital_media", label: "Digital Media" },
  { id: "education", label: "Education" },
  { id: "fintech", label: "Fintech" },
  { id: "health", label: "Healthtech & Life Sciences" },
  { id: "hospitality", label: "Hospitality" },
  { id: "software", label: "Information Technology / SaaS" },
  { id: "professional_services", label: "Professional Services" },
  { id: "retail", label: "Retail & E-commerce" },
] as const;
export const industryLabel = (id: string | null | undefined) => INDUSTRIES.find((i) => i.id === id)?.label ?? "—";

export const PROVINCES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"] as const;

export const USES_OF_FUNDS = [
  { id: "product_development", label: "Product Development" },
  { id: "marketing", label: "Marketing" },
  { id: "hire_staff", label: "Hire Staff" },
  { id: "rd", label: "R&D" },
  { id: "ip_patent", label: "IP / Patent Filing" },
  { id: "inventory_equipment", label: "Inventory or Equipment" },
  { id: "partner_buyout", label: "Partner Buyout" },
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
] as const;
export type PartnerTypeId = (typeof PARTNER_TYPES)[number]["id"];
export const partnerTypeLabel = (id: string) => PARTNER_TYPES.find((p) => p.id === id)?.label ?? id;

export const DEAL_STATUSES = [
  { id: "new", label: "New" },
  { id: "introduced", label: "Introduced" },
  { id: "in_discussion", label: "In Discussion" },
  { id: "term_sheet", label: "Term Sheet / Approved" },
  { id: "funded", label: "Funded" },
  { id: "closed_lost", label: "Closed Lost" },
] as const;
export type DealStatus = (typeof DEAL_STATUSES)[number]["id"];

// Prices in CAD cents. "from" prices: checkout charges the deposit; final scope is quoted.
export const SERVICES = [
  { kind: "data_room", name: "Data Room", priceCents: 150000, priceLabel: "from $1,500",
    desc: "Investor-ready virtual data room: cap table, financials, contracts, IP and a diligence checklist, organized the way VCs and lenders expect." },
  { kind: "business_plan", name: "Business Plan", priceCents: 350000, priceLabel: "from $3,500",
    desc: "Lender- and investor-grade business plan with 3-year projections, market sizing and a use-of-funds narrative." },
  { kind: "grant_writing", name: "Grant Writing", priceCents: 250000, priceLabel: "from $2,500 + success fee",
    desc: "Program selection and full application drafting for IRAP, CanExport, regional development agencies, provincial programs and wage subsidies." },
  { kind: "loan_consulting", name: "Loan Consulting", priceCents: 120000, priceLabel: "from $1,200",
    desc: "Lender matching and loan package preparation for CSBFP, BDC, credit unions and alternative lenders." },
] as const;
export type ServiceKind = (typeof SERVICES)[number]["kind"];

export const PARTNER_TIERS = [
  { id: "pro", name: "Partner Pro", priceEnv: "STRIPE_PRICE_PARTNER_PRO" },
  { id: "premier", name: "Partner Premier", priceEnv: "STRIPE_PRICE_PARTNER_PREMIER" },
] as const;
