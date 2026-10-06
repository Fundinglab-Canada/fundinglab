"use client";

import { useActionState } from "react";
import { GROWTH_QUOTE_FIELDS, QUOTE_BUDGETS, QUOTE_TIMELINES, type GrowthKind } from "@/lib/constants";
import { submitGrowthQuote } from "@/app/services/actions";

export function GrowthQuoteForm({ kind, trigger, defaults, turnstile }: {
  kind: GrowthKind; trigger: string; defaults: { name: string; email: string; business_name: string }; turnstile: React.ReactNode;
}) {
  const cfg = GROWTH_QUOTE_FIELDS[kind];
  const [state, action, pending] = useActionState(submitGrowthQuote, undefined);
  if (state?.ok) {
    return (
      <div className="card" role="status">
        <h2 className="text-xl font-bold">Request received</h2>
        <p className="text-body">We&apos;ve emailed you a confirmation. The Funding Lab Team replies within one business day.</p>
      </div>
    );
  }
  return (
    <form action={action} className="card grid gap-3 sm:grid-cols-2">
      <h2 className="text-xl font-bold sm:col-span-2">Request a quote</h2>
      {state?.error && <p className="error rounded-md bg-danger-soft px-3 py-2 sm:col-span-2" role="alert">{state.error}</p>}
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="trigger_source" value={trigger} />
      <label className="field">Your name<input name="name" required defaultValue={defaults.name} autoComplete="name" className="input" /></label>
      <label className="field">Email<input name="email" type="email" required defaultValue={defaults.email} autoComplete="email" className="input" /></label>
      <label className="field">Phone (optional)<input name="phone" type="tel" autoComplete="tel" className="input" /></label>
      <label className="field">Business name<input name="business_name" defaultValue={defaults.business_name} autoComplete="organization" className="input" /></label>
      {cfg.fields.map((f) => (
        <label key={f.key} className="field">
          {f.label}
          {f.kind === "select" ? (
            <select name={f.key} className="input" required={"required" in f && f.required} defaultValue="">
              <option value="" disabled>Choose…</option>
              {f.options.map((o) => <option key={o}>{o}</option>)}
            </select>
          ) : (
            <input name={f.key} type={f.kind === "number" ? "number" : "text"} min={0} className="input" required={"required" in f && f.required} />
          )}
        </label>
      ))}
      <label className="field sm:col-span-2">Describe the work<textarea name="description" required rows={4} maxLength={3000} className="input" /></label>
      <label className="field">Timeline<select name="timeline" className="input">{QUOTE_TIMELINES.map((t) => <option key={t}>{t}</option>)}</select></label>
      <label className="field">Budget<select name="budget" className="input">{QUOTE_BUDGETS.map((t) => <option key={t}>{t}</option>)}</select></label>
      <div className="sm:col-span-2">{turnstile}</div>
      <button className="btn-primary self-start" disabled={pending}>{pending ? "Sending…" : "Request a quote"}</button>
    </form>
  );
}
