import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessContext } from "@/lib/auth";
import { stageName, industryLabel } from "@/lib/constants";
import { dateShort, money } from "@/lib/format";
import { hasFeature } from "@/lib/plans";
import { matchProgram, programDeadline } from "@/lib/programs/match";
import { needsReverification } from "@/lib/programs/queries";
import type { ProgramRow } from "@/lib/programs/types";
import { startApplication, toggleAlert, toggleSaved } from "../actions";

export const metadata = { title: "Program detail" };

export default async function ProgramDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { business, plan } = await requireBusinessContext(`/app/grants/${slug}`);
  const supabase = await createClient();
  const { data } = await supabase.from("programs").select("*").eq("slug", slug).eq("active", true).maybeSingle();
  if (!data) notFound();
  const p = data as ProgramRow;
  const [{ data: savedRow }, { data: app }] = await Promise.all([
    supabase.from("saved_programs").select("alert_enabled").eq("business_id", business.id).eq("program_id", p.id).maybeSingle(),
    supabase.from("applications").select("id, status").eq("business_id", business.id).eq("program_id", p.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const match = matchProgram(p, business);
  const deadline = programDeadline(p);
  const back = `/app/grants/${p.slug}`;
  const canApply = hasFeature(plan, "applications");

  return (
    <section className="container flex max-w-4xl flex-col gap-6 py-10">
      <Link href="/app/grants" className="text-sm text-subtle hover:underline">← All matched programs</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            <span className="pill">{p.level === "federal" ? "Federal" : `${p.province ?? ""} ${p.level}`.trim()}</span>
            {p.is_sample && <span className="pill-warning">Sample data — verify before launch</span>}
            {needsReverification(p.last_verified_at) && !p.is_sample && <span className="pill-warning">Re-verification due</span>}
          </div>
          <h1 className="mt-2 text-3xl font-bold">{p.name}</h1>
          <p className="text-subtle">{p.funder} · Last verified {p.last_verified_at ? dateShort(p.last_verified_at) : "—"}</p>
        </div>
        <div className="text-right"><span className="num text-4xl font-extrabold text-ink">{match.score}</span><span className="block text-xs text-subtle">match score</span></div>
      </div>

      {p.summary && <p className="text-lg text-body">{p.summary}</p>}

      <dl className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-md bg-muted p-3"><dt className="text-xs font-semibold uppercase tracking-wider text-subtle">Amount</dt><dd className="num font-bold text-ink">{p.max_amount ? `${p.min_amount ? `${money(p.min_amount, true)} – ` : "Up to "}${money(p.max_amount, true)}` : "Varies"}</dd></div>
        <div className="rounded-md bg-muted p-3"><dt className="text-xs font-semibold uppercase tracking-wider text-subtle">Cost share</dt><dd className="num font-bold text-ink">{p.cost_share_pct ? `${Number(p.cost_share_pct)}%` : "Varies"}</dd></div>
        <div className="rounded-md bg-muted p-3"><dt className="text-xs font-semibold uppercase tracking-wider text-subtle">Intake</dt><dd className="font-bold text-ink">{deadline ? `${match.closed ? "Closed" : "Closes"} ${dateShort(deadline)}` : p.rolling ? "Continuous" : "Not posted"}</dd></div>
        <div className="rounded-md bg-muted p-3"><dt className="text-xs font-semibold uppercase tracking-wider text-subtle">Stacking limit</dt><dd className="num font-bold text-ink">{p.stacking_limit_pct ? `${Number(p.stacking_limit_pct)}%` : "Check program"}</dd></div>
      </dl>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="text-lg font-bold">Why you match</h2>
          {match.why.length ? <ul className="mt-2 flex flex-col gap-1 text-sm">{match.why.map((w) => <li key={w} className="flex gap-2"><span className="text-brand-text">✓</span>{w}</li>)}</ul> : <p className="mt-2 text-sm text-subtle">Complete your profile to see how you fit.</p>}
        </div>
        <div className="card">
          <h2 className="text-lg font-bold">What might disqualify you</h2>
          {match.risks.length ? <ul className="mt-2 flex flex-col gap-1 text-sm">{match.risks.map((w) => <li key={w} className="flex gap-2"><span className="text-warning">!</span>{w}</li>)}</ul> : <p className="mt-2 text-sm text-subtle">Nothing flagged from your profile.</p>}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="text-lg font-bold">Eligible expenses</h2>
          {p.eligible_expenses?.length ? <ul className="mt-2 list-disc pl-5 text-sm">{p.eligible_expenses.map((e) => <li key={e}>{e}</li>)}</ul> : <p className="mt-2 text-sm text-subtle">See the official program page.</p>}
          {(p.stages.length > 0 || p.industries.length > 0) && (
            <p className="mt-3 text-[13px] text-subtle">
              {p.stages.length > 0 && <>Stages: {p.stages.map(stageName).join(", ")}. </>}
              {p.industries.length > 0 && <>Industries: {p.industries.map(industryLabel).join(", ")}.</>}
            </p>
          )}
        </div>
        <div className="card">
          <h2 className="text-lg font-bold">Documents you&apos;ll need</h2>
          {p.required_docs?.length ? <ul className="mt-2 list-disc pl-5 text-sm">{p.required_docs.map((e) => <li key={e}>{e}</li>)}</ul> : <p className="mt-2 text-sm text-subtle">The program will confirm its document list. Starting an application builds a standard checklist.</p>}
          <Link href="/app/prep/data-room" className="mt-3 inline-block text-sm font-semibold text-brand-text underline">Organize them in your data room</Link>
        </div>
      </div>

      <div className="card flex flex-wrap items-center gap-3">
        {app ? (
          <Link href={`/app/applications/${app.id}`} className="btn-primary">Open your application</Link>
        ) : canApply ? (
          <form action={startApplication}><input type="hidden" name="program_id" value={p.id} /><button className="btn-primary" disabled={match.closed}>Start application</button></form>
        ) : (
          <Link href="/pricing?plan=starter" className="btn-primary">Start application (Starter)</Link>
        )}
        <form action={toggleSaved}><input type="hidden" name="program_id" value={p.id} /><input type="hidden" name="saved" value={savedRow ? "1" : "0"} /><input type="hidden" name="back" value={back} />
          <button className="btn-secondary">{savedRow ? "Saved ✓" : "Save program"}</button></form>
        {savedRow && deadline && !match.closed && (
          <form action={toggleAlert}><input type="hidden" name="program_id" value={p.id} /><input type="hidden" name="on" value={savedRow.alert_enabled ? "0" : "1"} /><input type="hidden" name="back" value={back} />
            <button className="btn-ghost">{savedRow.alert_enabled ? "Alerts on · turn off" : "Alert me 30 / 14 / 3 days before close"}</button></form>
        )}
        {p.official_url && <a href={p.official_url} target="_blank" rel="noreferrer" className="btn-ghost">Official program page ↗</a>}
        {p.is_featured && <Link href={`/grants/${p.slug}`} className="btn-ghost">Full guide</Link>}
      </div>

      <div className="card flex flex-col items-start gap-2 border-brand">
        <h2 className="text-lg font-bold">Want an expert to write it?</h2>
        <p className="text-sm text-body">A Funding Lab grant writer can confirm fit, build the budget and draft the application with you.</p>
        <Link href={`/services/grant_writing?from=program&program=${encodeURIComponent(p.slug)}`} className="btn-secondary btn-sm">Get a Grant Writer</Link>
      </div>
      <p className="text-[13px] text-subtle">Funding Lab is an independent advisor. Always confirm eligibility and deadlines with the official program.</p>
    </section>
  );
}
