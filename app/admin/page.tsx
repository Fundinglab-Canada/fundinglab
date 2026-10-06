import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DEAL_STATUSES } from "@/lib/constants";
import { dateShort, money } from "@/lib/format";

export default async function AdminOverview() {
  const supabase = await createClient();
  const [biz, partners, deals, orders, runs] = await Promise.all([
    supabase.from("businesses").select("id, created_at", { count: "exact" }),
    supabase.from("partners").select("status"),
    supabase.from("deals").select("status, expected_amount, commission_rate, commission_amount"),
    supabase.from("service_orders").select("status, amount"),
    supabase.from("grant_sync_runs").select("*").order("started_at", { ascending: false }).limit(1),
  ]);
  const ds = deals.data ?? [];
  const open = ds.filter((d) => !["funded", "closed_lost"].includes(d.status));
  const earned = ds.reduce((s, d) => s + Number(d.commission_amount ?? 0), 0);
  const weighted = ds.filter((d) => ["in_discussion", "term_sheet"].includes(d.status)).reduce((s, d) => s + Number(d.expected_amount ?? 0) * Number(d.commission_rate), 0);
  const serviceRevenue = (orders.data ?? []).filter((o) => ["paid", "in_progress", "delivered"].includes(o.status)).reduce((s, o) => s + Number(o.amount ?? 0), 0);
  const pendingPartners = (partners.data ?? []).filter((p) => p.status === "pending").length;
  const quoteRequests = (orders.data ?? []).filter((o) => o.status === "quote_requested").length;
  const weekAgo = Date.now() - 7 * 864e5;
  const newBiz = (biz.data ?? []).filter((b) => new Date(b.created_at).getTime() > weekAgo).length;
  const lastRun = runs.data?.[0];

  const stats: [string, string, string][] = [
    ["Businesses", String(biz.count ?? 0), `${newBiz} new this week`],
    ["Active partners", String((partners.data ?? []).filter((p) => p.status === "active").length), `${pendingPartners} awaiting approval`],
    ["Open pipeline", money(open.reduce((s, d) => s + Number(d.expected_amount ?? 0), 0), true), `${open.length} deals`],
    ["Success fees earned", money(earned), `Weighted pipeline ${money(weighted, true)}`],
  ];

  return (
    <>
      <div className="flex items-end justify-between"><h1 className="text-3xl font-bold">Overview</h1>
        <div className="flex gap-2"><a href="/api/admin/export/deals" className="btn-secondary btn-sm">Export deals CSV</a><a href="/api/admin/export/businesses" className="btn-secondary btn-sm">Export businesses CSV</a></div></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([l, v, s]) => (
          <div key={l} className="card"><span className="text-[13px] text-subtle">{l}</span><b className="num block text-2xl font-medium text-ink">{v}</b><span className="text-[13px] text-subtle">{s}</span></div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card flex flex-col gap-2">
          <h2 className="text-lg font-bold">Needs attention</h2>
          <Link href="/admin/partners" className="flex justify-between border-t border-line py-2 first:border-0"><span>Partner applications</span><span className={pendingPartners ? "pill-warning" : "pill"}>{pendingPartners}</span></Link>
          <Link href="/admin/orders" className="flex justify-between border-t border-line py-2"><span>Quote requests</span><span className={quoteRequests ? "pill-info" : "pill"}>{quoteRequests}</span></Link>
          <Link href="/admin/matches" className="flex justify-between border-t border-line py-2"><span>Review match suggestions</span><span className="pill-success">Open</span></Link>
          <div className="flex justify-between border-t border-line py-2 text-sm"><span>Service revenue</span><b className="num">{money(serviceRevenue)}</b></div>
          <div className="flex justify-between border-t border-line py-2 text-sm">
            <span>Grants mirror</span>
            <span className={lastRun?.status === "ok" ? "pill-success" : lastRun?.status === "failed" ? "pill-danger" : "pill-warning"}>
              {lastRun ? `${lastRun.status} · ${dateShort(lastRun.started_at)}` : "never synced"}
            </span>
          </div>
        </div>
        <div className="card flex flex-col gap-2">
          <h2 className="text-lg font-bold">Pipeline by stage</h2>
          {DEAL_STATUSES.map((s) => {
            const n = ds.filter((d) => d.status === s.id).length;
            return (
              <div key={s.id}>
                <div className="flex justify-between text-sm"><span>{s.label}</span><span className="num">{n}</span></div>
                <div className="h-1.5 overflow-hidden rounded bg-muted"><i className={`block h-full ${s.id === "closed_lost" ? "bg-danger" : "bg-teal"}`} style={{ width: `${ds.length ? (n / ds.length) * 100 : 0}%` }} /></div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
