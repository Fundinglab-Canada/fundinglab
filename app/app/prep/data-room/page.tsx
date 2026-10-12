import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessContext } from "@/lib/auth";
import { dataRoomViewerLimit, hasFeature } from "@/lib/plans";
import { DATA_ROOM_FOLDERS, dataRoomCompleteness } from "@/lib/prep";
import { dateShort } from "@/lib/format";
import { UpgradeCard } from "@/components/app/upgrade-card";
import { deleteDataRoomDoc, inviteViewer, revokeViewer, setWatermark, toggleViewerDownload, uploadToDataRoom } from "../actions";

export const metadata = { title: "Data room" };

type Doc = { id: string; folder: string; kind: string; file_name: string; size_bytes: number | null; version: number; previous_id: string | null; created_at: string };
const KIND_OPTIONS = [
  ["other", "Other"], ["pitch_deck", "Pitch deck"], ["business_plan", "Business plan"], ["financials", "Financial statements"],
  ["tax_returns", "Tax returns"], ["cap_table", "Cap table"], ["incorporation", "Incorporation documents"], ["registration_noa", "Business registration / NOA"],
] as const;
const kb = (n: number | null) => (n == null ? "" : n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export default async function DataRoomPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { business, plan } = await requireBusinessContext("/app/prep/data-room");
  const sp = await searchParams;
  if (!hasFeature(plan, "data_room")) {
    return (
      <section className="container flex max-w-4xl flex-col gap-6 py-10">
        <div><span className="eyebrow">Prep Studio</span><h1 className="mt-1 text-3xl font-bold">Data room</h1></div>
        <UpgradeCard feature="data_room" title="The data room is part of Growth">
          Standard investor folders, version history, invitations by email that expire, view-only or download access, watermarked previews and a log of who opened what.
          Your profile documents stay available on every plan in <Link href="/app/profile?step=6" className="underline">Profile → Documents</Link>.
        </UpgradeCard>
      </section>
    );
  }

  const supabase = await createClient();
  const [{ data: docsData }, { data: room }, { data: access }, { data: views }] = await Promise.all([
    supabase.from("documents").select("id, folder, kind, file_name, size_bytes, version, previous_id, created_at").eq("business_id", business.id).order("created_at", { ascending: false }),
    supabase.from("data_rooms").select("watermark_enabled").eq("business_id", business.id).maybeSingle(),
    supabase.from("data_room_access").select("id, email, expires_at, can_download, revoked_at, last_viewed_at, created_at").eq("business_id", business.id).order("created_at", { ascending: false }),
    supabase.from("document_views").select("document_id, viewer_email, action, viewed_at").order("viewed_at", { ascending: false }).limit(500),
  ]);
  const docs = (docsData ?? []) as Doc[];
  const replaced = new Set(docs.map((d) => d.previous_id).filter(Boolean));
  const latest = docs.filter((d) => !replaced.has(d.id));
  const older = (d: Doc) => { const out: Doc[] = []; let p = d.previous_id; while (p) { const o = docs.find((x) => x.id === p); if (!o) break; out.push(o); p = o.previous_id; } return out; };
  const viewCount = new Map<string, { views: number; downloads: number; last: string }>();
  for (const v of views ?? []) {
    const c = viewCount.get(v.document_id) ?? { views: 0, downloads: 0, last: v.viewed_at };
    if (v.action === "download") c.downloads++; else c.views++;
    viewCount.set(v.document_id, c);
  }
  const now = Date.now();
  const active = (access ?? []).filter((a) => !a.revoked_at && new Date(a.expires_at).getTime() > now);
  const limit = dataRoomViewerLimit(plan);
  const pct = dataRoomCompleteness(latest.map((d) => d.folder));
  const watermark = room?.watermark_enabled ?? true;

  return (
    <section className="container flex flex-col gap-6 py-10">
      <Link href="/app/prep" className="text-sm text-subtle hover:underline">← Prep Studio</Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Prep Studio</span>
          <h1 className="mt-1 text-3xl font-bold">Data room</h1>
          <p className="max-w-measure text-subtle">Organized the way investors and lenders expect. Invite people by email; access expires on the date you choose, and PDFs are watermarked with the viewer&apos;s email and the date.</p>
        </div>
        <div className="flex flex-col items-end"><span className="num text-3xl font-extrabold text-ink">{pct}%</span><span className="text-xs text-subtle">folders with files</span></div>
      </div>
      {sp.error && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">{sp.error}</p>}
      {sp.ok && <p className="pill-success self-start px-4 py-2 text-sm" role="status">{sp.ok}</p>}

      <form action={uploadToDataRoom} className="card grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_180px_200px_auto]" encType="multipart/form-data">
        <label className="field">File<input type="file" name="file" required className="input py-2" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv" /><span className="help">PDF, Office or CSV, up to 25 MB.</span></label>
        <label className="field">Folder<select name="folder" className="input" defaultValue="corporate">{DATA_ROOM_FOLDERS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}<option value="other">Other</option></select></label>
        <label className="field">Document type<select name="kind" className="input" defaultValue="other">{KIND_OPTIONS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></label>
        <button className="btn-primary">Upload</button>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        {[...DATA_ROOM_FOLDERS, { id: "other", label: "Other", expected: [] as readonly string[] }].map((f) => {
          const files = latest.filter((d) => d.folder === f.id);
          if (f.id === "other" && !files.length) return null;
          return (
            <div key={f.id} className="card flex flex-col gap-3">
              <div className="flex items-center justify-between"><h2 className="text-lg font-bold">{f.label}</h2><span className={files.length ? "pill-success" : "pill"}>{files.length} file{files.length === 1 ? "" : "s"}</span></div>
              {files.length > 0 && (
                <ul className="flex flex-col divide-y divide-line">
                  {files.map((d) => {
                    const v = viewCount.get(d.id);
                    const prev = older(d);
                    return (
                      <li key={d.id} className="flex flex-col gap-1 py-2 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <a href={`/api/documents/${d.id}`} className="font-semibold text-ink underline">{d.file_name}</a>
                          {d.version > 1 && <span className="pill">v{d.version}</span>}
                          <span className="text-[12px] text-subtle">{kb(d.size_bytes)} · {dateShort(d.created_at)}</span>
                        </div>
                        <span className="text-[12px] text-subtle">{v ? `${v.views} view${v.views === 1 ? "" : "s"} · ${v.downloads} download${v.downloads === 1 ? "" : "s"} · last ${dateShort(v.last)}` : "Not opened yet"}</span>
                        <details className="text-[13px]">
                          <summary className="cursor-pointer text-brand-text">New version{prev.length ? ` · ${prev.length} earlier` : ""} · delete</summary>
                          <div className="mt-2 flex flex-col gap-2">
                            <form action={uploadToDataRoom} encType="multipart/form-data" className="flex flex-wrap items-center gap-2">
                              <input type="hidden" name="replaces" value={d.id} /><input type="hidden" name="folder" value={d.folder} /><input type="hidden" name="kind" value={d.kind} />
                              <input type="file" name="file" required className="text-[13px]" aria-label={`New version of ${d.file_name}`} /><button className="btn-secondary btn-sm">Upload version {d.version + 1}</button>
                            </form>
                            {prev.length > 0 && <ul className="text-subtle">{prev.map((o) => <li key={o.id}><a href={`/api/documents/${o.id}`} className="underline">v{o.version}</a> · {dateShort(o.created_at)}</li>)}</ul>}
                            <form action={deleteDataRoomDoc}><input type="hidden" name="id" value={d.id} /><button className="btn-ghost btn-sm px-0 text-danger">Delete this document and its versions</button></form>
                          </div>
                        </details>
                      </li>
                    );
                  })}
                </ul>
              )}
              {f.expected.length > 0 && (
                <div><b className="text-[13px] text-subtle">Investors usually expect</b>
                  <ul className="mt-1 flex flex-wrap gap-1.5">{f.expected.map((e) => <li key={e} className="pill">{e}</li>)}</ul></div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-bold">Who can see it</h2>
            <p className="text-sm text-subtle">{active.length} active viewer{active.length === 1 ? "" : "s"}{Number.isFinite(limit) ? ` of ${limit} on your plan` : ""}. Viewers never see your profile, only this room.</p></div>
          <form action={setWatermark} className="flex items-center gap-2 text-sm"><input type="hidden" name="on" value={watermark ? "0" : "1"} />
            <span>Watermark: <b>{watermark ? "on" : "off"}</b></span><button className="btn-ghost btn-sm">{watermark ? "Turn off" : "Turn on"}</button></form>
        </div>
        <form action={inviteViewer} className="grid items-end gap-3 sm:grid-cols-[1fr_140px_auto_auto]">
          <label className="field">Viewer email<input name="email" type="email" required className="input" placeholder="investor@example.com" /></label>
          <label className="field">Access for<select name="days" className="input" defaultValue="14"><option value="3">3 days</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option><option value="90">90 days</option></select></label>
          <label className="flex items-center gap-2 pb-2.5 text-sm"><input type="checkbox" name="can_download" /> Allow downloads</label>
          <button className="btn-primary">Invite</button>
        </form>
        {(access ?? []).length > 0 && (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Viewer</th><th>Access</th><th>Expires</th><th>Last opened</th><th></th></tr></thead>
            <tbody>
              {(access ?? []).map((a) => {
                const live = !a.revoked_at && new Date(a.expires_at).getTime() > now;
                return (
                  <tr key={a.id}>
                    <td>{a.email}</td>
                    <td>{live ? (
                      <form action={toggleViewerDownload} className="flex items-center gap-1"><input type="hidden" name="id" value={a.id} /><input type="hidden" name="on" value={a.can_download ? "0" : "1"} />
                        <span>{a.can_download ? "View + download" : "View only"}</span><button className="btn-ghost btn-sm">{a.can_download ? "Block downloads" : "Allow downloads"}</button></form>
                    ) : <span className="pill">{a.revoked_at ? "Revoked" : "Expired"}</span>}</td>
                    <td className="num">{dateShort(a.expires_at)}</td>
                    <td className="num">{a.last_viewed_at ? dateShort(a.last_viewed_at) : "—"}</td>
                    <td>{live && <form action={revokeViewer}><input type="hidden" name="id" value={a.id} /><button className="btn-ghost btn-sm text-danger">Revoke</button></form>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
        {(views ?? []).length > 0 && (
          <details><summary className="cursor-pointer text-sm font-semibold text-brand-text">Activity log</summary>
            <ul className="mt-2 flex flex-col gap-1 text-sm">{(views ?? []).slice(0, 50).map((v, i) => (
              <li key={i} className="text-subtle"><b className="text-ink">{v.viewer_email}</b> {v.action === "download" ? "downloaded" : "viewed"} {docs.find((d) => d.id === v.document_id)?.file_name ?? "a file"} · {dateShort(v.viewed_at)}</li>
            ))}</ul>
          </details>
        )}
      </div>
      <p className="text-[13px] text-subtle">Want the Funding Lab Team to build it with you? <Link href="/services/data_room" className="underline">Data Room service</Link>.</p>
    </section>
  );
}
