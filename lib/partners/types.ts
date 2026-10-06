export type PartnerIntro = {
  match_id: string; status: "approved" | "mutual"; score: number; reasons: string[] | null; approved_at: string; expires_at: string | null;
  business_opt_in: boolean | null; partner_opt_in: boolean | null;
  industry: string | null; province: string | null; stage: string | null; amount_sought: number | null; use_of_funds: string[]; readiness_score: number;
  one_liner: string | null; business_name: string | null; business_slug: string | null; website: string | null;
  contact_name: string | null; contact_email: string | null; contact_phone: string | null;
};

export type DealFlowItem = {
  opportunity_ref: string; industry: string | null; province: string | null; stage: string | null; amount_sought: number | null;
  use_of_funds: string[]; readiness_score: number; one_liner: string | null; listed_at: string; interest_status: string | null;
};
