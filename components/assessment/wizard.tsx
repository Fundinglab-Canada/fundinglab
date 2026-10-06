"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PILLARS, QUESTIONS, STAGE_QUESTION, answeredCount, type Answers } from "@/lib/assessment";
import { FUNDING_PATHS } from "@/lib/constants";
import { submitAssessment } from "@/app/assessment/actions";

const KEY = "fl_assessment_answers";
const read = (): Answers => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
};
const write = (a: Answers) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {}
};
const pathName = (id: string) => FUNDING_PATHS.find((p) => p.id === id)?.name ?? id;

export function AssessmentWizard({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0); // 0 = stage, 1..20 = questions, 21 = review
  const [state, action, pending] = useActionState(submitAssessment, undefined);
  const total = QUESTIONS.length + 1;

  useEffect(() => {
    const saved = read();
    setAnswers(saved);
    const firstOpen = saved.stage ? QUESTIONS.findIndex((q) => saved[q.id] === undefined) + 1 : 0;
    setStep(firstOpen <= 0 && saved.stage ? total : firstOpen);
  }, [total]);

  useEffect(() => {
    if (state?.kind === "saved") {
      write({});
      router.push("/app/assessment?new=1");
    }
  }, [state, router]);

  const q = step >= 1 && step <= QUESTIONS.length ? QUESTIONS[step - 1] : null;
  const pillar = q ? PILLARS.find((p) => p.id === q.pillar)!.label : "Stage";
  const done = useMemo(() => answeredCount(answers) + (answers.stage ? 1 : 0), [answers]);

  function choose(id: string, value: number | string) {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    write(next);
    setStep((s) => Math.min(total, s + 1));
  }

  if (state?.kind === "teaser") {
    return (
      <div className="card flex flex-col gap-4" role="status">
        <span className="eyebrow">Your Funding Readiness Score</span>
        <div className="flex items-end gap-3">
          <span className="text-6xl font-extrabold text-ink num">{state.score}</span>
          <span className="pb-2 text-lg font-semibold text-brand-text">{state.band}</span>
        </div>
        {state.gap && <p className="text-body"><b className="text-ink">Your biggest gap:</b> {state.gap}</p>}
        {state.pathsNow.length > 0 && <p className="text-body"><b className="text-ink">Paths that fit today:</b> {state.pathsNow.map(pathName).join(", ")}</p>}
        <div className="rounded-lg bg-muted p-4">
          <p className="font-semibold text-ink">See your full report</p>
          <p className="text-sm text-subtle">Pillar-by-pillar scores, your top 3 gaps with fixes, and paths for later. Free. Your answers are saved.</p>
          <Link href="/signup?next=/app/assessment" className="btn-cta mt-3 inline-block">Create a free account</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-sm text-subtle"><span>{step < total ? pillar : "Review"}</span><span className="num">{done} / {total}</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
          <div className="h-full bg-brand transition-all" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      </div>

      {step === 0 && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-xl font-bold text-ink">{STAGE_QUESTION.text}</legend>
          {STAGE_QUESTION.options.map((o) => (
            <button key={o.id} type="button" onClick={() => choose("stage", o.id)}
              className={`rounded-lg border px-4 py-3 text-left transition hover:border-brand ${answers.stage === o.id ? "border-brand bg-brand-soft" : "border-line"}`}>{o.label}</button>
          ))}
        </fieldset>
      )}

      {q && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-xl font-bold text-ink">{q.text}</legend>
          {q.options.map((o, i) => (
            <button key={o.label} type="button" onClick={() => choose(q.id, i)}
              className={`rounded-lg border px-4 py-3 text-left transition hover:border-brand ${answers[q.id] === i ? "border-brand bg-brand-soft" : "border-line"}`}>{o.label}</button>
          ))}
        </fieldset>
      )}

      {step >= total && (
        <form action={action} className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">All done. Ready for your score?</h2>
          {state?.kind === "error" && <p className="error rounded-md bg-danger-soft px-3 py-2" role="alert">{state.error}</p>}
          <input type="hidden" name="answers" value={JSON.stringify(answers)} />
          {!signedIn && (
            <label className="field">Email me my score (optional)<input name="email" type="email" autoComplete="email" className="input" /></label>
          )}
          <button className="btn-cta self-start" disabled={pending}>{pending ? "Scoring…" : "See my score"}</button>
        </form>
      )}

      <div className="flex justify-between">
        <button type="button" className="btn-ghost btn-sm" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>← Back</button>
        {step < total && (answers[q?.id ?? "stage"] !== undefined) && <button type="button" className="btn-ghost btn-sm" onClick={() => setStep((s) => s + 1)}>Next →</button>}
      </div>
    </div>
  );
}
