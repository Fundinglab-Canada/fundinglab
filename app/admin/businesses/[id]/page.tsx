import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { dateShort } from "@/lib/format";
import { InvestorSnapshot, type SnapshotData } from "@/components/snapshot";
import { snapshotSummary } from "@/lib/snapshot-summary";
import type { Business } from "@/lib/types";
import { createBusinessShareLink, revokeBusinessShareLink, setBusinessVisibility } from "../../actions";

export const metadata = { title: "Business" };

type LinkRow = { id: string; token: string; label: string; expires_at: string | null; revoked_at: string | null; password_hash: string | null; created_at: string;
  share_link_views: { viewed_at: string; viewer_email: string | null }[] };

export default async function BusinessAdmin({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; error?: string; saved?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: b } = await supabase.from("businesses").select("*").eq("id", id).maybeSingle<Business>();
  if (!b) notFound();
  const [{ data: history }, { data: docs }, { data: links }] = await Promise.all([
    supabase.from("funding_history").select("source, amount, year, program_name, department, loan_subtype").eq("business_id", id).order("year", { ascending: false }),
    supabase.from("documents").select("kind").eq("business_id", id),
    supabase.from("share_links").select("id, token, label, expires_at, revoked_at, password_hash, created_at, share_link_views(viewed_at, viewer_email)").eq("business_id", id).order("created_at", { ascending: false }),
  ]);
  const snapshot: SnapshotData = { ...b, funding_history: history ?? [], documents: [...new Set((docs ?? []).map((d) => d.kind as string))] };
  const base = `${env.siteUrl()}/b/${b.slug}`;

  return (
    <>
      <Link href="/admin/businesses" className="text-sm text-subtle hover:underline">← Businesses</Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{b.name}</h1>
          <p className="text-sm text-subtle">{b.contact_name ?? "—"} · {b.contact_email ?? "—"} · {b.contact_phone ?? "no phone yet"}</p>
        </div>
        <Link href={`/admin/matching?b=${b.id}`} className="btn-secondary btn-sm">Open in matching</Link>
      </div>
      {sp.error && <p className="error rounded-md bg-danger-soft px-3 py-2" role="alert">{sp.error}</p>}
      {sp.saved && <p className="pill-success self-start" role="status">Saved.</p>}

      <div className="card flex flex-col gap-4">
        <h2 className="text-lg font-bold">Sharing</h2>
        <form action={setBusinessVisibility} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="business_id" value={b.id} />
          <label className="field">Visibility
            <select name="visibility" defaultValue={b.visibility} className="input w-auto">
              <option value="private">Private</option>
              <option value="link">Link-only</option>
              <option value="partners" disabled={!b.consent_sharing}>Shared with Funding Lab partners{b.consent_sharing ? "" : " (no consent)"}</option>
            </select>
          </label>
          <button className="btn-secondary btn-sm">Save</button>
        </form>
        {sp.created && (
          <div className="rounded-md bg-brand-soft p-3 text-sm">Link created. Copy it now: <span className="num break-all font-medium">{`${base}?s=${sp.created}`}</span></div>
        )}
        {b.visibility === "private" ? (
          <p className="text-sm text-subtle">Set visibility to Link-only or Partners to create share links.</p>
        ) : (
          <form action={createBusinessShareLink} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
            <input type="hidden" name="business_id" value={b.id} />
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
                    <div key={i} className="text-[12px] text-subtle">Opened {dateShort(v.viewed_at)}{v.viewer_email ? ` by ${v.viewer_email}` : ""}</div>
                  ))}
                </td>
                <td>{dateShort(l.created_at)}</td>
                <td>{l.revoked_at ? "Revoked" : l.expires_at ? dateShort(l.expires_at) : "No expiry"}</td>
                <td className="n">{l.share_link_views.length}</td>
                <td>{!l.revoked_at && (
                  <form action={revokeBusinessShareLink}><input type="hidden" name="business_id" value={b.id} /><input type="hidden" name="id" value={l.id} /><button className="btn-ghost btn-sm">Revoke</button></form>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

      <InvestorSnapshot s={snapshot} summary={snapshotSummary(snapshot)} />
    </>
  );
}
