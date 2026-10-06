import { STAGES, stageIndex } from "@/lib/constants";
import type { ReadinessPart } from "@/lib/readiness";

export function JourneyBar({ stage }: { stage: string | null }) {
  const si = Math.max(0, stageIndex(stage));
  const next = STAGES[Math.min(5, si + 1)];
  return (
    <div className="flex flex-col gap-4">
      <div className="relative grid grid-cols-6">
        <span className="absolute left-[8%] right-[8%] top-[13px] h-[3px] bg-line" />
        <span className="absolute left-[8%] top-[13px] h-[3px] bg-brand" style={{ width: `${(si / 5) * 84}%` }} />
        {STAGES.map((s, i) => (
          <div key={s.id} className={`relative flex flex-col items-center gap-2 text-center text-xs ${i === si ? "font-semibold text-ink" : "text-subtle"}`}>
            <span
              className={`z-10 grid h-7 w-7 place-items-center rounded-full border-[3px] font-mono text-[11px] ${
                i < si ? "border-brand bg-brand text-white" : i === si ? "border-brand bg-surface text-brand-text ring-[5px] ring-brand-soft" : "border-line-strong bg-surface"
              }`}
              aria-hidden
            >
              {i < si ? "✓" : i + 1}
            </span>
            <span>{s.name}</span>
          </div>
        ))}
      </div>
      <p className="text-sm text-subtle">
        {si < 5 ? (
          <>Next milestone: <b className="text-ink">{next.name} — {next.desc.toLowerCase()}</b></>
        ) : (
          <>Next milestone: <b className="text-ink">close your exit transaction</b></>
        )}
      </p>
    </div>
  );
}

export function ReadinessGauge({ total, parts }: { total: number; parts: ReadinessPart[] }) {
  const C = 2 * Math.PI * 48;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg viewBox="0 0 120 120" className="h-[120px] w-[120px] shrink-0" role="img" aria-label={`Readiness ${total} of 100`}>
        <circle cx="60" cy="60" r="48" fill="none" stroke="rgb(var(--c-muted))" strokeWidth="12" />
        <circle cx="60" cy="60" r="48" fill="none" stroke="rgb(var(--c-brand))" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${(C * total) / 100} ${C}`} transform="rotate(-90 60 60)" />
        <text x="60" y="58" textAnchor="middle" fontSize="28" fontWeight="500" fill="rgb(var(--c-ink))" className="font-mono">{total}</text>
        <text x="60" y="78" textAnchor="middle" fontSize="11" fill="rgb(var(--c-subtle))">of 100</text>
      </svg>
      <div className="flex min-w-[200px] flex-1 flex-col gap-2">
        {parts.map((p) => (
          <div key={p.label}>
            <div className="flex justify-between text-[13px]"><span>{p.label}</span><span className="num">{p.value}/{p.max}</span></div>
            <div className="h-1.5 overflow-hidden rounded bg-muted"><i className="block h-full bg-brand" style={{ width: `${(p.value / p.max) * 100}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
