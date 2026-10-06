import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { PILLARS, scoreAssessment, type Answers } from "@/lib/assessment";
import { FUNDING_PATHS } from "@/lib/constants";
import { dateShort } from "@/lib/format";
import { ClaimAssessment } from "./claim";

export const metadata = { title: "Funding Readiness report" };
const pathOf = (id: string) => FUNDING_PATHS.find((p) => p.id === id);

export default async function AssessmentReportPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const { userId } = await requireUser("/app/assessment");
  const sp = await searchParams;
  const hasPending = !!(await cookies()).get("fl_assess");
  const supabase = await createClient();
  const { data: rows } = await supabase.from("assessments").select("id, answers, score, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(6);
  const latest = rows?.[0];

  if (!latest) {
    return (
      <section className="container flex max-w-3xl flex-col gap-4 py-10">
        {hasPending && <ClaimAssessment />}
        <h1 className="text-3xl font-bold">Funding Readiness report</h1>
        <p className="text-subtle">{hasPending ? "Saving your answers…" : "You haven't taken the assessment yet. It takes about 5 minutes."}</p>
        {!hasPending && <Link href="/assessment" className="btn-cta self-start">Take the assessment</Link>}
      </section>
    );
  }
  // Re-derive from stored answers so the report always reflects the current scoring rules' explanations.
  const r = scoreAssessment(latest.answers as Answers);
  const previous = rows?.[1];

  return (
    <section className="container flex max-w-4xl flex-col gap-6 py-10">
      {hasPending && <ClaimAssessment />}
      {sp.new && <p className="pill-success self-start px-4 py-2 text-sm" role="status">Assessment saved.</p>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Funding Readiness report · {dateShort(latest.created_at)}</span>
          <div className="mt-2 flex items-end gap-3"><span className="text-6xl font-extrabold text-ink num">{r.score}</span><span className="pb-2 text-xl font-semibold text-brand-text">{r.band.label}</span></div>
          {previous && <p className="text-sm text-subtle">Previous: <span className="num">{previous.score}</span> on {dateShort(previous.created_at)}</p>}
        </div>
        <Link href="/assessment" className="btn-secondary">Retake</Link>
      </div>

      <div className="card flex flex-col gap-3">
        <h2 className="text-lg font-bold">By pillar</h2>
        {PILLARS.map((p) => (
          <div key={p.id} className="flex flex-col gap-1">
            <div className="flex justify-between text-sm"><span className="text-ink">{p.label} <span className="text-subtle">({Math.round(p.weight * 100)}%)</span></span><b className="num text-ink">{r.pillarScores[p.id]}</b></div>
            <div className="h-2 overflow-hidden rounded-full bg-muted"><i className="block h-full bg-brand" style={{ width: `${r.pillarScores[p.id]}%` }} /></div>
          </div>
        ))}
      </div>

      <div className="card flex flex-col gap-3">
        <h2 className="text-lg font-bold">Your top 3 gaps</h2>
        <ol className="flex flex-col gap-3">
          {r.topGaps.map((g, i) => (
            <li key={g.id} className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-highlight-soft font-bold text-ink num">{i + 1}</span>
              <span className="flex flex-col gap-1">
                <b className="text-ink">{g.fix}</b>
                <span className="text-sm text-subtle">{g.question}</span>
                {g.service && <Link href={g.service.href.replace("/services#", "/app/services#")} className="text-sm font-semibold text-brand-text underline">Get help: {g.service.label}</Link>}
              </span>
            </li>
          ))}
          {!r.topGaps.length && <li className="text-subtle">No major gaps. You&apos;re in great shape.</li>}
        </ol>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="card flex flex-col gap-2">
          <h2 className="text-lg font-bold">Paths that fit now</h2>
          {r.pathsNow.map((id) => { const p = pathOf(id); return p ? <Link key={id} href={`/funding-paths/${p.slug}`} className="flex justify-between border-b border-line py-1.5 hover:underline"><b className="text-ink">{p.name}</b><span className="num text-sm text-subtle">{p.range}</span></Link> : null; })}
        </div>
        <div className="card flex flex-col gap-2">
          <h2 className="text-lg font-bold">Paths for later</h2>
          {r.pathsLater.length ? r.pathsLater.map((id) => { const p = pathOf(id); return p ? <Link key={id} href={`/funding-paths/${p.slug}`} className="flex justify-between border-b border-line py-1.5 hover:underline"><span className="text-ink">{p.name}</span><span className="num text-sm text-subtle">{p.range}</span></Link> : null; }) : <p className="text-subtle">You&apos;re at the last stage.</p>}
        </div>
      </div>

      {r.score < 70 && (
        <div className="flex flex-col items-start gap-3 rounded-xl bg-navy p-6 text-white md:flex-row md:items-center md:justify-between">
          <span><b className="block text-lg text-white">Close these gaps in 8 weeks</b><span className="text-white/80">The Road to Funding cohort works through each pillar with you, live.</span></span>
          <Link href="/road-to-funding" className="btn-cta">See the cohort</Link>
        </div>
      )}
      <p className="text-[13px] text-subtle">An indicator based on your answers, not a guarantee of funding.</p>
    </section>
  );
}
