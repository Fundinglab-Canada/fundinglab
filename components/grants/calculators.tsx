"use client";

import { useState } from "react";
import { money } from "@/lib/format";
import { RTRI_LIQUIDITY_CAP_PAYROLL, redipShare, rtriLiquidity, rtriPivot, rtriRepayment } from "@/lib/programs/calculators";

function MoneyInput({ label, value, onChange, help }: { label: string; value: number; onChange: (n: number) => void; help?: string }) {
  return (
    <label className="field">{label}
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle">$</span>
        <input type="number" min={0} step={1000} value={value || ""} onChange={(e) => onChange(Number(e.target.value))} className="input pl-7 num" inputMode="numeric" />
      </div>
      {help && <span className="help">{help}</span>}
    </label>
  );
}

function SplitBar({ a, b, aLabel, bLabel }: { a: number; b: number; aLabel: string; bLabel: string }) {
  const total = a + b || 1;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-4 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${aLabel} ${money(a)}, ${bLabel} ${money(b)}`}>
        <div className="bg-brand" style={{ width: `${(a / total) * 100}%` }} />
        <div className="bg-navy/70" style={{ width: `${(b / total) * 100}%` }} />
      </div>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-brand" />{aLabel} <b className="num text-ink">{money(a)}</b></span>
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-navy/70" />{bLabel} <b className="num text-ink">{money(b)}</b></span>
      </div>
    </div>
  );
}

export function RedipCalculator() {
  const [cost, setCost] = useState(400_000);
  const r = redipShare(cost);
  return (
    <div className="card grid gap-5 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <MoneyInput label="Total eligible project cost" value={cost} onChange={setCost} />
        <p className="text-sm text-subtle">
          {cost < 500_000 ? "Under $500K: REDIP covers 80% (max $400K). You cover 20%." : "$500K or more: REDIP covers 60% (max $1M). You cover 40%."}
          {r.capped && " The program maximum applies."}
        </p>
        <div className="flex flex-wrap gap-2 text-[13px]">
          <button type="button" className="pill hover:bg-brand-soft" onClick={() => setCost(400_000)}>Example: $400K</button>
          <button type="button" className="pill hover:bg-brand-soft" onClick={() => setCost(900_000)}>Example: $900K</button>
        </div>
      </div>
      <div className="flex flex-col justify-center gap-3">
        <div className="text-3xl font-extrabold text-ink"><span className="num">{money(r.grant)}</span> <span className="text-base font-medium text-subtle">REDIP grant</span></div>
        <SplitBar a={r.grant} b={r.applicant} aLabel="REDIP" bLabel="You and partners" />
      </div>
    </div>
  );
}

export function RtriCalculators() {
  const [payroll, setPayroll] = useState(200_000);
  const [cashNeed, setCashNeed] = useState(0);
  const [project, setProject] = useState(1_600_000);
  const [kind, setKind] = useState<"non_repayable" | "repayable">("non_repayable");
  const liq = rtriLiquidity(payroll, cashNeed > 0 ? cashNeed : null);
  const piv = rtriPivot(project, kind);
  const rep = rtriRepayment(piv.contribution);

  return (
    <div className="grid gap-5">
      <div className="card grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-bold">Liquidity support</h3>
          <MoneyInput label="Average monthly payroll" value={payroll} onChange={setPayroll} />
          <MoneyInput label="Proven 12-month cash need (optional)" value={cashNeed} onChange={setCashNeed} help="Bank statements, unused credit lines and signed funding letters count. Forecasts and receivables don't." />
          <p className="text-[13px] text-subtle">Support = the lowest of 50% × payroll × 12 months, $2M, and your proven cash need. The cap is reached at about {money(RTRI_LIQUIDITY_CAP_PAYROLL)} monthly payroll.</p>
        </div>
        <div className="flex flex-col justify-center gap-2">
          <div className="text-3xl font-extrabold text-ink"><span className="num">{money(liq.support)}</span> <span className="text-base font-medium text-subtle">non-repayable</span></div>
          <p className="text-sm text-body">About <b className="num">{money(liq.monthly)}</b> a month for up to 12 months.{liq.limitedBy === "cap" ? " Limited by the $2M cap." : liq.limitedBy === "cash_need" ? " Limited by your proven cash need." : ""}</p>
          <div className="h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${Math.round((liq.support / 2_000_000) * 100)}% of the $2M cap`}>
            <div className="h-full bg-brand" style={{ width: `${Math.min(100, (liq.support / 2_000_000) * 100)}%` }} />
          </div>
          <span className="text-[13px] text-subtle">Share of the $2M liquidity cap</span>
        </div>
      </div>

      <div className="card grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-bold">Pivot project</h3>
          <MoneyInput label="Total project cost" value={project} onChange={setProject} />
          <fieldset className="flex flex-wrap gap-2">
            <legend className="mb-1 text-sm font-semibold text-ink">Funding type</legend>
            {([["non_repayable", "Non-repayable (up to 50%, max $1M)"], ["repayable", "Interest-free repayable (up to 75%)"]] as const).map(([k, l]) => (
              <label key={k} className="pill cursor-pointer has-[:checked]:bg-brand-soft has-[:checked]:text-brand-text">
                <input type="radio" name="kind" checked={kind === k} onChange={() => setKind(k)} />{l}
              </label>
            ))}
          </fieldset>
          <p className="text-[13px] text-subtle">At least 10% ({money(piv.minPrivate)}) must come from non-government sources.</p>
        </div>
        <div className="flex flex-col justify-center gap-3">
          <SplitBar a={piv.contribution} b={piv.applicant} aLabel="PacifiCan" bLabel="You" />
          {kind === "repayable" && (
            <p className="rounded-md bg-muted p-3 text-sm">
              Repayment at 0% interest: 12-month grace after the project ends, then 60 payments of <b className="num">{money(rep.monthly)}</b>/month.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
