"use client";

import { useActionState } from "react";
import { STAGES } from "@/lib/constants";
import { enrollCohort } from "../actions";

export function EnrollForm({ cohortId, full, refund, defaults }: { cohortId: string; full: boolean; refund: string; defaults: { business_name: string; stage: string; amount_sought: number | null } }) {
  const [state, action, pending] = useActionState(enrollCohort, undefined);
  return (
    <form action={action} className="card grid gap-3">
      {state?.error && <p className="error rounded-md bg-danger-soft px-3 py-2" role="alert">{state.error}</p>}
      <input type="hidden" name="cohort_id" value={cohortId} />
      <label className="field">Business name<input name="business_name" required defaultValue={defaults.business_name} className="input" /></label>
      <label className="field">Stage<select name="stage" defaultValue={defaults.stage || "startup"} className="input">{STAGES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className="field">What do you want to leave the cohort with?<textarea name="goal" required rows={3} maxLength={1000} className="input" /></label>
      <label className="field">How much are you looking to raise? (CAD, optional)<input name="amount_sought" type="number" min={0} step={1000} defaultValue={defaults.amount_sought ?? ""} className="input" /></label>
      <label className="field">Your biggest funding challenge (optional)<textarea name="challenge" rows={2} maxLength={1000} className="input" /></label>
      <label className="field">Coupon code (optional)<input name="coupon" className="input" /><span className="help">You can also enter a promotion code at checkout.</span></label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="agree" required className="mt-1" />I&apos;ve read the refund policy: {refund}</label>
      <button className="btn-cta self-start" disabled={pending}>{pending ? "Please wait…" : full ? "Join the waitlist" : "Continue to secure payment"}</button>
    </form>
  );
}
