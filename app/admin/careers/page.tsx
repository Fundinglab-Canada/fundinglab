import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { dateShort } from "@/lib/format";
import { jobTypeLabel } from "@/lib/constants";
import { RowForm } from "@/components/admin/row-form";
import { AdminNotice } from "@/components/admin/notice";
import { updateApplication } from "../actions";

export const metadata = { title: "Careers" };
const STATUSES = ["new", "reviewing", "interview", "offer", "hired", "rejected", "withdrawn"];

export default async function CareersAdmin({ searchParams }: { searchParams: Promise<{ job?: string; edit?: string; status?: string; saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: jobs }, apps] = await Promise.all([
    supabase.from("jobs").select("*").order("created_at", { ascending: false }),
    (() => {
      let q = supabase.from("job_applications").select("*, jobs(title)").order("created_at", { ascending: false }).limit(300);
      if (sp.job) q = q.eq("job_id", sp.job);
      if (sp.status) q = q.eq("status", sp.status);
      return q;
    })(),
  ]);
  const editing = sp.edit === "new" ? {} : jobs?.find((j) => j.id === sp.edit);
  return (
    <>
      <div className="flex items-end justify-between"><h1 className="text-3xl font-bold">Careers</h1>
        <div className="flex gap-2"><a href="/api/admin/export/applications" className="btn-secondary btn-sm">Export applicants CSV</a><Link href="/admin/careers?edit=new" className="btn-primary btn-sm">New job</Link></div></div>
      <AdminNotice sp={sp} />
      {editing && (
        <div className="card"><h2 className="mb-3 text-lg font-bold">{sp.edit === "new" ? "New job" : `Edit: ${(editing as { title: string }).title}`}</h2>
          <RowForm table="jobs" row={sp.edit === "new" ? { status: "draft", remote_option: "remote", job_type: "contract" } : editing} back="/admin/careers" /></div>
      )}
      <div className="card table-wrap p-2"><table className="table">
        <thead><tr><th>Job</th><th>Type</th><th>Status</th><th>Closes</th><th /></tr></thead>
        <tbody>{(jobs ?? []).map((j) => (
          <tr key={j.id}><td><b className="text-ink">{j.title}</b><div className="text-[13px] text-subtle">{j.department} · {j.location}</div></td><td>{jobTypeLabel(j.job_type)}</td>
            <td><span className={j.status === "open" ? "pill-success" : "pill"}>{j.status}</span></td><td>{dateShort(j.closes_at)}</td>
            <td className="whitespace-nowrap text-right"><Link href={`/admin/careers?edit=${j.id}`} className="btn-ghost btn-sm">Edit</Link><Link href={`/admin/careers?job=${j.id}`} className="btn-ghost btn-sm">Applicants</Link></td></tr>
        ))}</tbody>
      </table></div>
      <h2 className="text-xl font-bold">Applicants{sp.job ? ` · ${jobs?.find((j) => j.id === sp.job)?.title}` : ""}</h2>
      <div className="flex flex-wrap gap-2 text-sm">{["", ...STATUSES].map((s) => <a key={s} href={`?${new URLSearchParams({ ...(sp.job ? { job: sp.job } : {}), ...(s ? { status: s } : {}) })}`} className={(sp.status ?? "") === s ? "pill-success" : "pill"}>{s || "all"}</a>)}</div>
      <div className="flex flex-col gap-3">
        {(apps.data ?? []).map((a) => {
          const job = (Array.isArray(a.jobs) ? a.jobs[0] : a.jobs) as { title: string } | null;
          return (
            <article key={a.id} className="card flex flex-col gap-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span><b className="text-ink">{a.full_name}</b> · {job?.title ?? "General application"}
                  <span className="block text-[13px] text-subtle">{a.email}{a.phone ? ` · ${a.phone}` : ""} · {[a.city, a.province].filter(Boolean).join(", ")} · applied {dateShort(a.created_at)} · keep until {dateShort(a.retain_until)}</span></span>
                <span className="flex gap-2">
                  <a href={`/api/admin/applications/${a.id}/resume`} target="_blank" rel="noopener" className="btn-secondary btn-sm">Resume</a>
                  {a.cover_letter_path && <a href={`/api/admin/applications/${a.id}/resume?file=cover`} target="_blank" rel="noopener" className="btn-ghost btn-sm">Cover letter</a>}
                  {a.linkedin_url && <a href={a.linkedin_url} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm">LinkedIn</a>}
                </span>
              </div>
              {a.why_us && <p className="text-sm text-body"><b>Why Funding Lab:</b> {a.why_us}</p>}
              <p className="text-[13px] text-subtle">Work type: {a.work_type ?? "—"} · Start: {a.start_date ?? "—"} · Eligible to work in Canada: {a.work_eligible == null ? "—" : a.work_eligible ? "yes" : "no"} · Source: {a.source ?? "—"}</p>
              <form action={updateApplication} className="flex flex-wrap items-end gap-2 border-t border-line pt-2">
                <input type="hidden" name="id" value={a.id} />
                <label className="field">Status<select name="status" defaultValue={a.status} className="input py-1 text-[13px]">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
                <label className="field">Rating<select name="rating" defaultValue={a.rating ?? ""} className="input py-1 text-[13px]"><option value="">—</option>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select></label>
                <label className="field flex-1">Notes<input name="admin_notes" defaultValue={a.admin_notes ?? ""} className="input py-1 text-[13px]" /></label>
                <button className="btn-secondary btn-sm">Save</button>
              </form>
            </article>
          );
        })}
        {!apps.data?.length && <p className="text-subtle">No applicants.</p>}
      </div>
    </>
  );
}
