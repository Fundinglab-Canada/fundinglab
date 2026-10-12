import Link from "next/link";
import type { Metadata } from "next";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PLANS, isPlan, planName } from "@/lib/plans";
import { CTA } from "@/lib/constants";
import { ClosingCta } from "@/components/cta";
import { startSubscription } from "./actions";

export const metadata: Metadata = {
  title: "Plans",
  description: "Start free. Upgrade for the full program matcher, Application Center, Prep Studio and an investor-ready data room.",
};

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ plan?: string; error?: string }> }) {
  const sp = await searchParams;
  const session = await getSessionProfile().catch(() => null);
  let current: string = "free";
  if (session) {
    const { data } = await (await createClient()).rpc("fl_my_plan");
    if (isPlan(data)) current = data;
  }
  const highlight = isPlan(sp.plan) ? sp.plan : "growth";

  return (
    <>
      <section className="container flex flex-col gap-8 py-14">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 text-center">
          <span className="eyebrow">Plans</span>
          <h1 className="text-4xl font-bold">Start free. Upgrade when you&apos;re ready to apply.</h1>
          <p className="text-lg text-subtle">Every account gets the readiness assessment, grant history lookup and a funding roadmap. Paid plans add the tools for applying and raising. Prices in CAD; cancel anytime.</p>
          {session && <p className="text-sm text-subtle">You&apos;re on <b className="text-ink">{planName(current)}</b>.</p>}
        </div>
        {sp.error && <p className="mx-auto rounded-md bg-warning-soft px-4 py-2 text-sm text-warning" role="alert">{sp.error} <Link href="/contact?topic=General%20question" className="underline">Contact us</Link></p>}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => {
            const isCurrent = session && p.id === current;
            return (
              <article key={p.id} className={`card flex flex-col gap-4 ${p.id === highlight ? "border-2 border-brand" : ""}`}>
                <div>
                  <h2 className="text-xl font-bold">{p.name}</h2>
                  <p className="text-sm text-subtle">{p.blurb}</p>
                </div>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {p.features.map((f) => <li key={f} className="flex gap-2"><span className="text-brand-text">✓</span>{f}</li>)}
                </ul>
                <div className="mt-auto">
                  {isCurrent ? <span className="pill-success">Your plan</span>
                    : p.id === "free" ? (session ? null : <Link href={CTA.href} className="btn-cta w-full">{CTA.label}</Link>)
                    : (
                      <form action={startSubscription}><input type="hidden" name="plan" value={p.id} />
                        <button className="btn-primary w-full">{session ? `Choose ${p.name}` : `Start with ${p.name}`}</button></form>
                    )}
                </div>
              </article>
            );
          })}
        </div>
        <div className="mx-auto flex max-w-3xl flex-col gap-2 text-center text-sm text-subtle">
          <p>Enrolled in the Road to Funding cohort? You get Growth features free for the 8 weeks.</p>
          <p>Services (grant writing, business plans, loan consulting and more) are quoted separately on the <Link href="/services" className="underline">Services</Link> page.</p>
        </div>
      </section>
      <ClosingCta secondary={{ href: "/assessment", label: "Not sure yet? Take the free Funding Check first" }} />
    </>
  );
}
