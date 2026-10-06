"use client";

import { useActionState } from "react";
import Link from "next/link";
import { QUOTE_BUDGETS, QUOTE_TIMELINES, SERVICE_FORMS, type ServiceKind } from "@/lib/constants";
import { submitServiceRequest } from "@/app/services/actions";

/** Short requirement form; the team replies with a written quote. */
export function ServiceRequestForm({ kind, trigger, defaults, turnstile }: {
  kind: ServiceKind; trigger: string; defaults: { name: string; email: string; business_name: string }; turnstile: React.ReactNode;
}) {
  const cfg = SERVICE_FORMS[kind];
  const [state, action, pending] = useActionState(submitServiceRequest, undefined);
  if (state?.ok) {
    return (
      <div className="card" role="status">
        <h2 className="text-xl font-bold">Requirements received</h2>
        <p className="text-body">We&apos;ll review them and email your quote within one business day. A confirmation is on its way to your inbox.</p>
        <p className="mt-2 text-sm text-subtle">Want to talk it through first? <Link href="#meeting" className="font-semibold text-brand-text underline">Book a 15-minute meeting</Link>.</p>
      </div>
    );
  }
  return (
    <form action={action} className="card grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><h2 className="text-xl font-bold">Request a quote</h2><p className="text-sm text-subtle">{cfg.intro}</p></div>
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
            <select name={f.key} className="input" required={f.required} defaultValue="">
              <option value="" disabled>Choose…</option>
              {f.options?.map((o) => <option key={o}>{o}</option>)}
            </select>
          ) : (
            <input name={f.key} type={f.kind === "number" ? "number" : "text"} min={0} className="input" required={f.required} />
          )}
        </label>
      ))}
      <label className="field sm:col-span-2">Describe what you need<textarea name="description" required rows={4} maxLength={3000} className="input" /></label>
      <label className="field">Timeline<select name="timeline" className="input">{QUOTE_TIMELINES.map((t) => <option key={t}>{t}</option>)}</select></label>
      <label className="field">Budget (optional)<select name="budget" defaultValue="Not sure yet" className="input">{QUOTE_BUDGETS.map((t) => <option key={t}>{t}</option>)}</select></label>
      <div className="sm:col-span-2">{turnstile}</div>
      <button className="btn-primary self-start" disabled={pending}>{pending ? "Sending…" : "Submit and get my quote"}</button>
    </form>
  );
}
