import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DEAL_STATUSES } from "@/lib/constants";
import { dateShort, money } from "@/lib/format";

export default async function AdminOverview() {
  const supabase = await createClient();
  const weekAgoIso = new Date(Date.now() - 7 * 864e5).toISOString();
  const head = { count: "exact" as const, head: true };
  const [biz, partners, deals, orders, runs, users, matches, leads, messages, regs, enrollments, applications] = await Promise.all([
    supabase.from("businesses").select("id, created_at, profile_step, consent_matching", { count: "exact" }),
    supabase.from("partners").select("status"),
    supabase.from("deals").select("status, expected_amount, commission_rate, commission_amount"),
    supabase.from("service_orders").select("status, amount"),
    supabase.from("grant_sync_runs").select("*").order("started_at", { ascending: false }).limit(1),
    supabase.from("profiles").select("id", head).eq("role", "business"),
    supabase.from("matches").select("status, source"),
    supabase.from("leads").select("id", head).eq("status", "new"),
    supabase.from("contact_messages").select("id", head).eq("status", "new"),
    supabase.from("webinar_registrations").select("id", head).gte("created_at", weekAgoIso),
    supabase.from("cohort_enrollments").select("id", head).eq("status", "enrolled"),
    supabase.from("job_applications").select("id", head).eq("status", "new"),
  ]);
  const ms = matches.data ?? [];
  const bs = biz.data ?? [];
  const funnel: [string, number][] = [
    ["Business sign-ups", users.count ?? 0],
    ["Profile started", bs.length],
    ["Profile 4+ steps", bs.filter((b) => b.profile_step >= 4).length],
    ["Matching consent", bs.filter((b) => b.consent_matching).length],
    ["Introduced", ms.filter((m) => ["approved", "mutual", "declined", "expired"].includes(m.status)).length],
    ["Connected (mutual)", ms.filter((m) => m.status === "mutual").length],
    ["Funded", (deals.data ?? []).filter((d) => d.status === "funded").length],
  ];
  const interestQueue = ms.filter((m) => m.status === "suggested" && m.source === "partner_interest").length;
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
          <Link href="/admin/services" className="flex justify-between border-t border-line py-2"><span>Quote requests</span><span className={quoteRequests ? "pill-info" : "pill"}>{quoteRequests}</span></Link>
          <Link href="/admin/matching?view=queue" className="flex justify-between border-t border-line py-2"><span>Partner interest to review</span><span className={interestQueue ? "pill-highlight" : "pill"}>{interestQueue}</span></Link>
          <Link href="/admin/leads" className="flex justify-between border-t border-line py-2"><span>New leads</span><span className={leads.count ? "pill-info" : "pill"}>{leads.count ?? 0}</span></Link>
          <Link href="/admin/messages" className="flex justify-between border-t border-line py-2"><span>New messages</span><span className={messages.count ? "pill-info" : "pill"}>{messages.count ?? 0}</span></Link>
          <Link href="/admin/careers" className="flex justify-between border-t border-line py-2"><span>New job applications</span><span className={applications.count ? "pill-info" : "pill"}>{applications.count ?? 0}</span></Link>
          <div className="flex justify-between border-t border-line py-2 text-sm"><span>Webinar registrations (7 days)</span><b className="num">{regs.count ?? 0}</b></div>
          <div className="flex justify-between border-t border-line py-2 text-sm"><span>Cohort seats sold</span><b className="num">{enrollments.count ?? 0}</b></div>
          <div className="flex justify-between border-t border-line py-2 text-sm"><span>Service revenue</span><b className="num">{money(serviceRevenue)}</b></div>
          <div className="flex justify-between border-t border-line py-2 text-sm">
            <span>Grants mirror</span>
            <span className={lastRun?.status === "ok" ? "pill-success" : lastRun?.status === "failed" ? "pill-danger" : "pill-warning"}>
              {lastRun ? `${lastRun.status} · ${dateShort(lastRun.started_at)}` : "never synced"}
            </span>
          </div>
        </div>
        <div className="card flex flex-col gap-2 lg:col-span-2">
          <h2 className="text-lg font-bold">Funnel</h2>
          {funnel.map(([label, n], i) => (
            <div key={label}>
              <div className="flex justify-between text-sm"><span>{label}</span><span className="num">{n}{i > 0 && funnel[i - 1][1] ? <span className="text-subtle"> · {Math.round((n / funnel[i - 1][1]) * 100)}%</span> : null}</span></div>
              <div className="h-1.5 overflow-hidden rounded bg-muted"><i className="block h-full bg-brand" style={{ width: `${funnel[0][1] ? (n / funnel[0][1]) * 100 : 0}%` }} /></div>
            </div>
          ))}
        </div>
        <div className="card flex flex-col gap-2">
          <h2 className="text-lg font-bold">Pipeline by stage</h2>
          {DEAL_STATUSES.map((s) => {
            const n = ds.filter((d) => d.status === s.id).length;
            return (
              <div key={s.id}>
                <div className="flex justify-between text-sm"><span>{s.label}</span><span className="num">{n}</span></div>
                <div className="h-1.5 overflow-hidden rounded bg-muted"><i className={`block h-full ${s.id === "closed_lost" ? "bg-danger" : "bg-brand"}`} style={{ width: `${ds.length ? (n / ds.length) * 100 : 0}%` }} /></div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
