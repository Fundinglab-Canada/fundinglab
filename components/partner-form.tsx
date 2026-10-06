"use client";

import { useActionState, useState } from "react";
import { INDUSTRIES, PARTNER_TYPES, PROVINCES, STAGES, type PartnerTypeId } from "@/lib/constants";
import { PARTNER_FIELDS } from "@/lib/partners/fields";

export type PartnerFormState = { error?: string } | undefined;
type Defaults = {
  type?: PartnerTypeId; display_name?: string; company?: string | null; contact_person?: string | null; contact_email?: string | null;
  contact_phone?: string | null; location?: string | null; bio?: string | null; linkedin_url?: string | null;
  details?: Record<string, unknown>; stages?: string[]; industries?: string[]; provinces?: string[];
};

export function PartnerForm({
  action,
  defaults = {},
  submitLabel,
  showTerms = true,
}: {
  action: (s: PartnerFormState, f: FormData) => Promise<PartnerFormState>;
  defaults?: Defaults;
  submitLabel: string;
  showTerms?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [type, setType] = useState<PartnerTypeId>(defaults.type ?? "angel_investor");
  const d = defaults.details ?? {};
  return (
    <form action={formAction} className="card flex flex-col gap-4">
      {state?.error && <p className="error rounded-md bg-danger-soft px-3 py-2" role="alert">{state.error}</p>}
      <label className="field">Partner type
        <select name="type" value={type} onChange={(e) => setType(e.target.value as PartnerTypeId)} className="input">
          {PARTNER_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field">Name shown after an introduction<input name="display_name" required defaultValue={defaults.display_name} className="input" /></label>
        <label className="field">Company<input name="company" defaultValue={defaults.company ?? ""} className="input" /></label>
        <label className="field">Contact person<input name="contact_person" required defaultValue={defaults.contact_person ?? ""} className="input" /></label>
        <label className="field">Contact email<input name="contact_email" type="email" required defaultValue={defaults.contact_email ?? ""} className="input" /></label>
        <label className="field">Phone<input name="contact_phone" defaultValue={defaults.contact_phone ?? ""} className="input" /></label>
        <label className="field">Location<input name="location" required defaultValue={defaults.location ?? ""} placeholder="Vancouver, BC" className="input" /></label>
        <label className="field sm:col-span-2">LinkedIn<input name="linkedin_url" type="url" defaultValue={defaults.linkedin_url ?? ""} placeholder="https://www.linkedin.com/in/…" className="input" /></label>
        <label className="field sm:col-span-2">Bio<textarea name="bio" rows={3} maxLength={1500} defaultValue={defaults.bio ?? ""} className="input" /></label>
      </div>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-ink">{PARTNER_TYPES.find((t) => t.id === type)?.label} details</legend>
        {PARTNER_FIELDS[type].map((f) =>
          f.kind === "boolean" ? (
            <label key={f.key} className="flex items-center gap-2 text-sm font-semibold text-ink">
              <input type="checkbox" name={`d_${f.key}`} defaultChecked={!!d[f.key]} />{f.label}
            </label>
          ) : f.kind === "multi" ? (
            <div key={f.key} className="field sm:col-span-2">{f.label}
              <div className="flex flex-wrap gap-2 font-normal">
                {f.options!.map((o) => (
                  <label key={o} className="pill cursor-pointer">
                    <input type="checkbox" name={`d_${f.key}`} value={o} defaultChecked={Array.isArray(d[f.key]) && (d[f.key] as string[]).includes(o)} />
                    {o.replace(/_/g, " ")}
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <label key={f.key} className={`field ${f.kind === "textarea" ? "sm:col-span-2" : ""}`}>{f.label}
              {f.kind === "textarea" ? (
                <textarea name={`d_${f.key}`} rows={2} defaultValue={String(d[f.key] ?? "")} className="input" />
              ) : (
                <input name={`d_${f.key}`} type={["number", "money", "percent"].includes(f.kind) ? "number" : f.kind === "url" ? "url" : "text"}
                  min={0} defaultValue={f.kind === "percent" && typeof d[f.key] === "number" ? Number(d[f.key]) * 100 : String(d[f.key] ?? "")} className="input" />
              )}
            </label>
          ),
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold text-ink">Business stages you serve</legend>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((s) => (
            <label key={s.id} className="pill cursor-pointer"><input type="checkbox" name="stages" value={s.id} defaultChecked={defaults.stages?.includes(s.id)} /> {s.name}</label>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold text-ink">Target industries <span className="font-normal text-subtle">(none = all)</span></legend>
        <div className="flex flex-wrap gap-2">
          {INDUSTRIES.map((i) => (
            <label key={i.id} className="pill cursor-pointer"><input type="checkbox" name="industries" value={i.id} defaultChecked={defaults.industries?.includes(i.id)} /> {i.label}</label>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold text-ink">Target provinces <span className="font-normal text-subtle">(none = Canada-wide)</span></legend>
        <div className="flex flex-wrap gap-2">
          {PROVINCES.map((p) => (
            <label key={p} className="pill cursor-pointer"><input type="checkbox" name="provinces" value={p} defaultChecked={defaults.provinces?.includes(p)} /> {p}</label>
          ))}
        </div>
      </fieldset>

      {showTerms && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="agree" required className="mt-1" />
          I agree to the Partner Terms and understand my profile stays private and is activated only after Funding Lab approves it.
        </label>
      )}
      <button className="btn-primary self-start" disabled={pending}>{pending ? "Saving…" : submitLabel}</button>
    </form>
  );
}
