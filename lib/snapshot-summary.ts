// Plain-language executive summary for the investor snapshot, written from the profile data (no AI, no guesses).
import { industryLabel, sourceLabel, stageName, useLabel } from "@/lib/constants";
import { money } from "@/lib/format";
import type { SnapshotData } from "@/components/snapshot";

const list = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);
const article = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");

export function industryText(industry: string | null | undefined, other?: string | null) {
  return industry === "other" && other ? other : industryLabel(industry);
}

/** Returns 2–4 short paragraphs. Sentences are skipped when the data behind them is missing. */
export function snapshotSummary(s: SnapshotData): string[] {
  const industry = industryText(s.industry, s.industry_other);
  const stage = stageName(s.stage);
  const place = [s.city, s.province].filter(Boolean).join(", ");
  const years = s.years_in_business != null ? `, operating for ${s.years_in_business} year${s.years_in_business === 1 ? "" : "s"}` : "";

  const kind = `${s.stage ? `${stage}-stage ` : ""}${industry === "—" ? "" : `${industry} `}business`;
  const who = `${s.name} is ${article(kind)} ${kind}${place ? ` based in ${place}` : ""}${years}.`;

  const traction: string[] = [];
  const revenue = s.revenue_12m ?? s.annual_revenue;
  if (revenue) traction.push(`${money(revenue)} in revenue over the last 12 months`);
  if (s.growth_rate_pct != null) traction.push(`${s.growth_rate_pct}% year-over-year growth`);
  if (s.customers) traction.push(`${s.customers.toLocaleString("en-CA")} paying customers`);
  if (s.employees) traction.push(`a team of ${s.employees}`);
  // Only state what the owner entered: blank revenue means "not provided", not "pre-revenue".
  const tractionLine = traction.length ? `The business reports ${list(traction)}.` : "";

  const raised = s.funding_history.reduce((t, h) => t + Number(h.amount), 0);
  const sources = [...new Set(s.funding_history.map((h) => (h.program_name ? h.program_name : sourceLabel(h.source))))].slice(0, 3);
  const historyLine = raised
    ? `It has raised ${money(raised)} to date${sources.length ? `, including ${list(sources)}` : ""}.`
    : "It has not raised outside funding yet.";

  const uses = s.use_of_funds.map(useLabel);
  const ask = s.amount_sought
    ? `${s.name} is seeking ${money(s.amount_sought)}${s.timeline ? ` within ${s.timeline.toLowerCase()}` : ""}${uses.length ? ` to fund ${list(uses.map((u) => u.toLowerCase()))}` : ""}.`
    : uses.length ? `Planned use of funds: ${list(uses.map((u) => u.toLowerCase()))}.` : "";

  const ready = `Funding readiness score: ${s.readiness_score}/100${s.documents.length ? `, with ${list(s.documents.map((d) => d.replace(/_/g, " ")))} available on request` : ""}.`;

  return [who + (s.description ? ` ${s.description.split(/(?<=\.)\s/)[0]}` : ""), `${tractionLine} ${historyLine}`.trim(), ask, ready].filter(Boolean);
}
