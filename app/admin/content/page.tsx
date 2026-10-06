import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RowForm } from "@/components/admin/row-form";
import { AdminNotice } from "@/components/admin/notice";
import type { AdminTable } from "@/lib/admin/tables";
import { saveSiteContent } from "../actions";

export const metadata = { title: "Site content" };

const TABS: { id: AdminTable; label: string; order: string; title: (r: Record<string, unknown>) => string }[] = [
  { id: "team_members", label: "Team", order: "sort_order", title: (r) => `${r.name} — ${r.title}` },
  { id: "announcements", label: "Announcements", order: "sort_order", title: (r) => String(r.message) },
  { id: "partner_logos", label: "Partner logos", order: "sort_order", title: (r) => String(r.name) },
  { id: "testimonials", label: "Testimonials", order: "sort_order", title: (r) => `“${String(r.quote).slice(0, 60)}…” — ${r.attribution}` },
];
const KEYS = [
  { key: "about_story", label: "About page story" },
  { key: "cohort_refund_policy", label: "Road to Funding refund policy" },
];

export default async function ContentAdmin({ searchParams }: { searchParams: Promise<{ tab?: string; saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.find((t) => t.id === sp.tab) ?? (sp.tab === "text" ? null : TABS[0]);
  const supabase = await createClient();
  const back = `/admin/content?tab=${tab?.id ?? "text"}`;
  const rows = tab ? ((await supabase.from(tab.id).select("*").order(tab.order)).data ?? []) : [];
  const texts = tab ? [] : ((await supabase.from("site_content").select("*")).data ?? []);
  return (
    <>
      <h1 className="text-3xl font-bold">Site content</h1>
      <p className="text-sm text-subtle">Public sections stay hidden until content exists. Never publish a person&apos;s phone number or personal email as a contact; the public contact is always “Funding Lab Team · fundinglab.ca@gmail.com”.</p>
      <div className="flex flex-wrap gap-1">{[...TABS.map((t) => [t.id, t.label]), ["text", "Page text"]].map(([id, label]) => <Link key={id} href={`?tab=${id}`} className={(tab?.id ?? "text") === id ? "pill-success" : "pill"}>{label}</Link>)}</div>
      <AdminNotice sp={sp} />
      {tab ? (
        <>
          {rows.map((r) => (
            <details key={String(r.id)} className="card"><summary className="cursor-pointer font-semibold text-ink">{tab.title(r)}{r.published === false || r.active === false ? <span className="pill ml-2">hidden</span> : null}</summary>
              <div className="mt-3"><RowForm table={tab.id} row={r} back={back} /></div></details>
          ))}
          <div className="card"><h2 className="mb-3 font-bold">Add</h2><RowForm table={tab.id} row={null} back={back} /></div>
        </>
      ) : (
        KEYS.map((k) => (
          <form key={k.key} action={saveSiteContent} className="card flex flex-col gap-2">
            <input type="hidden" name="key" value={k.key} />
            <label className="field">{k.label}<textarea name="value" rows={6} defaultValue={String(texts.find((t) => t.key === k.key)?.value ?? "")} className="input" /></label>
            <button className="btn-primary btn-sm self-start">Save</button>
          </form>
        ))
      )}
    </>
  );
}
