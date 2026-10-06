import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyBusiness, requireUser } from "@/lib/auth";
import { partnerTypeLabel } from "@/lib/constants";
import { dateShort } from "@/lib/format";
import type { Introduction } from "@/lib/types";
import { respondToIntroduction } from "@/lib/intro-actions";

export const metadata = { title: "Introductions" };

export default async function MatchesPage() {
  await requireUser("/app/matches");
  const business = await getMyBusiness();
  if (!business) redirect("/app/profile?step=1");
  const supabase = await createClient();
  const { data } = await supabase.rpc("fl_my_introductions", { p_business_id: business.id });
  const intros = (data ?? []) as Introduction[];
  const waiting = intros.filter((i) => i.status === "approved");
  const connected = intros.filter((i) => i.status === "mutual");

  return (
    <section className="container flex max-w-4xl flex-col gap-6 py-10">
      <div>
        <span className="eyebrow">Introductions</span>
        <h1 className="mt-1 text-3xl font-bold">Curated introductions</h1>
        <p className="text-subtle">The Funding Lab Team reviews every introduction. You see the partner type and why it fits; names and contact details are shared only if you both accept. Unanswered introductions expire after 14 days.</p>
      </div>
      {!business.consent_matching && (
        <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">Matching is off, so we can&apos;t introduce you. <Link href="/app/profile?step=6" className="underline">Turn on matching consent</Link>.</p>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Waiting for a reply <span className="text-subtle">({waiting.length})</span></h2>
        {waiting.map((i) => (
          <article key={i.match_id} className="card flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <b className="text-lg text-ink">{partnerTypeLabel(i.partner_type)}</b>
                <span className="block text-sm text-subtle">{i.partner_location?.trim() ? `${i.partner_location.trim()} · ` : ""}Proposed {dateShort(i.approved_at)}{i.expires_at ? ` · expires ${dateShort(i.expires_at)}` : ""}</span>
              </div>
              {i.score != null && i.score > 0 && <span className="pill-success num">{i.score}% fit</span>}
            </div>
            {i.reasons?.length ? <div className="flex flex-wrap gap-1.5">{i.reasons.map((r) => <span key={r} className="pill">{r}</span>)}</div> : null}
            {i.business_opt_in === null ? (
              <form action={respondToIntroduction} className="flex flex-wrap gap-2">
                <input type="hidden" name="match_id" value={i.match_id} />
                <button name="accept" value="yes" className="btn-primary btn-sm">Accept introduction</button>
                <button name="accept" value="no" className="btn-secondary btn-sm">Decline</button>
              </form>
            ) : i.business_opt_in ? (
              <p className="text-sm text-subtle">You accepted. Names and contact details appear here when the partner accepts too.</p>
            ) : null}
          </article>
        ))}
        {!waiting.length && <p className="text-subtle">Nothing waiting. We&apos;ll email you when there&apos;s a new introduction.</p>}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Connected <span className="text-subtle">({connected.length})</span></h2>
        {connected.map((i) => (
          <article key={i.match_id} className="card flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span><b className="text-lg text-ink">{i.partner_name}</b>{i.partner_company ? <span className="text-subtle"> · {i.partner_company}</span> : null}
                <span className="block text-sm text-subtle">{partnerTypeLabel(i.partner_type)}{i.partner_location ? ` · ${i.partner_location}` : ""}</span></span>
              <span className="pill-success">Connected</span>
            </div>
            {i.partner_bio && <p className="text-sm text-body">{i.partner_bio}</p>}
            <p className="text-sm">
              <b>{i.contact_person}</b> · <a href={`mailto:${i.contact_email}`} className="num underline">{i.contact_email}</a>{i.contact_phone ? ` · ${i.contact_phone}` : ""}
              {i.linkedin_url && <> · <a href={i.linkedin_url} target="_blank" rel="noopener noreferrer" className="underline">LinkedIn</a></>}
            </p>
          </article>
        ))}
        {!connected.length && <p className="text-subtle">When both sides accept, the partner&apos;s details appear here.</p>}
      </div>
    </section>
  );
}
