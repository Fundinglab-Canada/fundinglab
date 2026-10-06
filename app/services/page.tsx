import { SERVICES } from "@/lib/constants";
import { getSessionProfile } from "@/lib/auth";
import { checkoutService, requestQuote } from "./actions";

export const metadata = { title: "Services" };

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ status?: string; service?: string }> }) {
  const sp = await searchParams;
  const session = await getSessionProfile();
  return (
    <section className="container flex flex-col gap-6 py-14">
      <div className="max-w-measure">
        <span className="eyebrow">Services</span>
        <h1 className="mt-2 text-4xl font-extrabold">Done-for-you funding work</h1>
        <p className="mt-3 text-subtle">Fixed-scope services delivered by vetted Funding Lab experts. Pay a deposit by card or request a custom quote.</p>
      </div>
      {sp.status === "paid" && <p className="pill-success self-start px-4 py-2 text-sm">Payment received. We will contact you within one business day.</p>}
      {sp.status === "quote" && <p className="pill-success self-start px-4 py-2 text-sm">Quote request sent. We reply within one business day.</p>}
      {sp.status === "cancelled" && <p className="pill-warning self-start px-4 py-2 text-sm">Checkout cancelled. Nothing was charged.</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {SERVICES.map((s) => (
          <div key={s.kind} id={s.kind} className="card flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold">{s.name}</h2>
              <p className="text-subtle">{s.desc}</p>
            </div>
            {session ? (
              <div className="mt-auto flex flex-col gap-3">
                <form action={requestQuote} className="flex flex-col gap-2">
                  <input type="hidden" name="kind" value={s.kind} />
                  <label className="field">What do you need?
                    <textarea name="message" rows={2} className="input" placeholder="Timeline, scope, anything we should know" />
                  </label>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="num font-medium text-ink">{s.priceLabel}</span>
                    <div className="flex gap-2">
                      <button className="btn-secondary btn-sm">Request a quote</button>
                      <button formAction={checkoutService} className="btn-primary btn-sm">Pay deposit</button>
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              <div className="mt-auto flex items-center justify-between">
                <span className="num font-medium text-ink">{s.priceLabel}</span>
                <a href={`/login?next=/services%23${s.kind}`} className="btn-primary btn-sm">Sign in to request a quote</a>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
