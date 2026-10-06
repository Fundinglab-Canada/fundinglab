import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { dateShort } from "@/lib/format";
import { INDUSTRIES, STAGES } from "@/lib/constants";
import type { DealFlowItem } from "@/lib/partners/types";
import { OpportunitySummary } from "@/components/partner/opportunity";
import { expressInterest, passOpportunity } from "../actions";

export const metadata = { title: "Deal flow" };

const STATUS: Record<string, string> = { suggested: "Interest sent — under review", approved: "Introduction proposed", mutual: "Connected", declined: "Declined", expired: "Expired", dismissed: "Not progressed" };

export default async function DealFlowPage({ searchParams }: { searchParams: Promise<{ stage?: string; industry?: string }> }) {
  const { userId } = await requireUser("/partner/deal-flow");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: partner } = await supabase.from("partners").select("status").eq("user_id", userId).maybeSingle();
  if (!partner) redirect("/partners/join");
  if (partner.status !== "active") redirect("/partner");
  const { data } = await supabase.rpc("fl_partner_deal_flow");
  const items = ((data ?? []) as DealFlowItem[]).filter((i) => (!sp.stage || i.stage === sp.stage) && (!sp.industry || i.industry === sp.industry));
  return (
    <section className="container flex flex-col gap-5 py-10">
      <div>
        <span className="eyebrow">Deal flow</span>
        <h1 className="mt-1 text-3xl font-bold">Anonymized opportunities</h1>
        <p className="text-subtle">Businesses that opted in to matching. No names, websites or documents until a mutual introduction.</p>
      </div>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="field">Stage<select name="stage" defaultValue={sp.stage ?? ""} className="input"><option value="">All</option>{STAGES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label className="field">Industry<select name="industry" defaultValue={sp.industry ?? ""} className="input"><option value="">All</option>{INDUSTRIES.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}</select></label>
        <button className="btn-secondary">Filter</button>
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((o) => (
          <article key={o.opportunity_ref} className="card flex flex-col gap-3">
            <div className="flex items-center justify-between text-[13px] text-subtle"><span className="num">Ref {o.opportunity_ref.slice(0, 8).toUpperCase()}</span><span>Listed {dateShort(o.listed_at)}</span></div>
            <OpportunitySummary o={o} />
            {o.interest_status ? (
              <span className="pill-info self-start">{STATUS[o.interest_status] ?? o.interest_status}</span>
            ) : (
              <div className="flex gap-2">
                <form action={expressInterest}><input type="hidden" name="ref" value={o.opportunity_ref} /><button className="btn-primary btn-sm">Interested</button></form>
                <form action={passOpportunity}><input type="hidden" name="ref" value={o.opportunity_ref} /><button className="btn-secondary btn-sm">Pass</button></form>
              </div>
            )}
          </article>
        ))}
      </div>
      {!items.length && <p className="text-subtle">No opportunities match right now. New businesses are added as they complete their profiles.</p>}
    </section>
  );
}
