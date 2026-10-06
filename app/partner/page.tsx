import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { PARTNER_TIERS, partnerTypeLabel } from "@/lib/constants";
import { startMembership } from "./profile/actions";
import type { DealFlowItem, PartnerIntro } from "@/lib/partners/types";

export const metadata = { title: "Partner dashboard" };

export default async function PartnerDashboard({ searchParams }: { searchParams: Promise<{ applied?: string; membership?: string }> }) {
  const { userId } = await requireUser("/partner");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: partner } = await supabase.from("partners").select("id, status, display_name, type, membership_tier").eq("user_id", userId).maybeSingle();
  if (!partner) redirect("/partners/join");
  const [{ data: intros }, { data: flow }, { data: deals }] = await Promise.all([
    supabase.rpc("fl_partner_introductions"),
    supabase.rpc("fl_partner_deal_flow"),
    supabase.from("deals").select("id, status").eq("partner_id", partner.id),
  ]);
  const list = (intros ?? []) as PartnerIntro[];
  const waiting = list.filter((i) => i.status === "approved" && i.partner_opt_in === null).length;
  const connected = list.filter((i) => i.status === "mutual").length;
  const fresh = ((flow ?? []) as DealFlowItem[]).filter((f) => !f.interest_status).length;
  const kpis = [
    { label: "Introductions waiting", value: waiting, href: "/partner/introductions" },
    { label: "Connected", value: connected, href: "/partner/introductions" },
    { label: "New in deal flow", value: fresh, href: "/partner/deal-flow" },
    { label: "Deals in pipeline", value: (deals ?? []).filter((d) => !["funded", "closed_lost"].includes(d.status)).length, href: "/partner/introductions" },
  ];

  return (
    <section className="container flex flex-col gap-5 py-10">
      {sp.applied && <p className="pill-success self-start px-4 py-2 text-sm" role="status">Application submitted. The Funding Lab Team reviews new partners within three business days.</p>}
      {sp.membership === "active" && <p className="pill-success self-start px-4 py-2 text-sm">Membership active. Thank you.</p>}
      {sp.membership === "unavailable" && <p className="pill-warning self-start px-4 py-2 text-sm">Memberships aren&apos;t available yet.</p>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><span className="eyebrow">{partnerTypeLabel(partner.type)}</span><h1 className="mt-1 text-3xl font-bold">{partner.display_name}</h1></div>
        <span className={partner.status === "active" ? "pill-success" : partner.status === "pending" ? "pill-warning" : "pill-danger"}>
          {partner.status === "active" ? "Active" : partner.status === "pending" ? "Pending review" : partner.status}
        </span>
      </div>
      {partner.status !== "active" ? (
        <div className="card text-body">Deal flow and introductions open once the Funding Lab Team approves your profile. You can <Link href="/partner/profile" className="underline">update your profile</Link> meanwhile.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <Link key={k.label} href={k.href} className="card flex flex-col gap-1 hover:border-brand">
              <span className="text-sm text-subtle">{k.label}</span><span className="text-3xl font-extrabold text-ink num">{k.value}</span>
            </Link>
          ))}
        </div>
      )}
      <div className="card flex flex-col gap-2 text-sm text-body">
        <b className="text-ink">How introductions work</b>
        <ol className="list-decimal pl-5">
          <li>Browse anonymized deal flow and mark what interests you, or wait for curated introductions.</li>
          <li>The Funding Lab Team reviews fit and proposes the introduction to both sides.</li>
          <li>Names and contact details are shared only when you both accept. Introductions expire after 14 days.</li>
        </ol>
      </div>
      {partner.status === "active" && (
        <form action={startMembership} className="card flex flex-wrap items-center justify-between gap-3">
          <div><b className="text-ink">Membership</b><p className="text-sm text-subtle">Priority introductions and a featured listing. Current tier: {partner.membership_tier}.</p></div>
          <div className="flex gap-2">{PARTNER_TIERS.map((t) => <button key={t.id} name="tier" value={t.id} className="btn-secondary btn-sm">{t.name}</button>)}</div>
        </form>
      )}
    </section>
  );
}
