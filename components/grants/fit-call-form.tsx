"use client";

import { useActionState } from "react";
import { bookFitCall } from "@/app/grants/actions";

export function FitCallForm({
  programId,
  programName,
  quickCheck,
  turnstile,
  sourcePage,
}: {
  programId?: string;
  programName?: string;
  quickCheck?: { score: number; band: string; answers: Record<string, boolean> } | null;
  turnstile?: React.ReactNode;
  sourcePage: string;
}) {
  const [state, action, pending] = useActionState(bookFitCall, undefined);
  if (state?.ok) {
    return (
      <div className="rounded-lg bg-brand-soft p-5" role="status">
        <b className="text-ink">Request received.</b>
        <p className="text-sm text-body">The Funding Lab Team will reply within 1–2 business days to book your free fit call. A confirmation is on its way to your inbox.</p>
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      {state?.error && <p className="error rounded-md bg-danger-soft px-3 py-2 sm:col-span-2" role="alert">{state.error}</p>}
      <input type="hidden" name="program_id" value={programId?.startsWith("fallback") ? "" : programId ?? ""} />
      <input type="hidden" name="program_name" value={programName ?? ""} />
      <input type="hidden" name="source_page" value={sourcePage} />
      <input type="hidden" name="quick_check" value={quickCheck ? JSON.stringify(quickCheck) : ""} />
      <label className="field">Name<input name="name" required autoComplete="name" className="input" /></label>
      <label className="field">Email<input name="email" type="email" required autoComplete="email" className="input" /></label>
      <label className="field">Phone (optional)<input name="phone" type="tel" autoComplete="tel" className="input" /></label>
      <label className="field">Business or organization<input name="business_name" autoComplete="organization" className="input" /></label>
      <label className="field sm:col-span-2">Community or city<input name="city" className="input" /></label>
      <label className="field sm:col-span-2">Short project description
        <textarea name="project_description" required minLength={10} maxLength={2000} rows={4} className="input" placeholder="What do you want to build, buy or fund, and roughly how much will it cost?" />
      </label>
      {quickCheck && <p className="help sm:col-span-2">Your quick-check result ({quickCheck.band}) will be attached.</p>}
      <div className="sm:col-span-2">{turnstile}</div>
      <button className="btn-primary self-start" disabled={pending}>{pending ? "Sending…" : "Book a Free Fit Call"}</button>
    </form>
  );
}
