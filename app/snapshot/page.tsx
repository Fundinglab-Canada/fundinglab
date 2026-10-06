import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyBusiness, requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { dateShort } from "@/lib/format";
import { InvestorSnapshot, type SnapshotData } from "@/components/snapshot";
import { PrintButton } from "@/components/print-button";
import { createShareLink, revokeShareLink, setVisibility } from "./actions";

export const metadata = { title: "Investor snapshot" };

type LinkRow = { id: string; token: string; label: string; expires_at: string | null; revoked_at: string | null; password_hash: string | null; created_at: string;
  share_link_views: { viewed_at: string; viewer_email: string | null }[] };

export default async function SnapshotPage({ searchParams }: { searchParams: Promise<{ created?: string; error?: string }> }) {
  await requireUser("/snapshot");
  const b = await getMyBusiness();
  if (!b) redirect("/profile");
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: history }, { data: docs }, { data: links }] = await Promise.all([
    supabase.from("funding_history").select("source, amount, year, program_name, department, loan_subtype").eq("business_id", b.id).order("year", { ascending: false }),
    supabase.from("documents").select("kind").eq("business_id", b.id),
    supabase.from("share_links").select("id, token, label, expires_at, revoked_at, password_hash, created_at, share_link_views(viewed_at, viewer_email)").eq("business_id", b.id).order("created_at", { ascending: false }),
  ]);
  const snapshot: SnapshotData = { ...b, funding_history: history ?? [], documents: [...new Set((docs ?? []).map((d) => d.kind as string))] };
  const base = `${env.siteUrl()}/b/${b.slug}`;

  return (
    <section className="container flex flex-col gap-5 py-10">
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div><span className="eyebrow">Shareable profile</span><p className="num text-sm">{base.replace(/^https?:\/\//, "")}</p></div>
        <form action={setVisibility} className="flex items-center gap-2">
          <label className="field flex-row items-center gap-2">Visibility
            <select name="visibility" defaultValue={b.visibility} className="input w-auto">
              <option value="private">Private</option>
              <option value="link">Link-only</option>
              <option value="partners" disabled={!b.consent_sharing}>Shared with Funding Lab partners</option>
            </select>
          </label>
          <button className="btn-secondary btn-sm">Save</button>
        </form>
      </div>
      {!b.consent_sharing && <p className="no-print text-sm text-subtle">To share with partners, turn on sharing consent in step 5 of your profile.</p>}

      <InvestorSnapshot s={snapshot} />
      <div className="no-print flex justify-center"><PrintButton /></div>

      <div className="no-print card mx-auto flex w-full max-w-[860px] flex-col gap-4">
        <h2 className="text-lg font-bold">Share a tracked link</h2>
        {sp.created && (
          <div className="rounded-md bg-teal-soft p-3 text-sm">
            Link created. Copy it now: <span className="num break-all font-medium">{`${base}?s=${sp.created}`}</span>
          </div>
        )}
        {sp.error && <p className="error" role="alert">{sp.error}</p>}
        {b.visibility === "private" ? (
          <p className="text-sm text-subtle">Set visibility to Link-only or Partners to create share links.</p>
        ) : (
          <form action={createShareLink} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
            <label className="field">Who is this for?<input name="label" required placeholder="e.g. Harbourline Ventures – Dana" className="input" /></label>
            <label className="field">Expires
              <select name="expires_in_days" defaultValue="30" className="input">
                <option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option><option value="0">No expiry</option>
              </select>
            </label>
            <label className="field">Password (optional)<input name="password" type="text" autoComplete="off" className="input" /></label>
            <button className="btn-primary">Create link</button>
          </form>
        )}
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Link</th><th>Created</th><th>Expires</th><th>Views</th><th /></tr></thead>
          <tbody>
            {((links ?? []) as LinkRow[]).map((l) => (
              <tr key={l.id} className={l.revoked_at ? "opacity-50" : ""}>
                <td><b className="text-ink">{l.label}</b>{l.password_hash && <span className="pill ml-2">Password</span>}
                  <div className="num text-[12px] text-subtle">…/b/{b.slug}?s={l.token.slice(0, 6)}…</div>
                  {l.share_link_views.slice(0, 5).map((v, i) => (
                    <div key={i} className="text-[12px] text-subtle">Opened {dateShort(v.viewed_at)} {new Date(v.viewed_at).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" })}{v.viewer_email ? ` by ${v.viewer_email}` : ""}</div>
                  ))}
                </td>
                <td>{dateShort(l.created_at)}</td>
                <td>{l.revoked_at ? "Revoked" : l.expires_at ? dateShort(l.expires_at) : "No expiry"}</td>
                <td className="n">{l.share_link_views.length}</td>
                <td>{!l.revoked_at && (
                  <form action={revokeShareLink}><input type="hidden" name="id" value={l.id} /><button className="btn-ghost btn-sm">Revoke</button></form>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </section>
  );
}
