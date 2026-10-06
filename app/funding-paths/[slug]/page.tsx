import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { ClosingCta, PrimaryCta } from "@/components/cta";
import { FUNDING_PATHS, STAGES, stageName } from "@/lib/constants";

export function generateStaticParams() {
  return FUNDING_PATHS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = FUNDING_PATHS.find((x) => x.slug === slug);
  return p ? { title: `${p.name} for Canadian businesses`, description: p.who } : {};
}

export default async function FundingPathPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = FUNDING_PATHS.find((x) => x.slug === slug);
  if (!p) notFound();
  const others = FUNDING_PATHS.filter((x) => x.slug !== slug && x.stages.some((s) => (p.stages as readonly string[]).includes(s))).slice(0, 3);

  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="container flex flex-col gap-5 py-12">
          <Link href="/funding-paths" className="text-sm text-subtle hover:underline">← All funding paths</Link>
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-brand-soft text-brand-text"><Icon name={p.icon} size={24} /></span>
            <h1 className="text-4xl font-extrabold">{p.name}</h1>
          </div>
          <p className="max-w-[62ch] text-[17px] text-body">{p.who}</p>
          <PrimaryCta stage={p.stages[0]} />
        </div>
      </section>
      <section className="container grid gap-5 py-12 md:grid-cols-3">
        <div className="card flex flex-col gap-2">
          <h2 className="text-lg font-bold">Typical stage</h2>
          <div className="flex flex-wrap gap-1">{STAGES.map((s) => <span key={s.id} className={(p.stages as readonly string[]).includes(s.id) ? "pill-success" : "pill opacity-50"}>{s.name}</span>)}</div>
        </div>
        <div className="card flex flex-col gap-2"><h2 className="text-lg font-bold">Typical amounts</h2><p className="num text-2xl font-extrabold text-ink">{p.range}</p></div>
        <div className="card flex flex-col gap-2">
          <h2 className="text-lg font-bold">How Funding Lab helps</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">{p.help.map((h) => <li key={h}>{h}</li>)}</ul>
        </div>
      </section>
      {others.length > 0 && (
        <section className="container flex flex-col gap-3 pb-6">
          <h2 className="text-xl font-bold">Often combined with</h2>
          <div className="flex flex-wrap gap-2">{others.map((o) => <Link key={o.slug} href={`/funding-paths/${o.slug}`} className="btn-secondary btn-sm">{o.name} · {o.stages.map(stageName).join(", ")}</Link>)}</div>
        </section>
      )}
      <ClosingCta />
    </>
  );
}
