import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/plans";
import { money, dateShort } from "@/lib/format";
import { serviceName } from "@/lib/constants";

export const metadata = { title: "Revenue & plans" };

/** Payments, subscriptions and success fees (§5 /admin/revenue). Plan prices live in Stripe; MRR is in the Stripe dashboard. */
export default async function RevenueAdmin() {
  const supabase = await createClient();
  const [{ data: subs }, { data: orders }, { data: enrollments }, { data: deals }] = await Promise.all([
    supabase.from("subscriptions").select("user_id, plan, status, stripe_subscription_id, current_period_end, updated_at, profiles!subscriptions_user_id_fkey(email)").order("updated_at", { ascending: false }),
    supabase.from("service_orders").select("kind, amount, paid_at").eq("status", "paid").order("paid_at", { ascending: false }),
    supabase.from("cohort_enrollments").select("amount_paid, status, created_at").in("status", ["enrolled", "completed"]),
    supabase.from("deals").select("commission_amount, funded_amount, closed_at").eq("status", "funded"),
  ]);
  const live = (subs ?? []).filter((s) => ["active", "trialing", "past_due"].includes(s.status));
  const byPlan = PLANS.map((p) => ({
    ...p,
    paid: live.filter((s) => s.plan === p.id && s.stripe_subscription_id).length,
    comped: live.filter((s) => s.plan === p.id && !s.stripe_subscription_id).length,
  }));
  const services = (orders ?? []).reduce((s, o) => s + Number(o.amount ?? 0), 0);
  const cohorts = (enrollments ?? []).reduce((s, e) => s + Number(e.amount_paid ?? 0), 0);
  const fees = (deals ?? []).reduce((s, d) => s + Number(d.commission_amount ?? 0), 0);
  const byService = new Map<string, number>();
  for (const o of orders ?? []) byService.set(o.kind, (byService.get(o.kind) ?? 0) + Number(o.amount ?? 0));

  return (
    <>
      <h1 className="text-3xl font-bold">Revenue & plans</h1>
      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="card"><dt className="text-xs font-semibold uppercase tracking-wider text-subtle">Services paid</dt><dd className="num text-2xl font-bold text-ink">{money(services)}</dd></div>
        <div className="card"><dt className="text-xs font-semibold uppercase tracking-wider text-subtle">Cohort enrollments</dt><dd className="num text-2xl font-bold text-ink">{money(cohorts)}</dd></div>
        <div className="card"><dt className="text-xs font-semibold uppercase tracking-wider text-subtle">Success fees earned</dt><dd className="num text-2xl font-bold text-ink">{money(fees)}</dd><span className="help">Recorded per funded deal; invoiced manually.</span></div>
      </dl>

      <div className="card flex flex-col gap-3">
        <h2 className="text-lg font-bold">Subscriptions</h2>
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Plan</th><th className="n">Paying</th><th className="n">Comped</th></tr></thead>
          <tbody>{byPlan.filter((p) => p.id !== "free").map((p) => <tr key={p.id}><td>{p.name}</td><td className="n">{p.paid}</td><td className="n">{p.comped}</td></tr>)}</tbody>
        </table></div>
        <p className="help">Prices, MRR, invoices and refunds live in the Stripe dashboard. Comp a plan from the business page.</p>
        {live.length > 0 && (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Owner</th><th>Plan</th><th>Status</th><th>Source</th><th>Renews</th></tr></thead>
            <tbody>{live.slice(0, 100).map((s) => (
              <tr key={s.user_id}><td>{(s.profiles as unknown as { email: string } | null)?.email ?? s.user_id}</td><td>{s.plan}</td><td>{s.status}</td><td>{s.stripe_subscription_id ? "Stripe" : "Admin comp"}</td><td className="num">{s.current_period_end ? dateShort(s.current_period_end) : "—"}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </div>

      {byService.size > 0 && (
        <div className="card flex flex-col gap-3">
          <h2 className="text-lg font-bold">Services by type</h2>
          <div className="table-wrap"><table className="table"><thead><tr><th>Service</th><th className="n">Paid</th></tr></thead>
            <tbody>{[...byService].sort((a, b) => b[1] - a[1]).map(([k, v]) => <tr key={k}><td>{serviceName(k)}</td><td className="n">{money(v)}</td></tr>)}</tbody></table></div>
        </div>
      )}
    </>
  );
}
