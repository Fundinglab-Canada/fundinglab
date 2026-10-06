import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProgramBySlug, programStatus } from "@/lib/programs/queries";
import { getSessionProfile } from "@/lib/auth";
import { QuickCheck } from "@/components/grants/quick-check";
import { RedipCalculator, RtriCalculators } from "@/components/grants/calculators";
import { GuideDownload } from "@/components/grants/guide-download";
import { FitCallForm } from "@/components/grants/fit-call-form";
import { Turnstile } from "@/components/turnstile";
import { Countdown } from "@/components/local-time";
import { ClosingCta, PrimaryCta } from "@/components/cta";
import { BRAND } from "@/lib/constants";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getProgramBySlug((await params).slug);
  return p ? { title: p.headline ?? p.name, description: p.subheadline ?? p.summary ?? undefined } : {};
}

function Section({ id, eyebrow, title, children, alt }: { id?: string; eyebrow?: string; title: string; children: React.ReactNode; alt?: boolean }) {
  return (
    <section id={id} className={alt ? "border-y border-line bg-surface" : ""}>
      <div className="container flex scroll-mt-24 flex-col gap-5 py-12">
        <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2 className="mt-1 text-3xl font-bold">{title}</h2></div>
        {children}
      </div>
    </section>
  );
}

const toneClass = { yes: "border-brand-text/40", no: "border-danger/40", info: "border-info/40" } as const;

export default async function FeaturedGrantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProgramBySlug(slug);
  if (!p || !p.is_featured) notFound();
  const c = p.content ?? {};
  const status = programStatus(p);
  const session = await getSessionProfile().catch(() => null);

  return (
    <>
      {/* 1. Hero */}
      <section className="border-b border-line bg-surface">
        <div className="container flex flex-col gap-5 py-12 md:py-14">
          <div className="flex flex-wrap items-center gap-2">
            <span className="pill-info">{p.badge}</span>
            {p.close_at && !status.closed && <Countdown to={p.close_at} label="Closes in" />}
            {p.last_verified_at && <span className="pill">Last verified {p.last_verified_at}</span>}
          </div>
          <h1 className="max-w-4xl text-4xl font-extrabold md:text-5xl">{p.headline}</h1>
          <p className="max-w-[62ch] text-[17px] text-body">{p.subheadline}</p>
          <p className={`self-start rounded-md px-3 py-1.5 text-sm font-semibold ${status.closed ? "bg-warning-soft text-warning" : "bg-brand-soft text-brand-text"}`}>{status.text}</p>
          {c.heroStats && (
            <dl className="grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
              {c.heroStats.map((s) => (
                <div key={s.label} className="rounded-lg border border-line p-3"><dt className="text-[13px] text-subtle">{s.label}</dt><dd className="num text-2xl font-extrabold text-ink">{s.value}</dd></div>
              ))}
            </dl>
          )}
          <div className="flex flex-wrap items-start gap-3">
            <PrimaryCta />
            <a href="#quick-check" className="btn-secondary px-5 py-3">Check My Fit</a>
            <a href="#fit-call" className="btn-secondary px-5 py-3">Book a Free Fit Call</a>
          </div>
        </div>
      </section>

      {/* Why it matters (RTRI) */}
      {c.whyItMatters && (
        <Section eyebrow="Why it matters" title="B.C. depends on U.S. trade">
          <p className="max-w-measure text-body">{c.whyItMatters.intro}</p>
          <div className="card flex flex-col gap-3" role="img" aria-label="Top B.C. goods exports to the U.S., 2024">
            {c.whyItMatters.bars.map((b) => {
              const max = Math.max(...c.whyItMatters!.bars.map((x) => x.value));
              return (
                <div key={b.label} className="grid grid-cols-[150px_1fr_60px] items-center gap-3 text-sm sm:grid-cols-[200px_1fr_70px]">
                  <span className="text-ink">{b.label}</span>
                  <div className="h-3 rounded-full bg-muted"><div className="h-3 rounded-full bg-navy" style={{ width: `${(b.value / max) * 100}%` }} /></div>
                  <span className="num text-right font-semibold text-ink">{b.display}</span>
                </div>
              );
            })}
            <span className="text-[12px] text-subtle">{c.whyItMatters.note}</span>
          </div>
          {c.whyItMatters.facts && <ul className="grid gap-2 md:grid-cols-3">{c.whyItMatters.facts.map((f) => <li key={f} className="rounded-lg bg-muted p-3 text-sm">{f}</li>)}</ul>}
        </Section>
      )}

      {/* 2. In one minute */}
      {c.oneMinute && (
        <Section eyebrow="The program in one minute" title={p.name} alt={!!c.whyItMatters}>
          <div className="grid gap-4 md:grid-cols-3">{c.oneMinute.map((m) => <div key={m.title} className="card"><h3 className="text-lg font-bold">{m.title}</h3><p className="mt-1 text-body">{m.body}</p></div>)}</div>
        </Section>
      )}

      {/* 3. Key numbers */}
      {c.keyNumbers && (
        <Section eyebrow="Key numbers" title="The numbers that matter" alt={!c.whyItMatters}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {c.keyNumbers.map((k) => <div key={k.label} className="card"><div className="num text-3xl font-extrabold text-ink">{k.value}</div><div className="text-sm text-subtle">{k.label}</div></div>)}
          </div>
        </Section>
      )}

      {/* 4. Streams */}
      {c.streams && (
        <Section eyebrow="Funding streams" title="Pick the stream that fits">
          <div className="grid gap-4 md:grid-cols-3">
            {c.streams.map((s) => (
              <article key={s.name} className="card flex flex-col gap-2">
                <span className="pill-success self-start">{s.tag}</span>
                <h3 className="text-xl font-bold">{s.name}</h3>
                <p className="font-semibold text-ink">{s.amount}</p>
                <p className="text-body">{s.body}</p>
              </article>
            ))}
          </div>
          {c.streamsNotes && <ul className="list-disc space-y-1 pl-5 text-sm text-subtle">{c.streamsNotes.map((n) => <li key={n}>{n}</li>)}</ul>}
        </Section>
      )}

      {/* 5. Who qualifies */}
      {c.qualifies && (
        <Section eyebrow="Who qualifies" title="Eligibility" alt>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {c.qualifies.map((q) => (
              <div key={q.heading} className={`card border-l-4 ${toneClass[q.tone]}`}>
                <h3 className="font-bold">{q.tone === "no" ? "✕ " : q.tone === "yes" ? "✓ " : ""}{q.heading}</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{q.items.map((i) => <li key={i}>{i}</li>)}</ul>
              </div>
            ))}
          </div>
          {c.partnerPath && (
            <div className="card flex flex-col gap-3">
              <h3 className="text-lg font-bold">{c.partnerPath.title}</h3>
              <ol className="grid gap-3 md:grid-cols-4">
                {c.partnerPath.steps.map((s, i) => (
                  <li key={s} className="flex flex-col gap-1 rounded-lg bg-muted p-3"><span className="text-xs font-bold text-brand-text">STEP {i + 1}</span><span className="text-sm text-ink">{s}</span></li>
                ))}
              </ol>
              <p className="text-sm text-subtle">Conditions: {c.partnerPath.conditions.join(" · ")}</p>
            </div>
          )}
          {c.locationCheck && <p className="rounded-lg bg-info-soft p-4 text-sm text-info">{c.locationCheck}</p>}
          {c.sectors && (
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-bold">{c.sectors.title}</h3>
              <div className="flex flex-wrap gap-2">{c.sectors.chips.map((s) => <span key={s} className="pill">{s}</span>)}</div>
              {c.sectors.note && <p className="text-sm text-subtle">{c.sectors.note}</p>}
            </div>
          )}
          {c.fits && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="card"><h3 className="font-bold text-brand-text">Good fits</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{c.fits.good.map((g) => <li key={g}>{g}</li>)}</ul></div>
              <div className="card"><h3 className="font-bold text-danger">Not funded</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{c.fits.notFunded.map((g) => <li key={g}>{g}</li>)}</ul></div>
              <p className="text-sm font-medium text-ink md:col-span-2">{c.fits.rule}</p>
            </div>
          )}
          {c.pivotExamples && (
            <div className="flex flex-col gap-2"><h3 className="text-lg font-bold">What a pivot looks like</h3>
              <div className="flex flex-wrap gap-2">{c.pivotExamples.map((s) => <span key={s} className="pill">{s}</span>)}</div></div>
          )}
        </Section>
      )}

      {/* 6. Quick check */}
      {c.quickCheck && (
        <Section id="quick-check" eyebrow="Quick check" title="See if your project fits">
          <QuickCheck qc={c.quickCheck} programId={p.id} programName={p.slug.toUpperCase()} signedIn={!!session} turnstile={<Turnstile />} />
        </Section>
      )}

      {/* 7. Calculator */}
      {p.calculator && (
        <Section eyebrow="Funding calculator" title="Estimate your funding" alt>
          {p.calculator === "redip" ? <RedipCalculator /> : <RtriCalculators />}
          {c.calculatorNotes && <ul className="list-disc space-y-1 pl-5 text-sm text-subtle">{c.calculatorNotes.map((n) => <li key={n}>{n}</li>)}</ul>}
          {c.proof && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="card"><h3 className="font-bold text-brand-text">Proof that counts</h3><ul className="mt-2 list-disc pl-5 text-sm">{c.proof.counts.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div className="card"><h3 className="font-bold text-danger">Doesn&apos;t count</h3><ul className="mt-2 list-disc pl-5 text-sm">{c.proof.doesntCount.map((x) => <li key={x}>{x}</li>)}</ul></div>
            </div>
          )}
          <p className="text-[13px] text-subtle">Estimates only. Final amounts are set by the program in your funding agreement.</p>
        </Section>
      )}

      {/* 8. Eligible costs */}
      {c.eligibleCosts && (
        <Section eyebrow="Eligible costs" title="What it pays for">
          <div className="card table-wrap p-2">
            <table className="table">
              <thead><tr><th>Cost</th><th>Covered?</th><th>Watch out</th></tr></thead>
              <tbody>
                {c.eligibleCosts.map((e) => (
                  <tr key={e.cost}><td className="text-ink">{e.cost}</td><td>{e.covered ? <span className="pill-success">Yes</span> : <span className="pill-danger">No</span>}</td><td className="text-subtle">{e.note ?? ""}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* 9. How to win */}
      {c.howToWin && (
        <Section eyebrow="How to win" title="What strong applications have in common" alt>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{c.howToWin.map((h) => <div key={h.title} className="card"><h3 className="font-bold">{h.title}</h3><p className="mt-1 text-sm text-body">{h.body}</p></div>)}</div>
          {c.howToWinNote && <p className="text-sm font-medium text-ink">{c.howToWinNote}</p>}
        </Section>
      )}

      {/* 10. Key dates */}
      {c.keyDates && (
        <Section eyebrow="Key dates" title="Timeline">
          <ol className="relative flex flex-col gap-4 border-l-2 border-line pl-6">
            {c.keyDates.map((d) => (
              <li key={d.date + d.label} className="relative">
                <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full bg-brand" />
                <span className="num text-sm font-bold text-brand-text">{d.date}</span>
                <p className="font-semibold text-ink">{d.label}</p>
                {d.body && <p className="text-sm text-subtle">{d.body}</p>}
              </li>
            ))}
          </ol>
          {c.keyDatesCallout && <p className="rounded-lg bg-highlight-soft p-4 text-sm font-medium text-ink">{c.keyDatesCallout}</p>}
        </Section>
      )}

      {/* 11. Document checklist */}
      {c.docChecklist && (
        <Section eyebrow="Document checklist" title="What you'll need" alt>
          <div className="grid gap-4 md:grid-cols-3">
            {c.docChecklist.map((g) => (
              <div key={g.group} className="card"><h3 className="font-bold">{g.group}</h3>
                <ul className="mt-2 flex flex-col gap-1.5 text-sm">{g.items.map((i) => <li key={i} className="flex gap-2"><input type="checkbox" aria-label={i} className="mt-1" />{i}</li>)}</ul></div>
            ))}
          </div>
          {c.docNote && <p className="text-sm text-subtle">{c.docNote}</p>}
          {!session && <p className="text-sm"><Link href="/signup" className="font-semibold text-brand-text underline">Create a free account</Link> to save this checklist and upload documents to your profile.</p>}
        </Section>
      )}

      {/* 12. Next steps */}
      {c.nextSteps && (
        <Section eyebrow="Next steps" title="How to get started">
          <ol className="grid gap-3 md:grid-cols-5">{c.nextSteps.map((s, i) => <li key={s} className="card flex flex-col gap-1"><span className="text-xs font-bold text-brand-text">STEP {i + 1}</span><span className="text-sm text-ink">{s}</span></li>)}</ol>
          {c.nextStepsCallout && <p className="font-semibold text-ink">{c.nextStepsCallout}</p>}
        </Section>
      )}

      {/* 13–14. Fit call + guide */}
      <section id="fit-call" className="border-y border-line bg-surface">
        <div className="container grid scroll-mt-24 gap-8 py-12 lg:grid-cols-[1.2fr_.8fr]">
          <div className="flex flex-col gap-3">
            <span className="eyebrow">Book a Free Fit Call</span>
            <h2 className="text-3xl font-bold">Talk to the Funding Lab Team about {p.slug.toUpperCase()}</h2>
            <FitCallForm programId={p.id} programName={p.slug.toUpperCase()} sourcePage={`grants/${p.slug}`} turnstile={<Turnstile />} />
          </div>
          <GuideDownload programId={p.id} programSlug={p.slug} hasGuide={!!p.guide_pdf_path} />
        </div>
      </section>

      {/* 15–16. Disclaimer, official contact, related */}
      <section className="container flex flex-col gap-3 py-10 text-sm">
        <p className="rounded-lg bg-muted p-4 text-body">{p.disclaimer}</p>
        {c.officialLinks && <p>{c.officialLinks.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="mr-4 font-semibold text-brand-text underline">{l.label} ↗</a>)}</p>}
        <p className="text-subtle">Related: <Link href="/grants" className="underline">Grants Hub</Link> · <Link href="/webinar" className="underline">Join the free Funding Webinar</Link> · <Link href="/contact" className="underline">Contact the Funding Lab Team</Link></p>
        <p className="text-[12px] text-subtle">{BRAND.disclaimer}</p>
      </section>

      <ClosingCta secondary={{ href: "#fit-call", label: "Book a Free Fit Call" }} />
    </>
  );
}

