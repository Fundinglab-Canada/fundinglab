"use client";

import { useActionState } from "react";
import { STAGES } from "@/lib/constants";
import { registerWebinar } from "./actions";

type Option = { id: string; label: string };

export function WebinarRegisterForm({ sessions, defaults, turnstile }: { sessions: Option[]; defaults: { name: string; email: string }; turnstile: React.ReactNode }) {
  const [state, action, pending] = useActionState(registerWebinar, undefined);
  if (state?.ok) {
    return (
      <div className="card flex flex-col gap-3" role="status">
        <h2 className="text-xl font-bold">You&apos;re registered</h2>
        <p className="text-body">{state.when}. We&apos;ve emailed your confirmation and calendar invite.</p>
        <div className="flex flex-wrap gap-2">
          <a href={state.google} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">Add to Google Calendar</a>
          <a href={state.icsUrl} className="btn-secondary btn-sm">Download .ics (Outlook / Apple)</a>
        </div>
      </div>
    );
  }
  if (!sessions.length) return <div className="card"><p className="text-subtle">Registration opens soon. Check back shortly.</p></div>;
  return (
    <form action={action} className="card grid gap-3">
      <h2 className="text-xl font-bold">Save your seat. It&apos;s free.</h2>
      {state?.error && <p className="error rounded-md bg-danger-soft px-3 py-2" role="alert">{state.error}</p>}
      <label className="field">Session<select name="session_id" className="input">{sessions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field">Name<input name="name" required defaultValue={defaults.name} autoComplete="name" className="input" /></label>
        <label className="field">Email<input name="email" type="email" required defaultValue={defaults.email} autoComplete="email" className="input" /></label>
        <label className="field">Business name (optional)<input name="business_name" autoComplete="organization" className="input" /></label>
        <label className="field">Stage (optional)<select name="stage" className="input" defaultValue=""><option value="">Not sure</option>{STAGES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      </div>
      <label className="field">A question for the session (optional)<textarea name="question" rows={2} maxLength={1000} className="input" /></label>
      <label className="field">Mobile number (optional, for SMS reminders)<input name="phone" type="tel" autoComplete="tel" className="input" /></label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="sms_opt_in" className="mt-1" />Text me reminders. Message rates may apply; reply STOP to opt out.</label>
      {turnstile}
      <button className="btn-cta self-start" disabled={pending}>{pending ? "Registering…" : "Register free"}</button>
      <p className="text-[13px] text-subtle">We email a confirmation, a calendar invite and reminders 24 hours and 1 hour before.</p>
    </form>
  );
}
