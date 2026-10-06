import { createClient } from "@/lib/supabase/server";
import { dateShort } from "@/lib/format";
import { updateMessage } from "../actions";

export const metadata = { title: "Messages" };

export default async function MessagesAdmin({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(500);
  if (sp.status) q = q.eq("status", sp.status);
  const { data } = await q;
  return (
    <>
      <h1 className="text-3xl font-bold">Contact messages</h1>
      <p className="text-sm text-subtle">Also delivered to the team inbox (CONTACT_INBOX_EMAIL). Reply from your email; mark replied here.</p>
      <div className="flex gap-2 text-sm">{["", "new", "replied", "closed"].map((s) => <a key={s} href={s ? `?status=${s}` : "?"} className={(sp.status ?? "") === s ? "pill-success" : "pill"}>{s || "all"}</a>)}</div>
      <div className="flex flex-col gap-3">
        {(data ?? []).map((m) => (
          <article key={m.id} className="card flex flex-col gap-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span><b className="text-ink">{m.name}</b>{m.business_name ? ` · ${m.business_name}` : ""}<span className="block text-[13px] text-subtle">{m.email}{m.phone ? ` · ${m.phone}` : ""} · {m.role} · {m.topic} · {dateShort(m.created_at)}</span></span>
              <span className={m.status === "new" ? "pill-info" : "pill"}>{m.status}</span>
            </div>
            <p className="whitespace-pre-line text-sm text-body">{m.message}</p>
            <form action={updateMessage} className="flex flex-wrap items-end gap-2 border-t border-line pt-2">
              <input type="hidden" name="id" value={m.id} />
              <label className="field">Status<select name="status" defaultValue={m.status} className="input py-1 text-[13px]"><option>new</option><option>replied</option><option>closed</option></select></label>
              <label className="field flex-1">Notes<input name="admin_notes" defaultValue={m.admin_notes ?? ""} className="input py-1 text-[13px]" /></label>
              <button className="btn-secondary btn-sm">Save</button>
              <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.topic ?? "your message"}`)}`} className="btn-ghost btn-sm">Reply</a>
            </form>
          </article>
        ))}
        {!data?.length && <p className="text-subtle">No messages.</p>}
      </div>
    </>
  );
}
