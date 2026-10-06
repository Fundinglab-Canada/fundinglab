import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Audit log" };

export default async function AuditAdmin({ searchParams }: { searchParams: Promise<{ table?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(0, Number(sp.page ?? 0) || 0);
  const supabase = await createClient();
  let q = supabase.from("audit_log").select("id, actor_id, action, table_name, row_id, old_data, new_data, created_at").order("id", { ascending: false }).range(page * 100, page * 100 + 99);
  if (sp.table) q = q.eq("table_name", sp.table);
  const { data } = await q;
  const actors = [...new Set((data ?? []).map((r) => r.actor_id).filter(Boolean))] as string[];
  const { data: people } = actors.length ? await supabase.from("profiles").select("id, email").in("id", actors) : { data: [] };
  const who = new Map((people ?? []).map((p) => [p.id, p.email]));
  const changed = (o: Record<string, unknown> | null, n: Record<string, unknown> | null) =>
    Object.keys({ ...(o ?? {}), ...(n ?? {}) }).filter((k) => k !== "updated_at" && JSON.stringify(o?.[k]) !== JSON.stringify(n?.[k]));
  return (
    <>
      <h1 className="text-3xl font-bold">Audit log</h1>
      <form method="get" className="flex items-end gap-2"><label className="field">Table<input name="table" defaultValue={sp.table ?? ""} className="input" placeholder="e.g. partners" /></label><button className="btn-secondary btn-sm">Filter</button></form>
      <div className="card table-wrap p-2"><table className="table text-[13px]">
        <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Table</th><th>Changed fields</th></tr></thead>
        <tbody>{(data ?? []).map((r) => (
          <tr key={r.id}><td className="whitespace-nowrap">{new Date(r.created_at).toLocaleString("en-CA", { timeZone: "America/Vancouver" })}</td>
            <td>{r.actor_id ? who.get(r.actor_id) ?? r.actor_id.slice(0, 8) : "system"}</td><td>{r.action}</td><td>{r.table_name}</td>
            <td className="max-w-[340px]">{changed(r.old_data, r.new_data).slice(0, 8).join(", ")}</td></tr>
        ))}</tbody>
      </table></div>
      <div className="flex gap-2">{page > 0 && <a href={`?${new URLSearchParams({ ...(sp.table ? { table: sp.table } : {}), page: String(page - 1) })}`} className="btn-ghost btn-sm">← Newer</a>}
        {(data ?? []).length === 100 && <a href={`?${new URLSearchParams({ ...(sp.table ? { table: sp.table } : {}), page: String(page + 1) })}`} className="btn-ghost btn-sm">Older →</a>}</div>
    </>
  );
}
