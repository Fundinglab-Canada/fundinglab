import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessContext } from "@/lib/auth";
import { FEATURE_PLAN, hasFeature, planName, type Feature } from "@/lib/plans";
import { businessPlanCompleteness, capTableSummary, dataRoomCompleteness, type CapEntry } from "@/lib/prep";

export const metadata = { title: "Prep Studio" };

export default async function PrepStudioPage() {
  const { business, plan } = await requireBusinessContext("/app/prep");
  const supabase = await createClient();
  const [{ data: docs }, { data: bp }, { data: cap }] = await Promise.all([
    supabase.from("documents").select("kind, folder").eq("business_id", business.id),
    supabase.from("business_plans").select("sections").eq("business_id", business.id).maybeSingle(),
    supabase.from("cap_tables").select("entries").eq("business_id", business.id).maybeSingle(),
  ]);
  const kinds = new Set((docs ?? []).map((d) => d.kind as string));
  const capRows = capTableSummary((cap?.entries ?? []) as CapEntry[]).rows.length;
  const hasFinancials = kinds.has("financials");
  const loanReady = [!!business.amount_sought, business.use_of_funds.length > 0, hasFinancials, business.revenue_12m != null || business.annual_revenue != null].filter(Boolean).length;

  const items: { title: string; body: string; href: string; pct: number; feature?: Feature; cta: string }[] = [
    { title: "Business plan", body: "Eleven guided sections lenders and grant officers read closely.", href: "/app/prep/business-plan",
      pct: kinds.has("business_plan") ? 100 : businessPlanCompleteness((bp?.sections ?? {}) as Record<string, string>), feature: "prep_templates", cta: "Write it" },
    { title: "Pitch deck", body: "The 12-slide outline investors expect, with tips for each slide. Upload yours for review.", href: "/app/prep/pitch-deck",
      pct: kinds.has("pitch_deck") ? 100 : 0, cta: "Open outline" },
    { title: "Financial model", body: "Download the 3-statement template, fill it in, and upload it to your data room.", href: "/app/prep/financial-model",
      pct: (docs ?? []).some((d) => d.folder === "financial" && d.kind !== "financials" && d.kind !== "tax_returns") ? 100 : hasFinancials ? 50 : 0, cta: "Get the template" },
    { title: "Data room", body: "Standard folders, expiring viewer links, watermarked previews and view analytics.", href: "/app/prep/data-room",
      pct: dataRoomCompleteness((docs ?? []).map((d) => d.folder as string)), feature: "data_room", cta: "Open data room" },
    { title: "Cap table", body: "Who owns what, fully diluted, with an ownership chart and CSV export.", href: "/app/prep/cap-table",
      pct: capRows >= 2 || kinds.has("cap_table") ? 100 : capRows ? 50 : 0, feature: "prep_templates", cta: "Edit cap table" },
    { title: "Loan package", body: "A lender-ready summary from your profile, financials and use of funds. Print or save as PDF.", href: "/app/prep/loan-package",
      pct: Math.round((loanReady / 4) * 100), feature: "loan_package", cta: "Generate" },
  ];

  return (
    <section className="container flex flex-col gap-6 py-10">
      <div>
        <span className="eyebrow">Prep Studio</span>
        <h1 className="mt-1 text-3xl font-bold">Get investor- and lender-ready</h1>
        <p className="max-w-measure text-subtle">Everything funders ask for, in one place. Each item shows how complete it is; finishing them is the fastest way to raise your readiness score.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => {
          const locked = i.feature && !hasFeature(plan, i.feature);
          return (
            <article key={i.title} className="card flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold">{i.title}</h2>
                {locked ? <span className="pill-info">{planName(FEATURE_PLAN[i.feature!])}</span> : <b className="num text-ink">{i.pct}%</b>}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted"><i className="block h-full bg-brand" style={{ width: `${locked ? 0 : i.pct}%` }} /></div>
              <p className="text-sm text-body">{i.body}</p>
              <Link href={locked ? `/pricing?plan=${FEATURE_PLAN[i.feature!]}` : i.href} className={`${locked ? "btn-secondary" : "btn-primary"} btn-sm mt-auto self-start`}>{locked ? "See plans" : i.cta}</Link>
            </article>
          );
        })}
      </div>
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-body">Prefer an expert to build it? Funding Lab partners write business plans, build models, and set up data rooms.</p>
        <div className="flex gap-2"><Link href="/services/business_plan?from=prep" className="btn-secondary btn-sm">Business Plan service</Link><Link href="/services/financial_model?from=prep" className="btn-secondary btn-sm">Financial Model service</Link></div>
      </div>
    </section>
  );
}
