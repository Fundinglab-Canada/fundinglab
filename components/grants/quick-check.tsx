"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ProgramContent } from "@/lib/programs/types";
import { saveQuickCheck } from "@/app/grants/actions";
import { CTA } from "@/lib/constants";
import { FitCallForm } from "./fit-call-form";

type QC = NonNullable<ProgramContent["quickCheck"]>;

/** Interactive quick check (§4G-6) → instant band → saved as a lead → feeds the fit-call form. */
export function QuickCheck({ qc, programId, programName, signedIn, turnstile }: {
  qc: QC; programId: string; programName: string; signedIn: boolean; turnstile?: React.ReactNode;
}) {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const score = Object.values(answers).filter(Boolean).length;
  const band = useMemo(() => qc.bands.find((b) => score >= b.min && score <= b.max) ?? qc.bands[qc.bands.length - 1], [qc.bands, score]);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <form
        className="card flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitted(true);
          if (!programId.startsWith("fallback")) await saveQuickCheck({ program_id: programId, answers, score, band: band.title }).catch(() => undefined);
        }}
      >
        <p className="text-sm text-subtle">{qc.intro}</p>
        {qc.items.map((it) => (
          <label key={it.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3 has-[:checked]:border-brand-text has-[:checked]:bg-brand-soft">
            <input type="checkbox" className="mt-1" checked={!!answers[it.id]} onChange={(e) => { setAnswers((a) => ({ ...a, [it.id]: e.target.checked })); setSubmitted(false); }} />
            <span className="text-ink">{it.label}</span>
          </label>
        ))}
        <button className="btn-primary self-start">See my result</button>
      </form>
      <div className="flex flex-col gap-4" aria-live="polite">
        {submitted ? (
          <>
            <div className={`rounded-lg p-5 ${band.tone === "strong" ? "bg-brand-soft" : band.tone === "fixable" ? "bg-warning-soft" : "bg-muted"}`}>
              <span className="num text-sm font-semibold text-subtle">{score} / {qc.items.length}</span>
              <h3 className="mt-1 text-xl font-bold">{band.title}</h3>
              <p className="text-body">{band.body}</p>
            </div>
            {!signedIn && (
              <div className="card flex flex-col gap-2">
                <b className="text-ink">Create your free account to save this result and get your full application plan.</b>
                <Link href={`${CTA.href}?program=${encodeURIComponent(programName)}`} className="btn-cta self-start">{CTA.label}</Link>
              </div>
            )}
            <div className="card flex flex-col gap-3">
              <h3 className="text-lg font-bold">Book a Free Fit Call</h3>
              <FitCallForm programId={programId} programName={programName} quickCheck={{ score, band: band.title, answers }} turnstile={turnstile} sourcePage={`grants/${programName}`} />
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-line-strong p-5 text-subtle">Tick the statements that are true, then select “See my result”.</div>
        )}
      </div>
    </div>
  );
}
