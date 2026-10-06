import { createClient } from "@/lib/supabase/server";
import { SERVICES } from "@/lib/constants";
import { dateShort, money } from "@/lib/format";
import { setOrderStatus } from "../actions";

export const metadata = { title: "Service orders" };
const STATUSES = ["quote_requested", "quote_sent", "checkout_started", "paid", "in_progress", "delivered", "cancelled"];

export default async function OrdersAdmin() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("service_orders")
    .select("id, kind, status, message, amount, created_at, paid_at, businesses(name)")
    .order("created_at", { ascending: false })
    .limit(500);
  return (
    <>
      <div className="flex items-end justify-between"><h1 className="text-3xl font-bold">Service orders</h1><a href="/api/admin/export/orders" className="btn-secondary btn-sm">Export CSV</a></div>
      <div className="card table-wrap p-2"><table className="table">
        <thead><tr><th>Business</th><th>Service</th><th>Request</th><th>Status</th><th className="text-right">Value</th><th>Created</th></tr></thead>
        <tbody>
          {(data ?? []).map((o) => {
            const biz = (Array.isArray(o.businesses) ? o.businesses[0] : o.businesses) as { name: string } | null;
            return (
              <tr key={o.id}>
                <td className="font-semibold text-ink">{biz?.name ?? "—"}</td>
                <td>{SERVICES.find((s) => s.kind === o.kind)?.name ?? o.kind}</td>
                <td className="max-w-[280px] text-[13px] text-subtle">{o.message}</td>
                <td>
                  <form action={setOrderStatus} className="flex gap-1">
                    <input type="hidden" name="id" value={o.id} />
                    <select name="status" defaultValue={o.status} className="input w-auto px-2 py-1 text-[13px]">
                      {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                    </select>
                    <button className="btn-ghost btn-sm">Save</button>
                  </form>
                </td>
                <td className="n">{money(o.amount)}</td>
                <td className="text-[13px]">{dateShort(o.created_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
    </>
  );
}
