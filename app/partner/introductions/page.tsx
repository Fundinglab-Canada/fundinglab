import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { dateShort } from "@/lib/format";
import { DEAL_STATUSES } from "@/lib/constants";
import type { PartnerIntro } from "@/lib/partners/types";
import { OpportunitySummary } from "@/components/partner/opportunity";
import { respondToIntroduction } from "@/lib/intro-actions";

export const metadata = { title: "Introductions" };

export default async function PartnerIntroductionsPage() {
  const { userId } = await requireUser("/partner/introductions");
  const supabase = await createClient();
  const { data: partner } = await supabase.from("partners").select("id, status").eq("user_id", userId).maybeSingle();
  if (!partner) redirect("/partners/join");
  const [{ data }, { data: deals }] = await Promise.all([
    supabase.rpc("fl_partner_introductions"),
    supabase.from("deals").select("match_id, status").eq("partner_id", partner.id),
  ]);
  const intros = (data ?? []) as PartnerIntro[];
  const dealStatus = new Map((deals ?? []).map((d) => [d.match_id, d.status as string]));
  return (
    <section className="container flex flex-col gap-5 py-10">
      <div>
        <span className="eyebrow">Introductions</span>
        <h1 className="mt-1 text-3xl font-bold">Curated introductions</h1>
        <p className="text-subtle">Accept to be connected. Business names and contacts appear once both sides accept.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {intros.map((i) => (
          <article key={i.match_id} className="card flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <b className="text-lg text-ink">{i.status === "mutual" ? i.business_name : "Anonymized business"}</b>
                <span className="block text-[13px] text-subtle">Proposed {dateShort(i.approved_at)}{i.status === "approved" && i.expires_at ? ` · expires ${dateShort(i.expires_at)}` : ""}</span>
              </div>
              {i.score > 0 && <span className="pill-success num">{i.score}% fit</span>}
            </div>
            <OpportunitySummary o={i} />
            {i.reasons?.length ? <p className="text-[13px] text-subtle">Why: {i.reasons.join(", ")}</p> : null}
            {i.status === "mutual" ? (
              <div className="rounded-md bg-brand-soft p-3 text-sm">
                Connected. <b>{i.contact_name}</b> · <a href={`mailto:${i.contact_email}`} className="num underline">{i.contact_email}</a>{i.contact_phone ? ` · ${i.contact_phone}` : ""}
                {i.website && <> · <a href={i.website.startsWith("http") ? i.website : `https://${i.website}`} target="_blank" rel="noopener noreferrer" className="underline">{i.website}</a></>}
                {dealStatus.get(i.match_id) && <span className="mt-1 block text-subtle">Pipeline: {DEAL_STATUSES.find((d) => d.id === dealStatus.get(i.match_id))?.label}</span>}
              </div>
            ) : i.partner_opt_in === null ? (
              <form action={respondToIntroduction} className="flex gap-2">
                <input type="hidden" name="match_id" value={i.match_id} />
                <button name="accept" value="yes" className="btn-primary btn-sm">Accept introduction</button>
                <button name="accept" value="no" className="btn-secondary btn-sm">Decline</button>
              </form>
            ) : (
              <p className="text-[13px] text-subtle">You accepted. Details appear when the business accepts too.</p>
            )}
          </article>
        ))}
      </div>
      {!intros.length && <p className="text-subtle">No introductions yet. The Funding Lab Team will email you when there&apos;s a fit.</p>}
    </section>
  );
}
