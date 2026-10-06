// Shape of programs.content (jsonb) for featured grant pages (§4G). Admins edit these blocks in /admin/programs;
// the page template renders whichever blocks are present, so new featured grants need no code.

export type ProgramContent = {
  oneMinute?: { title: string; body: string }[];
  heroStats?: { value: string; label: string }[];
  keyNumbers?: { value: string; label: string }[];
  whyItMatters?: { intro: string; bars: { label: string; value: number; display: string }[]; note: string; facts?: string[] };
  streams?: { name: string; tag: string; amount: string; body: string; bullets?: string[] }[];
  streamsNotes?: string[];
  qualifies?: { heading: string; tone: "yes" | "no" | "info"; items: string[] }[];
  partnerPath?: { title: string; steps: string[]; conditions: string[] };
  locationCheck?: string;
  sectors?: { title: string; chips: string[]; note?: string };
  fits?: { good: string[]; notFunded: string[]; rule: string };
  pivotExamples?: string[];
  calculatorNotes?: string[];
  proof?: { counts: string[]; doesntCount: string[] };
  eligibleCosts?: { cost: string; covered: boolean; note?: string }[];
  howToWin?: { title: string; body: string }[];
  howToWinNote?: string;
  keyDates?: { date: string; label: string; body?: string }[];
  keyDatesCallout?: string;
  docChecklist?: { group: string; items: string[] }[];
  docNote?: string;
  quickCheck?: {
    intro: string;
    items: { id: string; label: string }[];
    bands: { min: number; max: number; title: string; body: string; tone: "strong" | "fixable" | "weak" }[];
  };
  nextSteps?: string[];
  nextStepsCallout?: string;
  officialLinks?: { label: string; url: string }[];
};

export type ProgramRow = {
  id: string;
  slug: string;
  name: string;
  funder: string;
  level: string;
  province: string | null;
  type: string;
  summary: string | null;
  industries: string[];
  stages: string[];
  min_amount: number | null;
  max_amount: number | null;
  cost_share_pct: number | null;
  intake_close: string | null;
  rolling: boolean;
  official_url: string | null;
  last_verified_at: string | null;
  is_sample: boolean;
  is_featured: boolean;
  featured_order: number | null;
  badge: string | null;
  headline: string | null;
  subheadline: string | null;
  status_text: string | null;
  close_at: string | null;
  calculator: "redip" | "rtri" | null;
  content: ProgramContent;
  official_contact: string | null;
  disclaimer: string | null;
  guide_pdf_path: string | null;
};
