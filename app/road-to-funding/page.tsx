import Link from "next/link";
import { getOpenCohort, getSiteContent } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";
import { defaultSchedule, type CohortSession } from "@/lib/cohort";
import { EventTime, Countdown } from "@/components/local-time";
import { ClosingCta } from "@/components/cta";
import { money } from "@/lib/format";

export const metadata = {
  title: "Road to Funding — 8-week funding cohort",
  description: "An 8-week live cohort that takes your business from \"not sure where to start\" to a funding plan, documents and introductions.",
};
export const revalidate = 300;

const OUTCOMES = [
  "A funding roadmap and capital stack for the next 12–24 months",
  "A shortlist of grants and loans you qualify for",
  "A lender-ready financial summary and use-of-funds narrative",
  "A reviewed pitch deck and a data room checklist",
  "A readiness score you can raise, and warm introductions when you're ready",
];

const FAQ = [
  ["Who is it for?", "Canadian founders and owners from idea stage to established businesses who want a clear plan to raise grants, loans or investment."],
  ["When does it meet?", "Fridays at 8:00 AM Pacific for 8 weeks, live online, with replays for members of the cohort."],
  ["What does it cost?", "A one-time fee in Canadian dollars, plus applicable tax. Paid securely by card through Stripe."],
  ["Do you guarantee funding?", "No. Nobody can guarantee funding. We help you choose the right path, prepare, and get introduced."],
];

async function getSchedule(cohortId: string, start: string): Promise<CohortSession[]> {
  try {
    const s = await createClient();
    const { data } = await s.from("cohort_schedule_public").select("week_number, starts_at, topic").eq("cohort_id", cohortId).order("week_number");
    if (data?.length) return data as CohortSession[];
  } catch {}
  return defaultSchedule(start);
}

export default async function RoadToFundingPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const cohort = await getOpenCohort();
  const [schedule, refund] = await Promise.all([
    cohort ? getSchedule(cohort.id, cohort.start_date) : Promise.resolve(defaultSchedule(new Date().toISOString().slice(0, 10))),
    getSiteContent("cohort_refund_policy", "Full refund up to 7 days before the first session. After that, you can transfer to the next cohort."),
  ]);
  const full = cohort ? cohort.seats_left <= 0 : false;
  const jsonLd = cohort && {
    "@context": "https://schema.org", "@type": "Course", name: "Road to Funding", description: metadata.description,
    provider: { "@type": "Organization", name: "Funding Lab" },
    offers: { "@type": "Offer", price: Number(cohort.price_cad), priceCurrency: "CAD", availability: full ? "https://schema.org/SoldOut" : "https://schema.org/InStock" },
    hasCourseInstance: { "@type": "CourseInstance", courseMode: "online", startDate: cohort.start_date, endDate: cohort.end_date },
  };

  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      <section className="border-b border-line bg-surface">
        <div className="container grid items-start gap-10 py-14 lg:grid-cols-[1.2fr_.8fr]">
          <div className="flex flex-col gap-5">
            <span className="eyebrow">Road to Funding cohort</span>
            <h1 className="text-4xl font-extrabold md:text-5xl">Eight weeks from &ldquo;where do I start?&rdquo; to funding-ready</h1>
            <p className="text-lg text-body">A small live cohort. One topic a week, homework that builds your funding package, and the Funding Lab Team in your corner.</p>
            {sp.status === "waitlisted" && <p className="pill-info self-start px-4 py-2 text-sm">You&apos;re on the waitlist. We&apos;ll email you if a seat opens.</p>}
            {sp.status === "cancelled" && <p className="pill-warning self-start px-4 py-2 text-sm">Checkout cancelled. Nothing was charged.</p>}
            <ul className="grid gap-2">{OUTCOMES.map((o) => <li key={o} className="flex gap-2"><span className="text-brand-text">✓</span>{o}</li>)}</ul>
          </div>
          <aside className="card flex flex-col gap-3 lg:sticky lg:top-24">
            {cohort ? (
              <>
                <span className="text-sm font-semibold text-subtle">{cohort.name}</span>
                <span className="text-3xl font-extrabold text-ink num">{money(cohort.price_cad)} <span className="text-base font-medium text-subtle">CAD + tax</span></span>
                <span className="text-body">Starts <EventTime iso={schedule[0]?.starts_at ?? `${cohort.start_date}T16:00:00Z`} /></span>
                <span className={full ? "pill-warning self-start" : "pill-success self-start"}>{full ? "Cohort full — join the waitlist" : `${cohort.seats_left} of ${cohort.capacity} seats left`}</span>
                {cohort.registration_deadline && <Countdown to={`${cohort.registration_deadline}T23:59:59-08:00`} label="Registration closes in" />}
                <Link href="/road-to-funding/enroll" className="btn-cta mt-2 text-center">{full ? "Join the waitlist" : "Enroll now"}</Link>
                <span className="text-[13px] text-subtle">Secure checkout by Stripe. {refund.split(".")[0]}.</span>
              </>
            ) : (
              <>
                <span className="text-lg font-bold">The next cohort opens soon</span>
                <p className="text-subtle">Join the free weekly webinar in the meantime. We announce new cohorts there first.</p>
                <Link href="/webinar" className="btn-secondary">Register for the free webinar</Link>
              </>
            )}
          </aside>
        </div>
      </section>

      <section className="container flex flex-col gap-4 py-12">
        <h2 className="text-2xl font-bold">Curriculum</h2>
        <ol className="grid gap-3 md:grid-cols-2">
          {schedule.map((s) => (
            <li key={s.week_number} className="card flex gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft font-bold text-brand-text num">{s.week_number}</span>
              <span><b className="text-ink">{s.topic}</b>{cohort && <span className="block text-sm text-subtle"><EventTime iso={s.starts_at} /></span>}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="container grid gap-8 pb-12 md:grid-cols-2">
        <div>
          <h2 className="mb-3 text-2xl font-bold">Questions</h2>
          <div className="flex flex-col gap-2">
            {FAQ.map(([q, a]) => (
              <details key={q} className="card"><summary className="cursor-pointer font-semibold text-ink">{q}</summary><p className="mt-2 text-body">{a}</p></details>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-2xl font-bold">Refund policy</h2>
          <p className="card text-body">{refund}</p>
        </div>
      </section>
      <ClosingCta secondary={{ href: "/webinar", label: "Not ready? Start with the free Tuesday webinar" }} />
    </>
  );
}
