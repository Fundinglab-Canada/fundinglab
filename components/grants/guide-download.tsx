"use client";

import { useActionState } from "react";
import { requestGuide } from "@/app/grants/guide-action";

/** Email-gated guide download (§4G-14). */
export function GuideDownload({ programId, programSlug, hasGuide }: { programId: string; programSlug: string; hasGuide: boolean }) {
  const [state, action, pending] = useActionState(requestGuide, undefined);
  return (
    <div className="card flex flex-col gap-3 self-start">
      <h3 className="text-xl font-bold">Download the full guide (PDF)</h3>
      <p className="text-sm text-subtle">The plain-language {programSlug.toUpperCase()} guide with every table, checklist and example, ready to share with your team or council.</p>
      {state?.url ? (
        <a href={state.url} className="btn-primary self-start" target="_blank" rel="noreferrer">Download guide</a>
      ) : state?.ok ? (
        <p className="rounded-md bg-brand-soft p-3 text-sm">Thanks — we&apos;ll email you the guide as soon as this edition is published.</p>
      ) : (
        <form action={action} className="flex flex-col gap-2">
          {state?.error && <p className="error" role="alert">{state.error}</p>}
          <input type="hidden" name="program_id" value={programId} />
          <input type="hidden" name="has_guide" value={hasGuide ? "1" : ""} />
          <label className="field">Email<input name="email" type="email" required autoComplete="email" className="input" /></label>
          <label className="flex items-start gap-2 text-[13px]"><input type="checkbox" name="marketing" className="mt-1" />Also send me program deadlines and funding news.</label>
          <button className="btn-secondary self-start" disabled={pending}>{pending ? "Sending…" : "Get the guide"}</button>
        </form>
      )}
    </div>
  );
}
