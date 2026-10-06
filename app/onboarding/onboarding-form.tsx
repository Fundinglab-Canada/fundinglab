"use client";

import { useActionState, useState } from "react";
import { PROVINCES, STAGES } from "@/lib/constants";
import { completeOnboarding } from "./actions";

export function OnboardingForm({ next, role: initialRole, defaults, hasBusiness }: {
  next: string; role: "business" | "partner"; defaults: { full_name: string; stage: string; business_name: string }; hasBusiness: boolean;
}) {
  const [state, action, pending] = useActionState(completeOnboarding, undefined);
  const [role, setRole] = useState(initialRole);
  return (
    <form action={action} className="card flex flex-col gap-4">
      {state?.error && <p className="error rounded-md bg-danger-soft px-3 py-2" role="alert">{state.error}</p>}
      <input type="hidden" name="next" value={next} />
      {!hasBusiness && (
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-semibold text-ink">I&apos;m here to…</legend>
          {([["business", "Get funding for my business"], ["partner", "Fund or support businesses"]] as const).map(([id, label]) => (
            <label key={id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-line p-3 has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
              <input type="radio" name="role" value={id} checked={role === id} onChange={() => setRole(id)} />
              <b className="text-ink">{label}</b>
            </label>
          ))}
        </fieldset>
      )}
      {hasBusiness && <input type="hidden" name="role" value="business" />}
      <label className="field">Your name<input name="full_name" required defaultValue={defaults.full_name} autoComplete="name" className="input" /></label>
      {role === "business" && (
        <>
          <label className="field">Business name<input name="business_name" required defaultValue={defaults.business_name} autoComplete="organization" className="input" /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field">Stage<select name="stage" defaultValue={defaults.stage} className="input"><option value="">Not sure yet</option>{STAGES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
            <label className="field">Province<select name="province" defaultValue="BC" className="input">{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select></label>
          </div>
        </>
      )}
      <label className="field">Mobile number (optional)<input name="phone" type="tel" autoComplete="tel" className="input" /></label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="sms_opt_in" className="mt-1" />Text me webinar and deadline reminders. Reply STOP to opt out.</label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="marketing" className="mt-1" />Email me funding news and program deadlines.</label>
      <button className="btn-cta self-start" disabled={pending}>{pending ? "Saving…" : role === "business" ? "Continue to my profile" : "Continue to partner application"}</button>
    </form>
  );
}
