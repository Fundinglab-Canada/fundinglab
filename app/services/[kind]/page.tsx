import Link from "next/link";
import { notFound } from "next/navigation";
import { SERVICES, type ServiceKind } from "@/lib/constants";
import { SERVICE_PAGES } from "@/content/services";
import { getSessionProfile, getMyBusiness } from "@/lib/auth";
import { ServiceRequestForm } from "@/components/services/service-request-form";
import { MeetingForm } from "@/components/services/meeting-form";
import { PayNowBar } from "@/components/services/pay-now-bar";
import { TrendingGrants } from "@/components/services/trending-grants";
import { BENEFITS_FINDER_URL, IsedFinder } from "@/components/grants/ised-finder";
import { Turnstile } from "@/components/turnstile";

export function generateStaticParams() {
  return SERVICES.map((s) => ({ kind: s.kind }));
}

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const s = SERVICES.find((x) => x.kind === kind);
  return s ? { title: `${s.name} — Services`, description: s.desc } : {};
}

export default async function ServicePage({ params, searchParams }: { params: Promise<{ kind: string }>; searchParams: Promise<{ from?: string }> }) {
  const { kind } = await params;
  const { from } = await searchParams;
  const service = SERVICES.find((s) => s.kind === kind);
  if (!service) notFound();
  const page = SERVICE_PAGES[service.kind as ServiceKind];
  const session = await getSessionProfile().catch(() => null);
  const business = session ? await getMyBusiness().catch(() => null) : null;
  const defaults = { name: session?.profile.full_name ?? "", email: session?.profile.email ?? "", business_name: business?.name ?? "" };

  return (
    <>
      <PayNowBar signedIn={!!session} />
      <section className="border-b border-line bg-surface">
        <div className="container flex flex-col gap-4 py-10 md:py-14">
          <Link href="/services" className="text-sm text-subtle hover:underline">← All services</Link>
          <span className="eyebrow">{service.category === "funding" ? "Get Funded" : "Grow With Your Funding"}</span>
          <h1 className="max-w-3xl text-3xl font-extrabold md:text-4xl">{service.name}: {page.headline.charAt(0).toLowerCase() + page.headline.slice(1)}</h1>
          <p className="max-w-measure text-[17px] text-body">{service.desc}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <a href="#meeting" className="btn-secondary justify-center">Book a 15-min meeting</a>
            <a href="#quote" className="btn-cta justify-center">Request a quote</a>
          </div>
        </div>
      </section>

      {page.sections.map((sec) => (
        <section key={sec.title} className="container flex flex-col gap-5 py-12">
          <div><h2 className="text-2xl font-bold md:text-3xl">{sec.title}</h2>{sec.intro && <p className="mt-2 max-w-measure text-subtle">{sec.intro}</p>}</div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sec.items.map((it) => (
              <div key={it.name} className="card flex flex-col gap-1.5"><h3 className="text-lg font-bold">{it.name}</h3><p className="text-sm text-subtle">{it.body}</p></div>
            ))}
          </div>
        </section>
      ))}

      {service.kind === "grant_writing" && (
        <>
          <div className="container py-12"><TrendingGrants /></div>
          <section id="finder" className="container scroll-mt-24 py-12"><IsedFinder compact url={BENEFITS_FINDER_URL} /></section>
        </>
      )}

      <section className="container flex flex-col gap-4 py-12">
        <h2 className="text-2xl font-bold md:text-3xl">How it works</h2>
        <ol className="grid gap-4 md:grid-cols-4">
          {page.steps.map((s, i) => (
            <li key={s} className="flex flex-col gap-1 border-t-4 border-brand pt-3"><span className="text-xs font-bold text-brand-text">STEP {i + 1}</span><span className="text-ink">{s}</span></li>
          ))}
        </ol>
      </section>

      <section className="container grid items-start gap-6 pb-14 lg:grid-cols-2">
        <div id="quote" className="scroll-mt-24">
          <ServiceRequestForm kind={service.kind} trigger={from === "dashboard" ? "dashboard_recommendation" : "services_page"} defaults={defaults} turnstile={<Turnstile />} />
        </div>
        <div id="meeting" className="scroll-mt-24">
          <MeetingForm kind={service.kind} defaults={defaults} turnstile={<Turnstile />} />
        </div>
      </section>
    </>
  );
}
