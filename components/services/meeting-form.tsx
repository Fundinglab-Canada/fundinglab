"use client";

import { useActionState } from "react";
import { bookMeeting } from "@/app/services/actions";

/** "Book a 15-minute meeting": the team confirms the time by email or phone. */
export function MeetingForm({ kind, defaults, turnstile }: {
  kind: string; defaults: { name: string; email: string; business_name: string }; turnstile: React.ReactNode;
}) {
  const [state, action, pending] = useActionState(bookMeeting, undefined);
  if (state?.ok) {
    return (
      <div className="card" role="status">
        <h2 className="text-xl font-bold">Meeting requested</h2>
        <p className="text-body">The Funding Lab Team will confirm a time within one business day.</p>
      </div>
    );
  }
  return (
    <form action={action} className="card grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><h2 className="text-xl font-bold">Book a free 15-minute meeting</h2><p className="text-sm text-subtle">Talk to the Funding Lab Team about your needs. No cost, no obligation.</p></div>
      {state?.error && <p className="error rounded-md bg-danger-soft px-3 py-2 sm:col-span-2" role="alert">{state.error}</p>}
      <input type="hidden" name="kind" value={kind} />
      <label className="field">Your name<input name="name" required defaultValue={defaults.name} autoComplete="name" className="input" /></label>
      <label className="field">Email<input name="email" type="email" required defaultValue={defaults.email} autoComplete="email" className="input" /></label>
      <label className="field">Phone<input name="phone" type="tel" required autoComplete="tel" className="input" /></label>
      <label className="field">Business name<input name="business_name" defaultValue={defaults.business_name} autoComplete="organization" className="input" /></label>
      <label className="field sm:col-span-2">When suits you?<input name="preferred_time" required placeholder="e.g. Weekday mornings PT, or Tue Oct 14 after 2 PM" className="input" /></label>
      <label className="field sm:col-span-2">What would you like to discuss? (optional)<textarea name="topic" rows={3} maxLength={1000} className="input" /></label>
      <div className="sm:col-span-2">{turnstile}</div>
      <button className="btn-primary self-start" disabled={pending}>{pending ? "Sending…" : "Book my 15-minute meeting"}</button>
    </form>
  );
}
