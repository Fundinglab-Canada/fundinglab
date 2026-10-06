import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { dateShort } from "@/lib/format";
import { needsReverification } from "@/lib/programs/queries";
import { RowForm } from "@/components/admin/row-form";
import { AdminNotice } from "@/components/admin/notice";
import { markVerified, uploadGuide } from "../actions";

export const metadata = { title: "Programs" };

export default async function ProgramsAdmin({ searchParams }: { searchParams: Promise<{ edit?: string; saved?: string; error?: string; featured?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("programs").select("*").order("is_featured", { ascending: false }).order("featured_order", { ascending: true, nullsFirst: false }).order("name");
  if (sp.featured) q = q.eq("is_featured", true);
  const { data: programs } = await q;
  const editing = sp.edit === "new" ? { level: "federal", type: "grant", active: true, content: {} } : programs?.find((p) => p.id === sp.edit);
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-2"><h1 className="text-3xl font-bold">Programs</h1>
        <div className="flex gap-2"><Link href={sp.featured ? "/admin/programs" : "/admin/programs?featured=1"} className="btn-secondary btn-sm">{sp.featured ? "All programs" : "Featured only"}</Link><Link href="/admin/programs?edit=new" className="btn-primary btn-sm">New program</Link></div></div>
      <p className="text-sm text-subtle">Programs not verified in the last 90 days are flagged. Verify against the official page, then click “Mark verified”. Sample programs are placeholders until replaced with verified data.</p>
      <AdminNotice sp={sp} />
      {editing && (
        <div className="card flex flex-col gap-4">
          <h2 className="text-lg font-bold">{sp.edit === "new" ? "New program" : `Edit: ${(editing as { name: string }).name}`}</h2>
          <RowForm table="programs" row={editing} back={`/admin/programs${sp.edit === "new" ? "" : `?edit=${sp.edit}`}`} deletable={false} />
          {sp.edit !== "new" && (
            <form action={uploadGuide} className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
              <input type="hidden" name="program_id" value={sp.edit} />
              <label className="field">Guide PDF (contact shown should be “Funding Lab Team” and the website Contact page only)<input type="file" name="file" accept="application/pdf" required className="text-sm" /></label>
              <button className="btn-secondary btn-sm">Upload guide</button>
              {(editing as { guide_pdf_path?: string }).guide_pdf_path && <span className="pill-success">Guide on file</span>}
            </form>
          )}
        </div>
      )}
      <div className="card table-wrap p-2"><table className="table">
        <thead><tr><th>Program</th><th>Level</th><th>Featured</th><th>Verified</th><th /></tr></thead>
        <tbody>{(programs ?? []).map((p) => {
          const stale = needsReverification(p.last_verified_at);
          return (
            <tr key={p.id} className={p.active ? "" : "opacity-60"}>
              <td><b className="text-ink">{p.name}</b>{p.is_sample && <span className="pill-warning ml-2">Sample</span>}<div className="text-[13px] text-subtle">{p.funder}</div></td>
              <td>{p.level}{p.province ? ` · ${p.province}` : ""}</td>
              <td>{p.is_featured ? <span className="pill-success">#{p.featured_order ?? "—"}</span> : "—"}</td>
              <td><span className={stale ? "pill-warning" : "pill"}>{p.last_verified_at ? dateShort(p.last_verified_at) : "never"}</span></td>
              <td className="whitespace-nowrap text-right">
                <Link href={`/admin/programs?edit=${p.id}`} className="btn-ghost btn-sm">Edit</Link>
                <form action={markVerified} className="inline"><input type="hidden" name="id" value={p.id} /><button className="btn-ghost btn-sm">Mark verified</button></form>
                {p.is_featured && <Link href={`/grants/${p.slug}`} className="btn-ghost btn-sm" target="_blank">View</Link>}
              </td>
            </tr>
          );
        })}</tbody>
      </table></div>
    </>
  );
}
