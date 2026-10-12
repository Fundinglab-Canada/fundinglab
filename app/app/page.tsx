import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyBusiness, requireUser } from "@/lib/auth";
import { FUNDING_PATHS, SERVICES, SERVICE_TRIGGERS, industryLabel, stageName } from "@/lib/constants";
import { dateShort, money } from "@/lib/format";
import { completeness } from "@/lib/readiness";
import { bandFor } from "@/lib/assessment";
import { getOpenCohort, getUpcomingWebinars } from "@/lib/content";
import type { FundingHistoryRow, Introduction } from "@/lib/types";
import { rankPrograms, programDeadline } from "@/lib/programs/match";
import { stackMetrics, type StackItem } from "@/lib/roadmap";
import { appStatusLabel } from "@/lib/applications";
import type { ProgramRow } from "@/lib/programs/types";
import { JourneyBar } from "@/components/journey";
import { EventTime } from "@/components/local-time";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string; password?: string }> }) {
  const { userId, profile } = await requireUser("/app");
  if (profile.role === "admin") redirect("/admin");
  const business = await getMyBusiness();
  if (!business) redirect("/app/profile?step=1");
  const sp = await searchParams;

  const supabase = await createClient();
  const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const [{ data: historyData }, { data: docs }, { data: intros }, { data: assessment }, { data: regs }, { data: enrollment }, webinars, cohort,
    { data: apps }, { data: obligations }, { data: programs }, { data: savedRows }, { data: roadmap }] = await Promise.all([
    supabase.from("funding_history").select("*").eq("business_id", business.id).order("year", { ascending: false }),
    supabase.from("documents").select("kind").eq("business_id", business.id),
    supabase.rpc("fl_my_introductions", { p_business_id: business.id }),
    supabase.from("assessments").select("score, band, created_at, gaps").eq("business_id", business.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("webinar_registrations").select("session_id").eq("user_id", userId),
    supabase.from("cohort_enrollments").select("status, cohort_id").eq("user_id", userId).in("status", ["enrolled", "waitlisted", "completed"]).limit(1).maybeSingle(),
    getUpcomingWebinars(1),
    getOpenCohort(),
    supabase.from("applications").select("id, title, status, due_date").eq("business_id", business.id).order("updated_at", { ascending: false }),
    supabase.from("obligations").select("id, title, due_date").eq("business_id", business.id).neq("status", "done").lte("due_date", in30).order("due_date").limit(10),
    supabase.from("programs").select("*").eq("active", true),
    supabase.from("saved_programs").select("program_id").eq("business_id", business.id),
    supabase.from("roadmaps").select("capital_stack, target_amount").eq("business_id", business.id).maybeSingle(),
  ]);
  const history = (historyData ?? []) as FundingHistoryRow[];
  const introductions = (intros ?? []) as Introduction[];
  const waiting = introductions.filter((i) => i.status === "approved" && i.business_opt_in === null);
  const connected = introductions.filter((i) => i.status === "mutual");
  const docKinds = (docs ?? []).map((d) => d.kind as string);
  const checklist = completeness({ business, documents: docKinds, historyCount: history.length, hasAssessment: !!assessment });
  const score = assessment?.score ?? business.readiness_score;
  const band = bandFor(score);
  const grants = history.filter((h) => h.auto_found);
  const recServices = [...new Set(business.use_of_funds.map((u) => SERVICE_TRIGGERS[u]).filter(Boolean))].map((k) => SERVICES.find((s) => s.kind === k)!);
  const docServices = [
    ...(!docKinds.includes("business_plan") ? ["business_plan"] : []),
    ...(!docKinds.includes("pitch_deck") ? ["pitch_deck"] : []),
  ].map((k) => SERVICES.find((s) => s.kind === k)!).slice(0, 4 - recServices.length);
  const paths = FUNDING_PATHS.filter((p) => business.stage && (p.stages as readonly string[]).includes(business.stage));
  const nextWebinar = webinars[0];
  const allPrograms = (programs ?? []) as ProgramRow[];
  const topPrograms = rankPrograms(allPrograms, business).filter((r) => !r.match.blocked && !r.match.closed).slice(0, 3);
  const savedIds = new Set((savedRows ?? []).map((r) => r.program_id as string));
  const activeApps = (apps ?? []).filter((a) => !["approved", "declined"].includes(a.status));
  const now = Date.now();
  const deadlines = [
    ...(obligations ?? []).map((o) => ({ key: `o${o.id}`, title: o.title as string, date: o.due_date as string, href: "/app/applications" })),
    ...activeApps.filter((a) => a.due_date && a.due_date <= in30).map((a) => ({ key: `a${a.id}`, title: `Application due: ${a.title}`, date: a.due_date as string, href: `/app/applications/${a.id}` })),
    ...allPrograms.filter((p) => savedIds.has(p.id)).flatMap((p) => {
      const d = programDeadline(p);
      return d && d.getTime() > now && d.getTime() - now <= 30 * 864e5 ? [{ key: `p${p.id}`, title: `Intake closes: ${p.name}`, date: d.toISOString().slice(0, 10), href: `/app/grants/${p.slug}` }] : [];
    }),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
  const stack = (roadmap?.capital_stack ?? {}) as { items?: StackItem[]; pre_money?: number | null };
  const stackTarget = Number(roadmap?.target_amount ?? business.amount_sought ?? 0);
  const raisedToDate = history.filter((h) => h.status === "active" || h.status === "received").reduce((s, h) => s + Number(h.amount), 0);
  const planned = stackMetrics(stack.items ?? [], stackTarget, stack.pre_money ?? null);
  const registered = nextWebinar && (regs ?? []).some((r) => r.session_id === nextWebinar.id);

  return (
    <section className="container flex flex-col gap-5 py-10">
      {sp.welcome && <p className="pill-success self-start px-4 py-2 text-sm" role="status">Profile saved. The Funding Lab Team will review introductions for you.</p>}
      {sp.password && <p className="pill-success self-start px-4 py-2 text-sm" role="status">Password updated.</p>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Your funding journey</span>
          <h1 className="mt-1 text-3xl font-bold">{business.name}</h1>
          <p className="text-sm text-subtle">
            {industryLabel(business.industry)}{business.city ? ` · ${business.city}, ${business.province}` : ""}
            {business.amount_sought ? <> · seeking <b className="num text-ink">{money(business.amount_sought)}</b>{business.timeline ? ` in ${business.timeline}` : ""}</> : null}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/profile" className="btn-secondary">Edit profile</Link>
          <Link href="/app/share" className="btn-primary">Investor snapshot</Link>
        </div>
      </div>

      {business.stage && <div className="card"><h2 className="mb-4 text-lg font-bold">Where you are: {stageName(business.stage)}</h2><JourneyBar stage={business.stage} /></div>}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card flex flex-col gap-3">
          <h2 className="text-lg font-bold">Funding Readiness</h2>
          <div className="flex items-end gap-3"><span className="text-5xl font-extrabold text-ink num">{score}</span><span className="pb-1.5 font-semibold text-brand-text">{band.label}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-muted"><i className="block h-full bg-brand" style={{ width: `${score}%` }} /></div>
          {assessment ? (
            <Link href="/app/assessment" className="text-sm font-semibold text-brand-text underline">See your report and top gaps</Link>
          ) : (
            <><p className="text-sm text-subtle">Estimated from your profile. Take the 5-minute assessment for your real score and gaps.</p>
              <Link href="/assessment" className="btn-secondary btn-sm self-start">Take the assessment</Link></>
          )}
        </div>

        <div className="card flex flex-col gap-3">
          <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Introductions</h2>
            <span className={waiting.length ? "pill-highlight" : "pill"}>{waiting.length} waiting</span></div>
          <p className="text-sm text-body">
            {waiting.length ? <>You have <b>{waiting.length}</b> introduction{waiting.length === 1 ? "" : "s"} waiting for your reply.</> : "No introductions waiting right now."}
            {connected.length > 0 && <> {connected.length} connected.</>}
          </p>
          {!business.consent_matching && (
            <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">Matching is off. <Link href="/app/profile?step=6" className="underline">Turn on matching consent</Link> so we can introduce you.</p>
          )}
          <Link href="/app/matches" className="btn-secondary btn-sm mt-auto self-start">{waiting.length ? "Review introductions" : "View introductions"}</Link>
        </div>

        <div className="card flex flex-col gap-3">
          <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Verified federal grants</h2><span className="pill-info">Open data</span></div>
          {grants.length ? (
            <>
              <span className="text-3xl font-extrabold text-ink num">{money(grants.reduce((s, g) => s + Number(g.amount), 0))}</span>
              <ul className="flex flex-col gap-1 text-sm">{grants.slice(0, 3).map((g) => <li key={g.id} className="flex justify-between gap-2"><span className="truncate">{g.program_name}</span><span className="num">{money(g.amount)}</span></li>)}</ul>
            </>
          ) : <p className="text-sm text-subtle">None linked yet. We check Government of Canada open data as you fill in your business name.</p>}
          <Link href="/grants" className="mt-auto text-sm font-semibold text-brand-text underline">Find grants you may qualify for</Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card flex flex-col gap-3">
          <h2 className="text-lg font-bold">Capital stack</h2>
          {stackTarget > 0 ? (
            <>
              <span className="text-sm text-subtle">Planned <b className="num text-ink">{money(planned.total, true)}</b> of <b className="num text-ink">{money(stackTarget, true)}</b></span>
              <div className="h-2 overflow-hidden rounded-full bg-muted"><i className="block h-full bg-brand" style={{ width: `${planned.progressPct}%` }} /></div>
              <span className="text-[13px] text-subtle">Funding received to date: <b className="num text-ink">{money(raisedToDate, true)}</b></span>
            </>
          ) : <p className="text-sm text-subtle">Set your funding need to plan your stack.</p>}
          <Link href="/app/roadmap" className="btn-secondary btn-sm mt-auto self-start">Open roadmap</Link>
        </div>

        <div className="card flex flex-col gap-3">
          <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Applications</h2><span className="pill">{activeApps.length} active</span></div>
          {activeApps.length ? (
            <ul className="flex flex-col gap-1.5 text-sm">{activeApps.slice(0, 4).map((a) => (
              <li key={a.id} className="flex justify-between gap-2"><Link href={`/app/applications/${a.id}`} className="truncate hover:underline">{a.title}</Link><span className="pill shrink-0">{appStatusLabel(a.status)}</span></li>
            ))}</ul>
          ) : <p className="text-sm text-subtle">Nothing in progress. Start one from a matched program.</p>}
          <Link href="/app/applications" className="btn-secondary btn-sm mt-auto self-start">Application Center</Link>
        </div>

        <div className="card flex flex-col gap-3">
          <h2 className="text-lg font-bold">Next 30 days</h2>
          {deadlines.length ? (
            <ul className="flex flex-col gap-1.5 text-sm">{deadlines.map((d) => (
              <li key={d.key} className="flex justify-between gap-2"><Link href={d.href} className="truncate hover:underline">{d.title}</Link><span className="num shrink-0 text-subtle">{dateShort(d.date)}</span></li>
            ))}</ul>
          ) : <p className="text-sm text-subtle">No deadlines coming up. Save programs to track their intake dates.</p>}
        </div>
      </div>

      {topPrograms.length > 0 && (
        <div className="card flex flex-col gap-3">
          <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Recommended programs</h2><Link href="/app/grants" className="btn-ghost btn-sm">All matches</Link></div>
          <div className="grid gap-3 md:grid-cols-3">
            {topPrograms.map(({ program: p, match }) => (
              <Link key={p.id} href={`/app/grants/${p.slug}`} className="flex flex-col gap-1 rounded-lg border border-line p-3 hover:border-brand">
                <b className="text-ink">{p.name}</b><span className="text-[13px] text-subtle">{match.why[0] ?? p.funder}</span>
                <span className="mt-auto pt-2 text-sm"><b className="num text-brand-text">{match.score}</b> match</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card flex flex-col gap-3">
          <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Complete your profile</h2><b className="num text-ink">{checklist.pct}%</b></div>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {checklist.items.map((i) => (
              <li key={i.id}>
                {i.done ? <span className="flex gap-2 text-sm text-subtle"><span className="text-brand-text">✓</span>{i.label}</span>
                  : <Link href={i.href} className="flex gap-2 text-sm text-ink hover:underline"><span className="text-line-strong">○</span>{i.label}</Link>}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="card flex flex-col gap-2">
            <h2 className="text-lg font-bold">Free Funding Webinar</h2>
            {nextWebinar ? <span className="text-sm text-ink"><EventTime iso={nextWebinar.starts_at} /></span> : <span className="text-sm text-subtle">Every Tuesday, 8:00 AM PT</span>}
            {registered ? <span className="pill-success self-start">You&apos;re registered</span> : <Link href="/webinar#register" className="btn-secondary btn-sm mt-auto self-start">Save my seat</Link>}
          </div>
          <div className="card flex flex-col gap-2">
            <h2 className="text-lg font-bold">Road to Funding</h2>
            {enrollment?.status === "enrolled" || enrollment?.status === "completed" ? (
              <><span className="text-sm text-subtle">You&apos;re in the cohort.</span><Link href="/app/cohort" className="btn-secondary btn-sm mt-auto self-start">Go to my cohort</Link></>
            ) : enrollment?.status === "waitlisted" ? (
              <span className="pill-info self-start">On the waitlist</span>
            ) : cohort && score < 70 ? (
              <><span className="text-sm text-subtle">8 live weeks to raise your score from {score} to funding-ready. {cohort.seats_left} seats left.</span>
                <Link href="/road-to-funding" className="btn-cta btn-sm mt-auto self-start">See the cohort</Link></>
            ) : (
              <><span className="text-sm text-subtle">An 8-week live cohort for founders preparing to raise.</span><Link href="/road-to-funding" className="mt-auto text-sm font-semibold text-brand-text underline">Learn more</Link></>
            )}
          </div>
        </div>
      </div>

      {(recServices.length > 0 || docServices.length > 0) && (
        <div className="card flex flex-col gap-3">
          <h2 className="text-lg font-bold">Recommended for you</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {[...recServices, ...docServices].map((s) => (
              <Link key={s.kind} href={`/services/${s.kind}?from=dashboard`} className="flex flex-col gap-1 rounded-lg border border-line p-3 hover:border-brand">
                <b className="text-ink">{s.name}</b><span className="text-[13px] text-subtle">{s.promise}</span>
                <span className="mt-auto pt-2 text-sm font-semibold text-brand-text">Get a quote</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {paths.length > 0 && (
        <div className="card flex flex-col gap-4">
          <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Funding paths for the {stageName(business.stage)} stage</h2><Link href="/funding-paths" className="btn-ghost btn-sm">All paths</Link></div>
          <div className="grid gap-4 md:grid-cols-3">
            {paths.map((p) => (
              <Link key={p.id} href={`/funding-paths/${p.slug}`} className="flex flex-col gap-1 border-l-2 border-brand pl-3 hover:underline">
                <b className="text-ink">{p.name}</b><span className="text-sm text-subtle">{p.who}</span><span className="num text-sm">{p.range}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
