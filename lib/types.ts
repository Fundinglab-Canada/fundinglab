// Row types for the tables the app reads. Regenerate full types with `npm run db:types` when the schema changes.

export type Profile = {
  id: string;
  role: "business" | "partner" | "admin";
  full_name: string | null;
  email: string | null;
  phone: string | null;
  sms_opt_in: boolean;
  onboarded: boolean;
  marketing_opt_in: boolean;
};

export type Business = {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  legal_name: string | null;
  website: string | null;
  business_number: string | null;
  years_in_business: number | null;
  industry: string | null;
  province: string | null;
  city: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  annual_revenue: number | null;
  stage: string | null;
  amount_sought: number | null;
  timeline: string | null;
  use_of_funds: string[];
  hire_roles: string | null;
  use_of_funds_other: string | null;
  profile_step: number;
  readiness_score: number;
  visibility: "private" | "link" | "partners";
  consent_matching: boolean;
  consent_sharing: boolean;
  created_at: string;
  legal_structure: string | null;
  incorporation_province: string | null;
  naics_code: string | null;
  employees: number | null;
  revenue_band: string | null;
  ownership_tags: string[];
  description: string | null;
  logo_path: string | null;
  funding_preference: "dilutive" | "non_dilutive" | "either" | null;
  revenue_12m: number | null;
  growth_rate_pct: number | null;
  customers: number | null;
  key_metrics: { label: string; value: string }[];
  team: { name: string; role: string }[];
  profile_completeness: number;
};

export type FundingHistoryRow = {
  id: string;
  business_id: string;
  source: string;
  loan_subtype: string | null;
  amount: number;
  year: number | null;
  program_name: string | null;
  department: string | null;
  grant_owner_org: string | null;
  grant_ref: string | null;
  auto_found: boolean;
  status: "received" | "active" | "repaid" | "closed";
  provider_name: string | null;
};

export type DocumentRow = {
  id: string;
  business_id: string;
  kind: "pitch_deck" | "financials" | "business_plan" | "tax_returns" | "cap_table" | "incorporation" | "other";
  storage_path: string;
  file_name: string;
  size_bytes: number | null;
  created_at: string;
};

export type PartnerRow = {
  id: string;
  user_id: string | null;
  type: string;
  status: "pending" | "active" | "declined" | "suspended";
  display_name: string;
  company: string | null;
  contact_person: string | null;
  contact_email: string | null;
  location: string | null;
  bio: string | null;
  linkedin_url: string | null;
  details: Record<string, unknown>;
  membership_tier: string;
  success_fee_rate: number | null;
  created_at: string;
  partner_criteria: PartnerCriteriaRow | null;
};

export type PartnerCriteriaRow = {
  partner_id: string;
  stages: string[];
  industries: string[];
  provinces: string[];
  min_amount: number | null;
  max_amount: number | null;
  uses_of_funds: string[];
};

export type DealRow = {
  id: string;
  match_id: string | null;
  business_id: string;
  partner_id: string;
  deal_type: string;
  status: import("./constants").DealStatus;
  position: number;
  expected_amount: number | null;
  funded_amount: number | null;
  commission_rate: number;
  commission_amount: number;
  businesses: { name: string } | null;
  partners: { display_name: string } | null;
};

export type Introduction = {
  match_id: string;
  status: "approved" | "mutual";
  approved_at: string;
  expires_at: string | null;
  business_opt_in: boolean | null;
  partner_opt_in: boolean | null;
  score: number | null;
  reasons: string[] | null;
  partner_type: string;
  partner_name: string | null;
  partner_company: string | null;
  partner_location: string | null;
  partner_bio: string | null;
  partner_photo: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  linkedin_url: string | null;
};
