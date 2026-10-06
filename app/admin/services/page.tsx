import { createClient } from "@/lib/supabase/server";
import { serviceName } from "@/lib/constants";
import { dateShort, money } from "@/lib/format";
import { setOrderStatus } from "../actions";

export const metadata = { title: "Service requests" };
const STATUSES = ["quote_requested", "quote_sent", "checkout_started", "paid", "in_progress", "delivered", "cancelled"];

export default async function ServicesAdmin({ searchParams }: { searchParams: Promise<{ kind?: string; status?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  let q = supabase
    .from("service_orders")
    .select("id, kind, status, message, details, trigger_source, amount, quote_amount_cad, assigned_partner_id, created_at, paid_at, businesses(name), profiles:requested_by(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (sp.kind) q = q.eq("kind", sp.kind);
  if (sp.status) q = q.eq("status", sp.status);
  const [{ data }, { data: partners }] = await Promise.all([q, supabase.from("partners").select("id, display_name, type").eq("status", "active").order("display_name")]);
  return (
    <>
      <div className="flex items-end justify-between"><h1 className="text-3xl font-bold">Service requests</h1><a href="/api/admin/export/orders" className="btn-secondary btn-sm">Export CSV</a></div>
      <form method="get" className="flex flex-wrap items-end gap-2">
        <label className="field">Status<select name="status" defaultValue={sp.status ?? ""} className="input"><option value="">All</option>{STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select></label>
        <button className="btn-secondary btn-sm">Filter</button>
      </form>
      <div className="flex flex-col gap-3">
        {(data ?? []).map((o) => {
          const biz = (Array.isArray(o.businesses) ? o.businesses[0] : o.businesses) as { name: string } | null;
          const who = (Array.isArray(o.profiles) ? o.profiles[0] : o.profiles) as { full_name: string | null; email: string | null } | null;
          const details = (o.details ?? {}) as Record<string, unknown>;
          return (
            <article key={o.id} className="card flex flex-col gap-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span><b className="text-ink">{serviceName(o.kind)}</b> · {biz?.name ?? who?.full_name ?? "—"}<span className="block text-[13px] text-subtle">{who?.email} · {dateShort(o.created_at)} · from {o.trigger_source ?? "services page"}</span></span>
                <span className="num text-sm">{o.amount ? `Deposit ${money(o.amount)}` : ""}</span>
              </div>
              {o.message && <p className="text-sm text-body">{o.message}</p>}
              {Object.keys(details).length > 0 && (
                <dl className="grid gap-x-4 gap-y-1 text-[13px] sm:grid-cols-3">
                  {Object.entries(details).filter(([k]) => k !== "description" && k !== "contact").map(([k, v]) => <div key={k}><dt className="text-subtle">{k.replace(/_/g, " ")}</dt><dd className="text-ink">{String(v ?? "—")}</dd></div>)}
                </dl>
              )}
              <form action={setOrderStatus} className="flex flex-wrap items-end gap-2 border-t border-line pt-2">
                <input type="hidden" name="id" value={o.id} />
                <label className="field">Status<select name="status" defaultValue={o.status} className="input py-1 text-[13px]">{STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select></label>
                <label className="field">Quote (CAD)<input name="quote_amount_cad" type="number" min={0} step="0.01" defaultValue={o.quote_amount_cad ?? ""} className="input w-32 py-1 text-[13px]" /></label>
                <label className="field">Assign partner<select name="assigned_partner_id" defaultValue={o.assigned_partner_id ?? ""} className="input py-1 text-[13px]"><option value="">—</option>{(partners ?? []).map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}</select></label>
                <button className="btn-secondary btn-sm">Save</button>
              </form>
            </article>
          );
        })}
        {!data?.length && <p className="text-subtle">No requests.</p>}
      </div>
    </>
  );
}
