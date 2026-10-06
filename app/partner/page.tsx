import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { industryLabel, stageName, useLabel } from "@/lib/constants";
import { dateShort, money } from "@/lib/format";
import { respondToIntroduction } from "@/app/dashboard/actions";
import { startMembership } from "./profile/actions";
import { PARTNER_TIERS } from "@/lib/constants";

export const metadata = { title: "Partner dashboard" };

type PartnerIntro = {
  match_id: string; status: "approved" | "mutual"; score: number; approved_at: string; business_opt_in: boolean | null; partner_opt_in: boolean | null;
  business_name: string; industry: string | null; province: string | null; city: string | null; stage: string | null; amount_sought: number | null;
  use_of_funds: string[]; readiness_score: number; business_slug: string | null; contact_name: string | null; contact_email: string | null; contact_phone: string | null;
};

export default async function PartnerDashboard({ searchParams }: { searchParams: Promise<{ applied?: string; membership?: string }> }) {
  const { userId } = await requireUser("/partner");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: partner } = await supabase.from("partners").select("id, status, display_name, type").eq("user_id", userId).maybeSingle();
  if (!partner) redirect("/partners/apply");
  const { data } = await supabase.rpc("fl_partner_introductions");
  const intros = (data ?? []) as PartnerIntro[];

  return (
    <section className="container flex flex-col gap-5 py-10">
      {sp.applied && <p className="pill-success self-start px-4 py-2 text-sm">Application submitted. Funding Lab reviews new partners within three business days.</p>}
      {sp.membership === "active" && <p className="pill-success self-start px-4 py-2 text-sm">Membership active. Thank you.</p>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><span className="eyebrow">Partner dashboard</span><h1 className="mt-1 text-3xl font-bold">{partner.display_name}</h1></div>
        <div className="flex items-center gap-2">
          <span className={partner.status === "active" ? "pill-success" : partner.status === "pending" ? "pill-warning" : "pill-danger"}>
            {partner.status === "active" ? "Active" : partner.status === "pending" ? "Pending review" : partner.status}
          </span>
          <Link href="/partner/profile" className="btn-secondary btn-sm">Edit profile</Link>
        </div>
      </div>
      {partner.status !== "active" ? (
        <div className="card text-subtle">Introductions start once Funding Lab approves your profile.</div>
      ) : intros.length === 0 ? (
        <div className="card text-subtle">No introductions yet. Funding Lab reviews matches daily and will notify you by email.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {intros.map((i) => (
            <div key={i.match_id} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <b className="text-lg text-ink">{i.business_name}</b>
                  <span className="block text-[13px] text-subtle">{industryLabel(i.industry)} · {i.city}, {i.province} · introduced {dateShort(i.approved_at)}</span>
                </div>
                <span className="pill-success num">Fit {i.score}</span>
              </div>
              <dl className="grid grid-cols-3 gap-3 text-sm">
                <div><dt className="text-xs uppercase text-subtle">Stage</dt><dd className="font-medium text-ink">{stageName(i.stage)}</dd></div>
                <div><dt className="text-xs uppercase text-subtle">Raising</dt><dd className="num font-medium text-ink">{money(i.amount_sought, true)}</dd></div>
                <div><dt className="text-xs uppercase text-subtle">Readiness</dt><dd className="num font-medium text-ink">{i.readiness_score}/100</dd></div>
              </dl>
              <div className="flex flex-wrap gap-1">{i.use_of_funds.map((u) => <span key={u} className="pill">{useLabel(u)}</span>)}</div>
              {i.status === "mutual" ? (
                <p className="rounded-md bg-teal-soft p-3 text-sm">
                  Connected. Contact <b>{i.contact_name}</b> · <span className="num">{i.contact_email}</span>{i.contact_phone ? ` · ${i.contact_phone}` : ""}
                </p>
              ) : i.partner_opt_in === null ? (
                <form action={respondToIntroduction} className="flex gap-2">
                  <input type="hidden" name="match_id" value={i.match_id} />
                  <button name="accept" value="yes" className="btn-primary btn-sm">Accept introduction</button>
                  <button name="accept" value="no" className="btn-secondary btn-sm">Decline</button>
                </form>
              ) : (
                <p className="text-[13px] text-subtle">You accepted. Contact details appear when the business accepts too.</p>
              )}
            </div>
          ))}
        </div>
      )}
      {partner.status === "active" && (
        <form action={startMembership} className="card flex flex-wrap items-center justify-between gap-3">
          <div><b className="text-ink">Membership</b><p className="text-sm text-subtle">Priority introductions and a featured listing in our partner strip.</p></div>
          <div className="flex gap-2">
            {PARTNER_TIERS.map((t) => <button key={t.id} name="tier" value={t.id} className="btn-secondary btn-sm">{t.name}</button>)}
          </div>
        </form>
      )}
    </section>
  );
}
