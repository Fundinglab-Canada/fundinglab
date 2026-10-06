import { createClient } from "@/lib/supabase/server";
import { industryLabel, partnerTypeLabel, stageName } from "@/lib/constants";
import { dateShort } from "@/lib/format";
import { PARTNER_FIELDS } from "@/lib/partners/fields";
import type { PartnerRow } from "@/lib/types";
import { setPartnerStatus } from "../actions";

export const metadata = { title: "Partners" };

export default async function PartnersAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.from("partners").select("*, partner_criteria(*)").order("status").order("created_at", { ascending: false });
  const partners = (data ?? []) as PartnerRow[];
  return (
    <>
      <div><h1 className="text-3xl font-bold">Partners</h1><p className="text-sm text-subtle">Private profiles. Never shown to visitors or businesses before an approved introduction.</p></div>
      <div className="grid gap-4 xl:grid-cols-2">
        {partners.map((p) => {
          const c = Array.isArray(p.partner_criteria) ? p.partner_criteria[0] : p.partner_criteria;
          const fields = PARTNER_FIELDS[p.type as keyof typeof PARTNER_FIELDS] ?? [];
          return (
            <article key={p.id} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div><b className="text-ink">{p.display_name}</b><div className="text-[13px] text-subtle">{partnerTypeLabel(p.type)} · {p.location} · applied {dateShort(p.created_at)}</div></div>
                <span className={p.status === "active" ? "pill-success" : p.status === "pending" ? "pill-warning" : "pill-danger"}>{p.status}</span>
              </div>
              {p.bio && <p className="text-sm text-subtle">{p.bio}</p>}
              <p className="text-[13px]">
                <span className="text-subtle">Contact:</span> {p.contact_person} · {p.contact_email}{p.linkedin_url && <> · <a href={p.linkedin_url} className="underline" target="_blank" rel="noreferrer">LinkedIn</a></>}<br />
                <span className="text-subtle">Stages:</span> {(c?.stages ?? []).map(stageName).join(", ") || "—"}<br />
                <span className="text-subtle">Industries:</span> {c?.industries?.length ? c.industries.map(industryLabel).join(", ") : "All"}<br />
                <span className="text-subtle">Geography:</span> {c?.provinces?.length ? c.provinces.join(", ") : "Canada-wide"}
              </p>
              <dl className="grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-3">
                {fields.filter((f) => p.details?.[f.key] != null).map((f) => (
                  <div key={f.key} className="border-l-2 border-brand pl-2"><dt className="text-subtle">{f.label}</dt>
                    <dd className="font-medium text-ink">{fmt(p.details[f.key], f.kind)}</dd></div>
                ))}
              </dl>
              {p.status !== "active" ? (
                <div className="flex gap-2">
                  <form action={setPartnerStatus}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value="active" /><button className="btn-primary btn-sm">Approve partner</button></form>
                  {p.status === "pending" && <form action={setPartnerStatus}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value="declined" /><button className="btn-secondary btn-sm">Decline</button></form>}
                </div>
              ) : (
                <form action={setPartnerStatus}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value="suspended" /><button className="btn-ghost btn-sm">Suspend</button></form>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}

function fmt(v: unknown, kind: string): string {
  if (Array.isArray(v)) return v.join(", ").replace(/_/g, " ");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (kind === "money" && typeof v === "number") return `$${v.toLocaleString("en-CA")}`;
  if (kind === "percent" && typeof v === "number") return `${Math.round(v * 100)}%`;
  return String(v);
}
