import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessContext } from "@/lib/auth";
import { INDUSTRIES, PROVINCES } from "@/lib/constants";
import { dateShort, money } from "@/lib/format";
import { FREE_PROGRAM_LIMIT, hasFeature } from "@/lib/plans";
import { programDeadline, rankPrograms } from "@/lib/programs/match";
import type { ProgramRow } from "@/lib/programs/types";
import { BRAND } from "@/lib/constants";
import { UpgradeCard } from "@/components/app/upgrade-card";
import { IsedFinder } from "@/components/grants/ised-finder";
import { toggleAlert, toggleSaved } from "./actions";

export const metadata = { title: "Grant Intelligence" };

const TYPES = [
  ["grant", "Grant"], ["contribution", "Contribution"], ["repayable", "Repayable (interest-free)"], ["loan", "Loan"],
  ["tax_credit", "Tax credit"], ["wage_subsidy", "Wage subsidy"], ["equity", "Equity"],
] as const;
const typeLabel = (t: string) => TYPES.find(([id]) => id === t)?.[1] ?? t;

type SP = { q?: string; level?: string; province?: string; type?: string; industry?: string; open?: string; closing?: string; saved?: string };

export default async function GrantsIntelligencePage({ searchParams }: { searchParams: Promise<SP> }) {
  const { business, plan } = await requireBusinessContext("/app/grants");
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: programs }, { data: savedRows }] = await Promise.all([
    supabase.from("programs").select("*").eq("active", true).order("name"),
    supabase.from("saved_programs").select("program_id, alert_enabled").eq("business_id", business.id),
  ]);
  const saved = new Map((savedRows ?? []).map((s) => [s.program_id as string, s.alert_enabled as boolean]));
  const now = new Date();
  const q = (sp.q ?? "").trim().toLowerCase();

  const filtered = ((programs ?? []) as ProgramRow[]).filter((p) => {
    const deadline = programDeadline(p);
    if (q && !`${p.name} ${p.funder} ${p.summary ?? ""}`.toLowerCase().includes(q)) return false;
    if (sp.level && p.level !== sp.level) return false;
    if (sp.province && p.province && p.province !== sp.province) return false;
    if (sp.type && p.type !== sp.type) return false;
    if (sp.industry && p.industries.length && !p.industries.includes(sp.industry)) return false;
    if (sp.open && deadline && deadline < now && !p.rolling) return false;
    if (sp.closing && !(deadline && deadline > now && deadline.getTime() - now.getTime() <= 30 * 864e5)) return false;
    if (sp.saved && !saved.has(p.id)) return false;
    return true;
  });
  const ranked = rankPrograms(filtered, business, now);
  const full = hasFeature(plan, "full_matcher");
  const shown = full ? ranked : ranked.slice(0, FREE_PROGRAM_LIMIT);
  const alertsOn = hasFeature(plan, "program_alerts");
  const anyFilter = Object.values(sp).some(Boolean);

  return (
    <section className="container flex flex-col gap-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Grant Intelligence</span>
          <h1 className="mt-1 text-3xl font-bold">Programs matched to {business.name}</h1>
          <p className="max-w-measure text-subtle">Scored against your province, stage, industry, funding need, use of funds and ownership. Save a program to get deadline alerts 30, 14 and 3 days before it closes.</p>
        </div>
        <Link href="/app/profile?step=1" className="btn-secondary btn-sm">Improve my matches</Link>
      </div>

      <form className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="search">
        <label className="field lg:col-span-2">Search<input name="q" defaultValue={sp.q} className="input" placeholder="Program, funder or keyword" /></label>
        <label className="field">Level<select name="level" defaultValue={sp.level ?? ""} className="input"><option value="">All</option><option value="federal">Federal</option><option value="provincial">Provincial</option><option value="regional">Regional</option><option value="municipal">Municipal</option></select></label>
        <label className="field">Province<select name="province" defaultValue={sp.province ?? ""} className="input"><option value="">All</option>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="field">Type<select name="type" defaultValue={sp.type ?? ""} className="input"><option value="">All</option>{TYPES.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></label>
        <label className="field">Industry<select name="industry" defaultValue={sp.industry ?? ""} className="input"><option value="">All</option>{INDUSTRIES.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}</select></label>
        <fieldset className="flex flex-wrap items-end gap-4 text-sm lg:col-span-2">
          <label className="flex items-center gap-2"><input type="checkbox" name="open" value="1" defaultChecked={!!sp.open} /> Open now</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="closing" value="1" defaultChecked={!!sp.closing} /> Closing in 30 days</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="saved" value="1" defaultChecked={!!sp.saved} /> Saved only</label>
        </fieldset>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
          <button className="btn-primary btn-sm">Apply filters</button>
          {anyFilter && <Link href="/app/grants" className="btn-ghost btn-sm">Clear</Link>}
          <span className="ml-auto text-sm text-subtle"><b className="num text-ink">{ranked.length}</b> program{ranked.length === 1 ? "" : "s"}</span>
        </div>
      </form>

      <div className="flex flex-col gap-3">
        {shown.length === 0 && <p className="card text-subtle">No programs match these filters.</p>}
        {shown.map(({ program: p, match }) => {
          const deadline = programDeadline(p);
          const isSaved = saved.has(p.id);
          const back = "/app/grants";
          return (
            <article key={p.id} className={`card flex flex-col gap-3 ${match.blocked ? "opacity-75" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="pill">{p.level === "federal" ? "Federal" : p.province ? `${p.province} · ${p.level}` : p.level}</span>
                    <span className="pill">{typeLabel(p.type)}</span>
                    {p.is_sample && <span className="pill-warning">Sample data — verify before launch</span>}
                    {match.closed && <span className="pill-danger">Intake closed</span>}
                  </div>
                  <Link href={`/app/grants/${p.slug}`} className="mt-1.5 block text-lg font-bold text-ink hover:underline">{p.name}</Link>
                  <span className="text-sm text-subtle">{p.funder}{p.max_amount ? ` · up to ${money(p.max_amount, true)}` : ""}{p.cost_share_pct ? ` · ${Number(p.cost_share_pct)}% cost share` : ""}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`num text-3xl font-extrabold ${match.blocked ? "text-subtle" : match.score >= 70 ? "text-brand-text" : "text-ink"}`}>{match.score}</span>
                  <span className="text-xs text-subtle">{match.blocked ? "likely not eligible" : "match score"}</span>
                </div>
              </div>
              {p.summary && <p className="text-sm text-body">{p.summary}</p>}
              <div className="grid gap-3 md:grid-cols-2">
                {match.why.length > 0 && <div><b className="text-sm text-ink">Why you match</b><ul className="mt-1 flex flex-col gap-0.5 text-sm">{match.why.map((w) => <li key={w} className="flex gap-2"><span className="text-brand-text">✓</span>{w}</li>)}</ul></div>}
                {match.risks.length > 0 && <div><b className="text-sm text-ink">What might disqualify you</b><ul className="mt-1 flex flex-col gap-0.5 text-sm">{match.risks.map((w) => <li key={w} className="flex gap-2"><span className="text-warning">!</span>{w}</li>)}</ul></div>}
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3 text-sm">
                <span className="text-subtle">{deadline ? `Closes ${dateShort(deadline)}` : p.rolling ? "Continuous intake" : "No deadline posted"} · Last verified {p.last_verified_at ? dateShort(p.last_verified_at) : "—"}</span>
                <span className="ml-auto flex flex-wrap gap-2">
                  <form action={toggleSaved}><input type="hidden" name="program_id" value={p.id} /><input type="hidden" name="saved" value={isSaved ? "1" : "0"} /><input type="hidden" name="back" value={back} />
                    <button className="btn-secondary btn-sm">{isSaved ? "Saved ✓" : "Save"}</button></form>
                  {isSaved && deadline && !match.closed && (
                    <form action={toggleAlert}><input type="hidden" name="program_id" value={p.id} /><input type="hidden" name="on" value={saved.get(p.id) ? "0" : "1"} /><input type="hidden" name="back" value={back} />
                      <button className="btn-ghost btn-sm" title={alertsOn ? undefined : "Deadline alerts are part of Starter"}>{saved.get(p.id) ? "Alerts on · turn off" : "Turn on deadline alerts"}</button></form>
                  )}
                  <Link href={`/app/grants/${p.slug}`} className="btn-primary btn-sm">Details</Link>
                </span>
              </div>
            </article>
          );
        })}
        {!full && ranked.length > shown.length && (
          <UpgradeCard feature="full_matcher" title={`See all ${ranked.length} matched programs`}>
            The Free plan shows your top {FREE_PROGRAM_LIMIT}. Starter unlocks the full matcher, deadline alerts and the Application Center.
          </UpgradeCard>
        )}
        <p className="text-[13px] text-subtle">{BRAND.disclaimer}</p>
      </div>

      <div className="card"><IsedFinder compact /></div>
    </section>
  );
}
