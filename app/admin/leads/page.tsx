import { serviceName } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { dateShort } from "@/lib/format";
import { updateLead } from "../actions";

export const metadata = { title: "Leads" };
const KINDS = ["meeting", "fit_call", "quick_check", "grant_teaser", "assessment", "guide_download", "service_quote"];
const STATUSES = ["new", "contacted", "qualified", "converted", "closed"];

export default async function LeadsAdmin({ searchParams }: { searchParams: Promise<{ kind?: string; status?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("leads").select("*, programs(name)").order("created_at", { ascending: false }).limit(500);
  if (sp.kind) q = q.eq("kind", sp.kind);
  if (sp.status) q = q.eq("status", sp.status);
  const { data } = await q;
  return (
    <>
      <div className="flex items-end justify-between"><h1 className="text-3xl font-bold">Leads</h1><a href="/api/admin/export/leads" className="btn-secondary btn-sm">Export CSV</a></div>
      <form method="get" className="flex flex-wrap items-end gap-2">
        <label className="field">Kind<select name="kind" defaultValue={sp.kind ?? ""} className="input"><option value="">All</option>{KINDS.map((k) => <option key={k} value={k}>{k.replace(/_/g, " ")}</option>)}</select></label>
        <label className="field">Status<select name="status" defaultValue={sp.status ?? ""} className="input"><option value="">All</option>{STATUSES.map((k) => <option key={k}>{k}</option>)}</select></label>
        <button className="btn-secondary btn-sm">Filter</button>
      </form>
      <div className="flex flex-col gap-3">
        {(data ?? []).map((l) => {
          const program = (Array.isArray(l.programs) ? l.programs[0] : l.programs) as { name: string } | null;
          return (
            <article key={l.id} className="card flex flex-col gap-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span><span className="pill mr-2">{l.kind.replace(/_/g, " ")}</span><b className="text-ink">{l.name ?? l.email ?? "Anonymous"}</b>{l.business_name ? ` · ${l.business_name}` : ""}
                  <span className="block text-[13px] text-subtle">{[l.email, l.phone, l.city].filter(Boolean).join(" · ")} · {dateShort(l.created_at)}{program ? ` · ${program.name}` : ""}{l.source_page ? ` · ${l.source_page}` : ""}</span></span>
                {l.score != null && <span className="pill-info num">Score {l.score}{l.result_band ? ` · ${l.result_band}` : ""}</span>}
              </div>
              {l.kind === "meeting" && (
                <p className="text-sm text-ink">15-min meeting{l.answers?.service ? ` · ${serviceName(String(l.answers.service))}` : ""} · <b>Preferred time:</b> {String(l.answers?.preferred_time ?? "—")}</p>
              )}
              {l.project_description && <p className="text-sm text-body">{l.project_description}</p>}
              <form action={updateLead} className="flex flex-wrap items-end gap-2 border-t border-line pt-2">
                <input type="hidden" name="id" value={l.id} />
                <label className="field">Status<select name="status" defaultValue={l.status} className="input py-1 text-[13px]">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
                <label className="field flex-1">Notes<input name="admin_notes" defaultValue={l.admin_notes ?? ""} className="input py-1 text-[13px]" /></label>
                <button className="btn-secondary btn-sm">Save</button>
                {l.email && <a href={`mailto:${l.email}`} className="btn-ghost btn-sm">Email</a>}
              </form>
            </article>
          );
        })}
        {!data?.length && <p className="text-subtle">No leads yet.</p>}
      </div>
    </>
  );
}
