import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessContext } from "@/lib/auth";
import { hasFeature } from "@/lib/plans";
import { BUSINESS_PLAN_SECTIONS, businessPlanCompleteness } from "@/lib/prep";
import { UpgradeCard } from "@/components/app/upgrade-card";
import { PrintButton } from "@/components/print-button";
import { saveBusinessPlan } from "../actions";

export const metadata = { title: "Business plan" };

export default async function BusinessPlanPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { business, plan } = await requireBusinessContext("/app/prep/business-plan");
  const sp = await searchParams;
  const head = (
    <div>
      <Link href="/app/prep" className="no-print text-sm text-subtle hover:underline">← Prep Studio</Link>
      <span className="eyebrow mt-3 block">Business plan</span>
      <h1 className="mt-1 text-3xl font-bold">{business.name} — Business plan</h1>
    </div>
  );
  if (!hasFeature(plan, "prep_templates")) {
    return <section className="container flex max-w-4xl flex-col gap-6 py-10">{head}<UpgradeCard feature="prep_templates" title="The guided business plan is part of Starter">Eleven sections with prompts that match what lenders, investors and grant officers look for. Save as you go and print to PDF.</UpgradeCard></section>;
  }
  const supabase = await createClient();
  const { data } = await supabase.from("business_plans").select("sections, updated_at").eq("business_id", business.id).maybeSingle();
  const sections = (data?.sections ?? {}) as Record<string, string>;
  const pct = businessPlanCompleteness(sections);

  return (
    <section className="container flex max-w-4xl flex-col gap-6 py-10">
      {head}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-measure text-subtle">Write each section in plain language. A section counts as done at about 150 characters, but most good sections run a few paragraphs. <b className="num text-ink">{pct}%</b> complete.</p>
        <PrintButton label="Print / save as PDF" />
      </div>
      {sp.saved && <p className="no-print pill-success self-start px-4 py-2 text-sm" role="status">Saved.</p>}
      {sp.error && <p className="no-print rounded-md bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">{sp.error}</p>}
      <div className="hidden flex-col gap-4 print:flex">
        {BUSINESS_PLAN_SECTIONS.filter((s) => sections[s.id]?.trim()).map((s, i) => (
          <div key={s.id}><h2 className="text-xl font-bold">{i + 1}. {s.title}</h2><p className="whitespace-pre-wrap text-body">{sections[s.id]}</p></div>
        ))}
      </div>
      <form action={saveBusinessPlan} className="flex flex-col gap-5 print:hidden">
        {BUSINESS_PLAN_SECTIONS.map((s, i) => (
          <label key={s.id} className="card flex flex-col gap-2">
            <span className="text-lg font-bold text-ink">{i + 1}. {s.title}</span>
            <span className="no-print help">{s.prompt}</span>
            <textarea name={s.id} defaultValue={sections[s.id] ?? ""} rows={6} maxLength={8000} className="input font-normal" />
          </label>
        ))}
        <div className="no-print sticky bottom-3 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-3 shadow-soft">
          <button className="btn-primary">Save business plan</button>
          <Link href="/services/business_plan?from=prep" className="btn-ghost">Get an expert review</Link>
          <span className="help">AI drafting from your profile is coming in a later release.</span>
        </div>
      </form>
    </section>
  );
}
