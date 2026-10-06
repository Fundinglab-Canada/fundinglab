import { createClient } from "@/lib/supabase/server";
import type { DealRow } from "@/lib/types";
import { Kanban } from "@/components/admin/kanban";
import { money } from "@/lib/format";

export const metadata = { title: "Deal pipeline" };

export default async function PipelinePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("deals")
    .select("*, businesses(name), partners(display_name)")
    .order("position")
    .order("created_at");
  const deals = (data ?? []) as DealRow[];
  const earned = deals.reduce((s, d) => s + Number(d.commission_amount ?? 0), 0);
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-3xl font-bold">Deal pipeline</h1><p className="text-sm text-subtle">Drag cards between columns, or use the status menu on each card.</p></div>
        <div className="flex items-center gap-3"><span className="text-sm text-subtle">Commission earned <b className="num text-ink">{money(earned)}</b></span>
          <a href="/api/admin/export/deals" className="btn-secondary btn-sm">Export CSV</a></div>
      </div>
      <Kanban deals={deals} />
    </>
  );
}
