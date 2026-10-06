// Mirrors public.fl_normalize_name() in supabase/migrations/20261005000002_grant_mirror.sql.
// Keep the two in sync; normalize.test.ts pins the shared behaviour.

const SUFFIXES = /\b(inc|incorporated|ltd|limited|ltee|corp|corporation|co|company|llc|lp|llp|ulc|enterprises?)\b/g;

export function normalizeName(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(SUFFIXES, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** pg_trgm-compatible trigram similarity, used in tests and for client-side previews. */
export function trigramSimilarity(a: string, b: string): number {
  const grams = (s: string) => {
    const set = new Set<string>();
    for (const word of s.split(" ").filter(Boolean)) {
      const padded = `  ${word} `;
      for (let i = 0; i < padded.length - 2; i++) set.add(padded.slice(i, i + 3));
    }
    return set;
  };
  const A = grams(normalizeName(a));
  const B = grams(normalizeName(b));
  if (!A.size || !B.size) return 0;
  let shared = 0;
  for (const g of A) if (B.has(g)) shared++;
  return shared / (A.size + B.size - shared);
}
