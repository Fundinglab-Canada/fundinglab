import { industryLabel, stageName, useLabel } from "@/lib/constants";
import { money } from "@/lib/format";

/** Anonymized business summary shown to partners before a mutual introduction. */
export function OpportunitySummary({ o }: { o: { industry: string | null; province: string | null; stage: string | null; amount_sought: number | null; use_of_funds: string[]; readiness_score: number; one_liner: string | null } }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm text-subtle">{industryLabel(o.industry)} · {o.province ?? "Canada"}</span>
      {o.one_liner && <p className="text-body">{o.one_liner}</p>}
      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div><dt className="text-xs uppercase text-subtle">Stage</dt><dd className="font-medium text-ink">{stageName(o.stage)}</dd></div>
        <div><dt className="text-xs uppercase text-subtle">Raising</dt><dd className="num font-medium text-ink">{money(o.amount_sought, true)}</dd></div>
        <div><dt className="text-xs uppercase text-subtle">Readiness</dt><dd className="num font-medium text-ink">{o.readiness_score}/100</dd></div>
      </dl>
      <div className="flex flex-wrap gap-1">{o.use_of_funds.map((u) => <span key={u} className="pill">{useLabel(u)}</span>)}</div>
    </div>
  );
}
