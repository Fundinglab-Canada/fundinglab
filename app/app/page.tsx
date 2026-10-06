import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyBusiness, requireUser } from "@/lib/auth";
import { FUNDING_PATHS, SERVICES, SERVICE_TRIGGERS, industryLabel, stageName } from "@/lib/constants";
import { money } from "@/lib/format";
import { completeness } from "@/lib/readiness";
import { bandFor } from "@/lib/assessment";
import { getOpenCohort, getUpcomingWebinars } from "@/lib/content";
import type { FundingHistoryRow, Introduction } from "@/lib/types";
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
  const [{ data: historyData }, { data: docs }, { data: intros }, { data: assessment }, { data: regs }, { data: enrollment }, webinars, cohort] = await Promise.all([
    supabase.from("funding_history").select("*").eq("business_id", business.id).order("year", { ascending: false }),
    supabase.from("documents").select("kind").eq("business_id", business.id),
    supabase.rpc("fl_my_introductions", { p_business_id: business.id }),
    supabase.from("assessments").select("score, band, created_at, gaps").eq("business_id", business.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("webinar_registrations").select("session_id").eq("user_id", userId),
    supabase.from("cohort_enrollments").select("status, cohort_id").eq("user_id", userId).in("status", ["enrolled", "waitlisted", "completed"]).limit(1).maybeSingle(),
    getUpcomingWebinars(1),
    getOpenCohort(),
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
          <Link href="/app/share" className="btn-primary">Shareable profile</Link>
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
              <Link key={s.kind} href={"href" in s ? `${s.href}?from=dashboard` : `/app/services#${s.kind}`} className="flex flex-col gap-1 rounded-lg border border-line p-3 hover:border-brand">
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
