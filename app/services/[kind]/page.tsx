import Link from "next/link";
import { notFound } from "next/navigation";
import { GROWTH_QUOTE_FIELDS, SERVICES, type GrowthKind } from "@/lib/constants";
import { getSessionProfile, getMyBusiness } from "@/lib/auth";
import { GrowthQuoteForm } from "@/components/services/growth-quote-form";
import { Turnstile } from "@/components/turnstile";

export function generateStaticParams() {
  return Object.keys(GROWTH_QUOTE_FIELDS).map((kind) => ({ kind }));
}

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const cfg = GROWTH_QUOTE_FIELDS[kind as GrowthKind];
  return cfg ? { title: `${cfg.title} — Services`, description: cfg.intro } : {};
}

export default async function GrowthServicePage({ params, searchParams }: { params: Promise<{ kind: string }>; searchParams: Promise<{ from?: string }> }) {
  const { kind } = await params;
  const { from } = await searchParams;
  const cfg = GROWTH_QUOTE_FIELDS[kind as GrowthKind];
  if (!cfg) notFound();
  const service = SERVICES.find((s) => s.kind === kind)!;
  const session = await getSessionProfile().catch(() => null);
  const business = session ? await getMyBusiness().catch(() => null) : null;
  return (
    <section className="container grid items-start gap-10 py-12 lg:grid-cols-[.9fr_1.1fr]">
      <div className="flex flex-col gap-4">
        <Link href="/services" className="text-sm text-subtle hover:underline">← All services</Link>
        <span className="eyebrow">Grow With Your Funding</span>
        <h1 className="text-4xl font-extrabold">{cfg.title}</h1>
        <p className="text-lg font-medium text-ink">{service.promise}</p>
        <p className="text-body">{service.desc}</p>
        <p className="text-subtle">{cfg.intro}</p>
      </div>
      <GrowthQuoteForm
        kind={kind as GrowthKind}
        trigger={from === "dashboard" ? "dashboard_recommendation" : "services_page"}
        defaults={{ name: session?.profile.full_name ?? "", email: session?.profile.email ?? "", business_name: business?.name ?? "" }}
        turnstile={<Turnstile />}
      />
    </section>
  );
}
