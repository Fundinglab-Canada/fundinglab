import Link from "next/link";
import { SERVICES } from "@/lib/constants";
import { checkoutService, requestQuote } from "@/app/services/actions";

type Mode = "public" | "app";

/** Two service groups (§ services): Get Funded, and Grow With Your Funding. */
export function ServiceCatalog({ mode, signedIn, highlight = [] }: { mode: Mode; signedIn: boolean; highlight?: string[] }) {
  const funding = SERVICES.filter((s) => s.category === "funding");
  const growth = SERVICES.filter((s) => s.category === "growth");
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4" aria-labelledby="get-funded">
        <div>
          <h2 id="get-funded" className="text-2xl font-bold">Get Funded</h2>
          <p className="text-subtle">Done-for-you work that gets you ready for grants, lenders and investors.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {funding.map((s) => (
            <article key={s.kind} id={s.kind} className={`card flex flex-col gap-3 ${highlight.includes(s.kind) ? "ring-2 ring-brand" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold">{s.name}</h3>
                <span className="num whitespace-nowrap text-sm font-medium text-ink">{s.priceLabel}</span>
              </div>
              <p className="font-medium text-ink">{s.promise}</p>
              <p className="text-sm text-subtle">{s.desc}</p>
              {mode === "app" && signedIn ? (
                <form action={requestQuote} className="mt-auto flex flex-col gap-2">
                  <input type="hidden" name="kind" value={s.kind} />
                  <input type="hidden" name="trigger_source" value={highlight.includes(s.kind) ? "dashboard_recommendation" : "services_page"} />
                  <label className="field">What do you need?
                    <textarea name="message" rows={2} maxLength={2000} className="input" placeholder="Timeline, scope, anything we should know" />
                  </label>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button className="btn-secondary btn-sm">Request a quote</button>
                    {s.priceCents != null && <button formAction={checkoutService} className="btn-primary btn-sm">Pay deposit</button>}
                  </div>
                </form>
              ) : (
                <Link href={signedIn ? `/app/services#${s.kind}` : `/signup?next=${encodeURIComponent(`/app/services#${s.kind}`)}`} className="btn-secondary btn-sm mt-auto self-start">
                  {s.priceCents != null ? "Get started" : "Request a quote"}
                </Link>
              )}
            </article>
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-4" aria-labelledby="grow">
        <div>
          <h2 id="grow" className="text-2xl font-bold">Grow With Your Funding</h2>
          <p className="text-subtle">Put the money to work: people, technology and customers.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {growth.map((s) => (
            <article key={s.kind} id={s.kind} className={`card flex flex-col gap-3 ${highlight.includes(s.kind) ? "ring-2 ring-brand" : ""}`}>
              <h3 className="text-lg font-bold">{s.name}</h3>
              <p className="font-medium text-ink">{s.promise}</p>
              <p className="text-sm text-subtle">{s.desc}</p>
              <Link href={`${"href" in s ? s.href : "/services"}${highlight.includes(s.kind) ? "?from=dashboard" : ""}`} className="btn-secondary btn-sm mt-auto self-start">Get a quote</Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
