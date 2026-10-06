// Real-time search of the Government of Canada grants and contributions search (search.open.canada.ca/grants).
// The site has no JSON API, so we read its public results page, 10 records per page, sorted by best match.
// Used for live company-name suggestions on profile step 1, and as a fallback when the local mirror is empty.

import type { Grant } from "./classify";
import { normalizeName } from "./normalize";

const SEARCH_URL = "https://search.open.canada.ca/grants/";

export type LiveRecord = Grant & { recipient: string; location: string | null; recipientType: string | null };
export type LiveSuggestion = { name: string; count: number; total: number; location: string | null };

const strip = (html: string) =>
  html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;|’/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

const field = (block: string, label: string) => {
  const m = block.match(new RegExp(`<strong>${label}:</strong>\\s*([\\s\\S]*?)</div>`));
  return m ? strip(m[1]) || null : null;
};

/** Parses one results page into records. Exported for tests. */
export function parseResults(html: string): LiveRecord[] {
  const blocks = html.split('<div class="row mrgn-bttm-xl mrgn-lft-md">').slice(1);
  const out: LiveRecord[] = [];
  for (const block of blocks) {
    const link = block.match(/<a href="\/grants\/record\/([^"]+)">([\s\S]*?)<\/a>/);
    if (!link) continue;
    const [ownerOrg = "", ref = ""] = decodeURIComponent(link[1]).split(",");
    const amount = block.match(/<h4[^>]*>\s*\$([\d,]+(?:\.\d+)?)\s*<\/h4>/);
    const date = block.match(/<h5[^>]*>\s*([A-Z][a-z]{2} \d{1,2}, \d{4})\s*<\/h5>/);
    const parsedDate = date ? new Date(`${date[1]} 12:00 UTC`) : null;
    const type = block.match(/<div class="col-sm-12 mrgn-bttm-0"><p>([^<]*)<\/p>/);
    out.push({
      recipient: strip(link[2]),
      ownerOrg,
      ref,
      program: field(block, "Program Name") ?? field(block, "Agreement") ?? "Federal agreement",
      department: field(block, "Organization") ?? ownerOrg,
      amount: amount ? Number(amount[1].replace(/,/g, "")) : 0,
      date: parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.toISOString().slice(0, 10) : null,
      // The agreement title is sometimes just the agreement number; hide it then.
      description: field(block, "Program Name") && !/^[\d\s-]+$/.test(field(block, "Agreement") ?? "") ? field(block, "Agreement") : null,
      agreementType: null,
      location: field(block, "Location"),
      recipientType: type ? strip(type[1]) : null,
    });
  }
  return out;
}

/** Records about individuals (scholarships, "Surname, First (Employer)") are never shown, matching the local mirror. */
export function isIndividual(r: Pick<LiveRecord, "recipient" | "recipientType">): boolean {
  if (r.recipientType && /individual|sole proprietor/i.test(r.recipientType)) return true;
  return /^[^,()]+,\s*[^,()]+(\s*\(.*\))?$/.test(r.recipient);
}

async function fetchPage(query: string, page: number): Promise<LiveRecord[]> {
  const url = `${SEARCH_URL}?${new URLSearchParams({ search_text: query, sort: "score desc", page: String(page) })}`;
  const res = await fetch(url, { headers: { "User-Agent": "FundingLab/1.0 (+grant lookup)" }, signal: AbortSignal.timeout(5000), next: { revalidate: 86_400 } });
  if (!res.ok) return [];
  return parseResults(await res.text());
}

async function search(query: string, pages: number): Promise<LiveRecord[]> {
  const results = await Promise.all(Array.from({ length: pages }, (_, i) => fetchPage(query, i + 1).catch(() => [] as LiveRecord[])));
  return results.flat().filter((r) => !isIndividual(r));
}

/** True when every word typed is the start of a word in the recipient name ("north robo" → "Northwind Robotics"). */
export function nameMatches(query: string, recipient: string): boolean {
  const q = normalizeName(query).split(" ").filter(Boolean);
  const r = normalizeName(recipient).split(" ").filter(Boolean);
  return q.length > 0 && q.every((w) => r.some((x) => x.startsWith(w)));
}

/** Company names in the federal records that match what the user typed, with how much each received. */
export async function suggestRecipients(query: string, limit = 6): Promise<LiveSuggestion[]> {
  if (normalizeName(query).length < 3) return [];
  const records = (await search(query, 2)).filter((r) => nameMatches(query, r.recipient));
  const byName = new Map<string, LiveSuggestion>();
  for (const r of records) {
    const key = normalizeName(r.recipient);
    const s = byName.get(key) ?? { name: r.recipient, count: 0, total: 0, location: r.location };
    s.count += 1;
    s.total += r.amount;
    byName.set(key, s);
  }
  const q = normalizeName(query);
  return [...byName.values()]
    .sort((a, b) => Number(normalizeName(b.name) === q) - Number(normalizeName(a.name) === q) || b.total - a.total)
    .slice(0, limit);
}

/** All federal agreements for one recipient name (exact normalized match), newest first. */
export async function grantsForRecipient(name: string): Promise<Grant[]> {
  const key = normalizeName(name);
  if (!key) return [];
  const seen = new Set<string>();
  const grants: Grant[] = [];
  for (const r of await search(name, 3)) {
    const id = `${r.ownerOrg}:${r.ref}`;
    if (normalizeName(r.recipient) !== key || seen.has(id)) continue;
    seen.add(id);
    grants.push({ ownerOrg: r.ownerOrg, ref: r.ref, program: r.program, department: r.department, amount: r.amount, date: r.date, description: r.description, agreementType: r.agreementType });
  }
  return grants.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}
