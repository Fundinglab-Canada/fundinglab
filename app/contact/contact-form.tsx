"use client";

import { useActionState } from "react";
import { sendContactMessage } from "./actions";

export function ContactForm({ roles, topics, defaultTopic, turnstile }: { roles: string[]; topics: string[]; defaultTopic?: string; turnstile: React.ReactNode }) {
  const [state, action, pending] = useActionState(sendContactMessage, undefined);
  if (state?.ok) {
    return (
      <div className="card" role="status">
        <h2 className="text-xl font-bold">Thanks, we&apos;ve received your message.</h2>
        <p className="text-body">The Funding Lab Team will reply within 1–2 business days. A copy is on its way to your inbox.</p>
      </div>
    );
  }
  return (
    <form action={action} className="card grid gap-3 sm:grid-cols-2">
      {state?.error && <p className="error rounded-md bg-danger-soft px-3 py-2 sm:col-span-2" role="alert">{state.error}</p>}
      <label className="field">Full name<input name="name" required maxLength={120} autoComplete="name" className="input" /></label>
      <label className="field">Email<input name="email" type="email" required autoComplete="email" className="input" /></label>
      <label className="field">Phone (optional)<input name="phone" type="tel" autoComplete="tel" className="input" /></label>
      <label className="field">Business name (optional)<input name="business_name" autoComplete="organization" className="input" /></label>
      <label className="field">I am a…
        <select name="role" className="input" defaultValue={roles[0]}>{roles.map((r) => <option key={r}>{r}</option>)}</select>
      </label>
      <label className="field">Topic
        <select name="topic" className="input" defaultValue={defaultTopic && topics.includes(defaultTopic) ? defaultTopic : topics[0]}>{topics.map((t) => <option key={t}>{t}</option>)}</select>
      </label>
      <label className="field sm:col-span-2">Message<textarea name="message" required maxLength={2000} rows={6} className="input" /><span className="help">Up to 2,000 characters.</span></label>
      <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" name="consent" required className="mt-1" />I agree to Funding Lab contacting me about my enquiry.</label>
      <div className="sm:col-span-2">{turnstile}</div>
      <button className="btn-primary self-start" disabled={pending}>{pending ? "Sending…" : "Send message"}</button>
    </form>
  );
}
