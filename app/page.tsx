import Link from "next/link";
import { Icon } from "@/components/icons";
import { BRAND, FUNDING_PATHS, SERVICES, stageName } from "@/lib/constants";

const LEDGER: [string, string][] = [
  ["IRAP – NRC", "$148,500"],
  ["CanExport SMEs – GAC", "$37,200"],
  ["Angel round (2022)", "$350,000"],
  ["CSBFP loan (2023)", "$250,000"],
];

export default function HomePage() {
  return (
    <>
      <section className="border-b border-line bg-white">
        <div className="container grid items-center gap-10 py-14 md:grid-cols-[1.15fr_.85fr] md:py-20">
          <div className="flex flex-col gap-5">
            <span className="eyebrow">Funding marketplace for Canadian businesses</span>
            <h1 className="text-4xl font-extrabold tracking-tight md:text-[52px] md:leading-[1.05]">
              Every funding path.<br />One place.
            </h1>
            <p className="max-w-[52ch] text-[17px] text-subtle">
              Build one profile, see where you are in your funding journey, pull your federal grant history
              automatically, and get introduced privately to vetted funders and experts.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/login?next=/profile" className="btn-primary">Find out where you are in your funding journey</Link>
              <Link href="/paths" className="btn-secondary">Explore funding paths</Link>
            </div>
          </div>
          <div className="rounded-xl bg-navy p-5 font-mono text-[13px] text-white shadow-lg" aria-label="Sample funding ledger">
            <div className="flex justify-between border-b border-dashed border-white/20 pb-2 text-white/70">
              <span>NORTHWIND ROBOTICS INC.</span><span>BURNABY, BC</span>
            </div>
            {LEDGER.map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-dashed border-white/20 py-2"><span>{k}</span><span>{v}</span></div>
            ))}
            <div className="flex justify-between pt-2"><span className="text-white/70">Raised to date</span><span className="font-medium text-leaf-onnavy">$785,700</span></div>
            <p className="mt-3 font-sans text-xs text-white/60">Sample company for illustration.</p>
          </div>
        </div>
      </section>

      <section className="container flex flex-col gap-6 py-14">
        <div><span className="eyebrow">Seven funding paths</span><h2 className="mt-2 text-3xl font-bold">Know which money fits your stage</h2></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FUNDING_PATHS.map((p) => (
            <Link key={p.id} href={`/paths#${p.id}`} className="card flex flex-col gap-2 hover:border-teal">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-soft text-teal-text"><Icon name={p.icon} /></span>
              <h3 className="text-lg font-bold">{p.name}</h3>
              <p className="text-sm text-subtle">{p.who}</p>
              <div className="mt-auto flex flex-wrap gap-1 pt-1">{p.stages.map((s) => <span key={s} className="pill">{stageName(s)}</span>)}</div>
            </Link>
          ))}
          <div className="card flex flex-col gap-3 border-navy bg-navy text-white">
            <h3 className="text-lg font-bold text-white">Not sure where you fit?</h3>
            <p className="text-sm text-white/80">The five-step assessment places you on the journey and recommends paths in about 10 minutes.</p>
            <Link href="/login?next=/profile" className="btn-primary btn-sm mt-auto self-start">Start assessment</Link>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="container flex flex-col gap-6 py-14">
          <div><span className="eyebrow">How it works</span><h2 className="mt-2 text-3xl font-bold">Profile → Assessment → Match → Funded</h2></div>
          <ol className="grid gap-6 md:grid-cols-4">
            {[
              ["Profile", "Basics, stage, need, history and documents. We pull your federal grant records from Government of Canada open data."],
              ["Assessment", "Your Funding Readiness Score and the funding paths that fit your stage."],
              ["Match", "Our team reviews ranked partner matches and makes private introductions with your consent."],
              ["Funded", "Track every conversation from introduction to term sheet in one place."],
            ].map(([t, d], i) => (
              <li key={t} className="border-t-[3px] border-teal pt-4">
                <span className="num text-xs font-medium text-teal-text">STEP {i + 1}</span>
                <h3 className="mt-1 text-lg font-bold">{t}</h3>
                <p className="text-sm text-subtle">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container flex flex-col gap-6 py-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><span className="eyebrow">Services</span><h2 className="mt-2 text-3xl font-bold">Get investor-ready faster</h2></div>
          <Link href="/services" className="btn-secondary">All services</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <div key={s.kind} className="card flex flex-col gap-2">
              <h3 className="text-lg font-bold">{s.name}</h3>
              <p className="text-sm text-subtle">{s.desc}</p>
              <span className="num mt-auto pt-2 text-sm font-medium text-ink">{s.priceLabel}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="container flex flex-col gap-4 pb-14">
        <span className="eyebrow">Featured partners</span>
        <div className="flex flex-wrap gap-3">
          {BRAND.featuredPartners.map((n) => (
            <div key={n} className="flex flex-[1_1_200px] items-center gap-3 rounded-lg border border-line bg-white p-4 font-display text-base font-bold text-ink">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-navy font-mono text-xs text-white">
                {n.split(" ").map((w) => w[0]).join("").slice(0, 2)}
              </span>
              {n}
            </div>
          ))}
        </div>
        <p className="text-sm text-subtle">
          Partner identities in our matching network stay private. Introductions happen only through Funding Lab, with consent on both sides.
        </p>
      </section>

      <section className="border-t border-line bg-white">
        <div className="container grid gap-8 py-14 md:grid-cols-3">
          {[
            ["Our IRAP and CanExport history showed up before I finished typing our name. The readiness score told us exactly what was missing for a CSBFP application.", "Founder, food manufacturer · Langley, BC"],
            ["We met two angels through Funding Lab and closed a $400K seed round in 11 weeks.", "CEO, edtech platform · Calgary, AB"],
            ["The data room service saved our CFO a month of diligence prep before our Series A.", "COO, cleantech startup · Vancouver, BC"],
          ].map(([q, w]) => (
            <figure key={w} className="flex flex-col gap-3">
              <blockquote className="text-[17px] text-ink">“{q}”</blockquote>
              <figcaption className="text-sm text-subtle">{w}</figcaption>
            </figure>
          ))}
          {/* Replace with real, consented testimonials before launch. */}
        </div>
      </section>
    </>
  );
}
