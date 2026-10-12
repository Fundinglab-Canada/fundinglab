import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessContext } from "@/lib/auth";
import { hasFeature } from "@/lib/plans";
import type { CapEntry } from "@/lib/prep";
import { CapTableEditor } from "@/components/app/cap-table-editor";
import { UpgradeCard } from "@/components/app/upgrade-card";

export const metadata = { title: "Cap table" };

export default async function CapTablePage() {
  const { business, plan } = await requireBusinessContext("/app/prep/cap-table");
  const supabase = await createClient();
  const { data } = hasFeature(plan, "prep_templates")
    ? await supabase.from("cap_tables").select("entries").eq("business_id", business.id).maybeSingle()
    : { data: null };
  return (
    <section className="container flex flex-col gap-6 py-10">
      <Link href="/app/prep" className="text-sm text-subtle hover:underline">← Prep Studio</Link>
      <div>
        <span className="eyebrow">Cap table</span>
        <h1 className="mt-1 text-3xl font-bold">Who owns {business.name}</h1>
        <p className="max-w-measure text-subtle">List every shareholder, option pool and convertible (SAFEs and notes as-converted). Investors check this first; keep it matched to your share register.</p>
      </div>
      {hasFeature(plan, "prep_templates")
        ? <div className="card"><CapTableEditor initial={(data?.entries ?? []) as CapEntry[]} company={business.name} /></div>
        : <UpgradeCard feature="prep_templates" title="The cap table editor is part of Starter">Fully diluted ownership, a chart, and CSV export for your data room.</UpgradeCard>}
      <p className="text-sm text-subtle">Modelling a new round? Use the <Link href="/app/calculators" className="underline">dilution calculator</Link>.</p>
    </section>
  );
}
