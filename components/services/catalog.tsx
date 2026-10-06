import Link from "next/link";
import { SERVICES } from "@/lib/constants";

type Service = (typeof SERVICES)[number];

function ServiceCard({ s, highlighted, from }: { s: Service; highlighted: boolean; from?: string }) {
  const href = `/services/${s.kind}${from ? `?from=${from}` : ""}`;
  return (
    <article id={s.kind} className={`card flex scroll-mt-24 flex-col gap-3 ${highlighted ? "ring-2 ring-brand" : ""}`}>
      <h3 className="text-lg font-bold"><Link href={href} className="hover:underline">{s.name}</Link></h3>
      <p className="font-medium text-ink">{s.promise}</p>
      <p className="text-sm text-subtle">{s.desc}</p>
      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <Link href={`${href}#quote`} className="btn-cta btn-sm">Get a quote</Link>
        <Link href={`${href}#meeting`} className="btn-secondary btn-sm">Book 15-min meeting</Link>
      </div>
    </article>
  );
}

/** Two service groups: Get Funded, and Grow With Your Funding. Every service is quote-based. */
export function ServiceCatalog({ highlight = [] }: { highlight?: string[] }) {
  const funding = SERVICES.filter((s) => s.category === "funding");
  const growth = SERVICES.filter((s) => s.category === "growth");
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4" aria-labelledby="get-funded">
        <div>
          <h2 id="get-funded" className="text-2xl font-bold">Get Funded</h2>
          <p className="text-subtle">Done-for-you work that gets you ready for grants, lenders and investors.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {funding.map((s) => <ServiceCard key={s.kind} s={s} highlighted={highlight.includes(s.kind)} />)}
        </div>
      </section>
      <section className="flex flex-col gap-4" aria-labelledby="grow">
        <div>
          <h2 id="grow" className="text-2xl font-bold">Grow With Your Funding</h2>
          <p className="text-subtle">Put the money to work: product, customers, people and IP.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {growth.map((s) => <ServiceCard key={s.kind} s={s} highlighted={highlight.includes(s.kind)} from={highlight.includes(s.kind) ? "dashboard" : undefined} />)}
        </div>
      </section>
    </div>
  );
}
