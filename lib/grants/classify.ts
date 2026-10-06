// Turns fl_grant_lookup() rows into what the UI shows.
// Rule from the spec: show results only on a confident match — exact normalized name (or business number),
// or similarity >= 0.90 with the same city AND province. Otherwise offer "Possible matches — is this you?".
// If nothing plausible comes back, show nothing at all.

export type GrantLookupRow = {
  owner_org: string;
  ref_number: string;
  recipient_legal_name: string;
  recipient_operating_name: string | null;
  recipient_city: string | null;
  recipient_province: string | null;
  prog_name_en: string | null;
  owner_org_title: string | null;
  agreement_type: string | null;
  agreement_value: number | string | null;
  agreement_start_date: string | null;
  description_en: string | null;
  amendment_number: number | null;
  legal_norm: string;
  score: number;
  match_kind: "exact" | "business_number" | "fuzzy";
  same_province: boolean;
  same_city: boolean;
};

export type Grant = {
  ownerOrg: string;
  ref: string;
  program: string;
  department: string;
  amount: number;
  date: string | null;
  description: string | null;
  agreementType: string | null;
};

export type Candidate = { entity: string; legalName: string; city: string | null; province: string | null; score: number };

export type LookupResult =
  | { state: "match"; entity: string; legalName: string; grants: Grant[]; total: number }
  | { state: "possible"; candidates: Candidate[] }
  | { state: "none" };

export const CONFIDENT_SIMILARITY = 0.9;
export const POSSIBLE_SIMILARITY = 0.55;

export function toGrant(r: GrantLookupRow): Grant {
  return {
    ownerOrg: r.owner_org,
    ref: r.ref_number,
    program: r.prog_name_en ?? "Unnamed program",
    department: r.owner_org_title ?? r.owner_org,
    amount: Number(r.agreement_value ?? 0),
    date: r.agreement_start_date,
    description: r.description_en,
    agreementType: r.agreement_type,
  };
}

export function grantsForEntity(rows: GrantLookupRow[], entity: string): Grant[] {
  return rows
    .filter((r) => r.legal_norm === entity)
    .map(toGrant)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export function classifyLookup(rows: GrantLookupRow[], rejected: string[] = []): LookupResult {
  const usable = rows.filter((r) => !rejected.includes(r.legal_norm));
  if (!usable.length) return { state: "none" };

  // Group agreement rows into recipient entities by normalized legal name.
  const entities = new Map<string, { best: GrantLookupRow; rows: GrantLookupRow[] }>();
  for (const r of usable) {
    const e = entities.get(r.legal_norm);
    if (!e) entities.set(r.legal_norm, { best: r, rows: [r] });
    else {
      e.rows.push(r);
      if (r.score > e.best.score) e.best = r;
    }
  }

  const confident = [...entities.values()].filter(({ best }) =>
    best.match_kind === "exact" ||
    best.match_kind === "business_number" ||
    (best.score >= CONFIDENT_SIMILARITY && best.same_city && best.same_province),
  );

  // Exactly one confident entity: show it. Two or more (e.g. same name in two provinces): ask.
  if (confident.length === 1) {
    const { best, rows: entityRows } = confident[0];
    const grants = entityRows.map(toGrant).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    return {
      state: "match",
      entity: best.legal_norm,
      legalName: best.recipient_legal_name,
      grants,
      total: grants.reduce((s, g) => s + g.amount, 0),
    };
  }

  const candidates = [...entities.values()]
    .filter(({ best }) => best.score >= POSSIBLE_SIMILARITY)
    .sort((a, b) => b.best.score - a.best.score || Number(b.best.same_province) - Number(a.best.same_province))
    .slice(0, 3)
    .map(({ best }) => ({
      entity: best.legal_norm,
      legalName: best.recipient_legal_name,
      city: best.recipient_city,
      province: best.recipient_province,
      score: Math.round(best.score * 100) / 100,
    }));

  return candidates.length ? { state: "possible", candidates } : { state: "none" };
}
