import Link from "next/link";
import { Icon } from "@/components/icons";
import { ClosingCta, PrimaryCta } from "@/components/cta";
import { FeaturedGrantCard } from "@/components/grants/featured-card";
import { GrantTeaser } from "@/components/grants/grant-teaser";
import { EventTime } from "@/components/local-time";
import { FUNDING_PATHS, PAIN_POINTS, SERVICES, STAGES, stageName } from "@/lib/constants";
import { getFeaturedPrograms } from "@/lib/programs/queries";
import { getOpenCohort, getSiteContent, getTestimonials, getUpcomingWebinars, nextTuesdayPt } from "@/lib/content";
import { HomeVideo, HomeWalkthrough } from "@/components/home-walkthrough";

export const metadata = { title: { absolute: "Funding Lab — Find the right funding for your business" } };

// Funding sources that open up at each stage, for the hero journey visual.
const JOURNEY: Record<string, string[]> = {
  idea: ["Grants", "Crowdfunding"],
  preseed: ["Grants", "Angels"],
  seed: ["Angels", "Early VC", "Loans"],
  growth: ["VC", "CSBFP loans", "Larger grants"],
  expansion: ["Growth debt", "PE", "Export programs"],
  exit: ["M&A", "PE", "IPO"],
};

export default async function HomePage() {
  const [featured, testimonials, webinars, cohort, videoUrl] = await Promise.all([
    getFeaturedPrograms(), getTestimonials(), getUpcomingWebinars(1), getOpenCohort(), getSiteContent("home_video_url", ""),
  ]);
  const nextWebinar = webinars[0]?.starts_at ?? nextTuesdayPt().toISOString();

  return (
    <>
      {/* Hero: what it is, who it's for, what to do next */}
      <section className="border-b border-line bg-surface">
        <div className="container grid items-center gap-10 py-12 md:py-16 lg:grid-cols-[1.1fr_.9fr]">
          <div className="flex flex-col gap-5">
            <h1 className="text-4xl font-extrabold leading-[1.08] md:text-[52px]">Find the right funding for your business — all in one place.</h1>
            <p className="max-w-[56ch] text-[17px] text-body">
              Grants, loans, angels, VCs and more. Create your free business profile, see where you are in your funding journey, and get matched with the right funding partners.
            </p>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-ink">Where is your business today?</span>
              <div className="flex flex-wrap gap-2">
                {STAGES.map((s) => (
                  <Link key={s.id} href={`/signup?stage=${s.id}`} className="rounded-full border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink hover:border-brand-text hover:bg-brand-soft" title={s.desc}>
                    {s.name}
                  </Link>
                ))}
              </div>
            </div>
            <PrimaryCta />
            <Link href="/assessment" className="self-start text-sm font-medium text-brand-text underline underline-offset-2">Not sure yet? Take the free Funding Check first</Link>
          </div>
          <ol className="relative flex flex-col gap-2 rounded-xl border border-line bg-page p-5" aria-label="Funding journey from Idea to Exit">
            {STAGES.map((s, i) => (
              <li key={s.id} className="grid grid-cols-[28px_1fr] items-start gap-3">
                <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-full bg-navy text-xs font-bold text-white">{i + 1}</span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <b className="w-24 text-ink">{s.name}</b>
                  {JOURNEY[s.id].map((f) => <span key={f} className="pill-success">{f}</span>)}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Short walkthrough: how to use the site and apply */}
      <section className="container grid items-center gap-8 py-12 lg:grid-cols-[.8fr_1.2fr]">
        <div className="flex flex-col gap-3">
          <span className="eyebrow">Watch: 30 seconds</span>
          <h2 className="text-3xl font-bold">How to find your funding and apply</h2>
          <p className="text-subtle">See how to create your profile, check your grant history, get your readiness score, and apply with the Funding Lab Team.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/signup" className="btn-cta justify-center">Create free profile</Link>
            <Link href="/assessment" className="btn-secondary justify-center">Take the Funding Check</Link>
          </div>
        </div>
        {videoUrl.trim() ? <HomeVideo url={videoUrl.trim()} /> : <HomeWalkthrough />}
      </section>

      {/* Featured grants */}
      {featured.length > 0 && (
        <section className="container flex flex-col gap-5 py-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><span className="eyebrow">Featured grants</span><h2 className="mt-1 text-3xl font-bold">Open now in British Columbia</h2></div>
            <Link href="/grants" className="btn-secondary">All grants</Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2">{featured.map((p) => <FeaturedGrantCard key={p.id} p={p} />)}</div>
        </section>
      )}

      {/* Sound familiar? */}
      <section className="border-y border-line bg-surface">
        <div className="container flex flex-col gap-6 py-14">
          <div><span className="eyebrow">Sound familiar?</span><h2 className="mt-1 text-3xl font-bold">The funding problems we solve</h2></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PAIN_POINTS.map((p) => (
              <Link key={p.quote} href={p.href} className="card flex flex-col gap-2 hover:border-brand-text">
                <p className="font-display text-lg font-bold text-ink">“{p.quote}”</p>
                <span className="text-sm text-subtle">{p.module}</span>
                <span className="mt-auto text-sm font-semibold text-brand-text">Solve this →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container flex flex-col gap-6 py-14">
        <div><span className="eyebrow">How it works</span><h2 className="mt-1 text-3xl font-bold">Four steps from profile to funded</h2></div>
        <ol className="grid gap-5 md:grid-cols-4">
          {[
            ["Create Profile", "Two minutes to start. We check Government of Canada data for your federal grant history."],
            ["Get Your Funding Check", "Your readiness score, gaps to fix, and the funding paths that fit your stage."],
            ["Get Matched Privately", "Our team reviews matches with vetted funders and experts. Names are shared only when both sides agree."],
            ["Get Funded & Stay Funded", "Close the deal, then keep up with reporting and plan your next round."],
          ].map(([t, d], i) => (
            <li key={t} className="flex flex-col gap-1 border-t-4 border-brand pt-4">
              <span className="text-xs font-bold text-brand-text">STEP {i + 1}</span>
              <h3 className="text-lg font-bold">{t}</h3>
              <p className="text-sm text-subtle">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Education programs */}
      <section className="container grid gap-5 pb-14 md:grid-cols-2">
        <div className="card flex flex-col gap-3">
          <span className="pill-info self-start">Free · Every Tuesday 8 AM PT</span>
          <h3 className="text-2xl font-bold">Free Funding Webinar</h3>
          <p className="text-subtle">Learn which funding fits your business: grants, loans, angels, VCs and more. Live Q&amp;A with Funding Lab experts.</p>
          <div className="text-sm font-medium text-ink">Next session: <EventTime iso={nextWebinar} /></div>
          <Link href="/webinar" className="btn-secondary mt-auto self-start">Reserve My Seat</Link>
        </div>
        <div className="card flex flex-col gap-3">
          <span className="pill-info self-start">8-Week Cohort · Fridays 8 AM PT · $499</span>
          <h3 className="text-2xl font-bold">Road to Funding</h3>
          <p className="text-subtle">Eight weeks from &ldquo;not sure&rdquo; to funding-ready, with applications submitted and a Pitch Day with Funding Lab partners.</p>
          {cohort && (
            <p className="text-sm font-medium text-ink">
              Next cohort starts {new Date(`${cohort.start_date}T12:00:00`).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })} · {cohort.seats_left} seats left
            </p>
          )}
          <Link href="/road-to-funding" className="btn-secondary mt-auto self-start">Enroll Now</Link>
        </div>
      </section>

      {/* The 7 funding paths */}
      <section className="border-y border-line bg-surface">
        <div className="container flex flex-col gap-6 py-14">
          <div><span className="eyebrow">The 7 funding paths</span><h2 className="mt-1 text-3xl font-bold">Know which money fits your stage</h2></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FUNDING_PATHS.map((p) => (
              <Link key={p.id} href={`/assessment?path=${p.slug}`} className="card flex flex-col gap-2 hover:border-brand-text">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-soft text-brand-text"><Icon name={p.icon} /></span>
                <h3 className="text-lg font-bold">{p.name}</h3>
                <p className="text-sm text-subtle">{p.who}</p>
                <div className="mt-auto flex flex-wrap gap-1 pt-1">{p.stages.map((s) => <span key={s} className="pill">{stageName(s)}</span>)}</div>
                <span className="text-sm font-semibold text-brand-text">Check if it fits me →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Grant history hook */}
      <section className="container grid items-start gap-8 py-14 md:grid-cols-[.9fr_1.1fr]">
        <div className="flex flex-col gap-3">
          <span className="eyebrow">Grant history</span>
          <h2 className="text-3xl font-bold">Has your business received federal funding before?</h2>
          <p className="text-subtle">Enter your business name and we&apos;ll check Government of Canada open data. Past grants strengthen new applications and your investor profile.</p>
        </div>
        <div className="card"><GrantTeaser /></div>
      </section>

      {/* Services */}
      <section className="border-y border-line bg-surface">
        <div className="container flex flex-col gap-6 py-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><span className="eyebrow">Services</span><h2 className="mt-1 text-3xl font-bold">Get investor- and lender-ready faster</h2></div>
            <Link href="/services" className="btn-secondary">All services</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.filter((s) => ["data_room", "business_plan", "grant_writing", "loan_consulting"].includes(s.kind)).map((s) => (
              <div key={s.kind} className="card flex flex-col gap-2">
                <h3 className="text-lg font-bold">{s.name}</h3>
                <p className="text-sm text-subtle">{s.promise}</p>
                <Link href={`/services/${s.kind}#quote`} className="btn-ghost mt-auto self-start">Get a quote →</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For funders and experts */}
      <section className="container py-14">
        <div className="flex flex-col items-start gap-4 rounded-xl border-2 border-brand bg-brand-soft p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="flex flex-col gap-1">
            <span className="eyebrow">For funders &amp; experts</span>
            <h2 className="text-2xl font-bold md:text-3xl">Become a Funding Lab Partner</h2>
            <p className="max-w-xl text-body">Investors, lenders, grant writers, lawyers, CPAs and growth experts: get curated, pre-vetted deal flow from Canadian businesses that are ready to fund.</p>
          </div>
          <Link href="/partners/join" className="btn-cta shrink-0 px-6 py-3 text-base">Become a Partner</Link>
        </div>
      </section>

      {/* Testimonials: hidden until consented content exists */}
      {testimonials.length > 0 && (
        <section className="container flex flex-col gap-6 pb-6">
          <div><span className="eyebrow">Client stories</span><h2 className="mt-1 text-3xl font-bold">What business owners say</h2></div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.id} className="card flex flex-col gap-4">
                <blockquote className="text-[17px] text-ink">“{t.quote}”</blockquote>
                <figcaption className="mt-auto flex items-center gap-3 text-sm text-subtle">
                  {t.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.photo_url} alt="" className="h-12 w-12 rounded-full object-cover" loading="lazy" />
                  ) : (
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-soft font-bold text-brand-text" aria-hidden>{t.attribution.trim().charAt(0)}</span>
                  )}
                  {t.attribution}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <ClosingCta />
    </>
  );
}
