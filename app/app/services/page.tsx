import { createClient } from "@/lib/supabase/server";
import { getMyBusiness, requireUser } from "@/lib/auth";
import { SERVICE_TRIGGERS, serviceName } from "@/lib/constants";
import { dateShort, money } from "@/lib/format";
import { ServiceCatalog } from "@/components/services/catalog";
import { payQuote } from "@/app/services/actions";

export const metadata = { title: "Services" };

const STATUS: Record<string, string> = {
  quote_requested: "Quote requested", quote_sent: "Quote sent", checkout_started: "Awaiting payment", paid: "Paid",
  in_progress: "In progress", delivered: "Delivered", cancelled: "Cancelled",
};

export default async function AppServicesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { userId } = await requireUser("/app/services");
  const sp = await searchParams;
  const business = await getMyBusiness();
  const supabase = await createClient();
  const { data: orders } = await supabase.from("service_orders").select("id, kind, status, amount, quote_amount_cad, created_at").eq("requested_by", userId).order("created_at", { ascending: false });
  const payable = (orders ?? []).filter((o) => o.status === "quote_sent" && o.quote_amount_cad);
  const highlight = (business?.use_of_funds ?? []).map((u) => SERVICE_TRIGGERS[u]).filter(Boolean) as string[];
  return (
    <section className="container flex flex-col gap-8 py-10">
      <div>
        <span className="eyebrow">Services</span>
        <h1 className="mt-1 text-3xl font-bold">Get funded, then grow</h1>
      </div>
      {sp.status === "paid" && <p className="pill-success self-start px-4 py-2 text-sm" role="status">Payment received. We&apos;ll contact you within one business day.</p>}
      {sp.status === "quote" && <p className="pill-success self-start px-4 py-2 text-sm" role="status">Quote request sent. We reply within one business day.</p>}
      {sp.status === "cancelled" && <p className="pill-warning self-start px-4 py-2 text-sm">Checkout cancelled. Nothing was charged.</p>}
      {sp.status === "unavailable" && <p className="pill-warning self-start px-4 py-2 text-sm">That quote isn&apos;t ready for payment. Contact the Funding Lab Team.</p>}
      <div id="pay" className="card flex scroll-mt-24 flex-col gap-3 border-brand">
        <h2 className="text-lg font-bold">Pay now</h2>
        {payable.length ? (
          <ul className="flex flex-col gap-2">
            {payable.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3">
                <span><b className="text-ink">{serviceName(o.kind)}</b><span className="block text-sm text-subtle">Quoted {money(o.quote_amount_cad)} · requested {dateShort(o.created_at)}</span></span>
                <form action={payQuote}><input type="hidden" name="id" value={o.id} /><button className="btn-cta btn-sm">Pay {money(o.quote_amount_cad)}</button></form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-subtle">No quotes waiting for payment. When the Funding Lab Team sends your quote, it appears here with a Pay now button.</p>
        )}
      </div>
      {!!orders?.length && (
        <div className="card flex flex-col gap-2">
          <h2 className="text-lg font-bold">Your requests</h2>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Service</th><th>Requested</th><th>Status</th><th className="text-right">Amount</th></tr></thead>
            <tbody>{orders.map((o) => (
              <tr key={o.id}><td>{serviceName(o.kind)}</td><td>{dateShort(o.created_at)}</td><td><span className="pill">{STATUS[o.status] ?? o.status}</span></td>
                <td className="n">{o.quote_amount_cad ? money(o.quote_amount_cad) : o.amount ? money(o.amount) : "—"}</td></tr>
            ))}</tbody>
          </table></div>
        </div>
      )}
      <ServiceCatalog highlight={highlight} />
    </section>
  );
}
