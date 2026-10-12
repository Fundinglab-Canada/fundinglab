"use client";

import { useState } from "react";
import { dilution, dscr, grantCostShare, loanRepayment, runway } from "@/lib/funding-calculators";
import { dateShort, money } from "@/lib/format";

function Num({ label, tip, value, onChange, step = 1000, suffix }: { label: string; tip: string; value: number; onChange: (v: number) => void; step?: number; suffix?: string }) {
  return (
    <label className="field">
      <span className="flex items-center gap-1">{label}
        <span className="cursor-help rounded-full border border-line-strong px-1.5 text-[11px] text-subtle" title={tip} aria-label={tip}>i</span>
      </span>
      <span className="flex items-center gap-2">
        <input className="input num" type="number" min={0} step={step} value={Number.isFinite(value) ? value : ""} onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} />
        {suffix && <span className="text-sm text-subtle">{suffix}</span>}
      </span>
      <span className="help">{tip}</span>
    </label>
  );
}

const Stat = ({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) => (
  <div className="rounded-md bg-muted p-3">
    <dt className="text-xs font-semibold uppercase tracking-wider text-subtle">{label}</dt>
    <dd className={`num text-xl font-bold ${tone === "bad" ? "text-danger" : tone === "good" ? "text-brand-text" : "text-ink"}`}>{value}</dd>
  </div>
);
const pct = (v: number) => `${v.toFixed(1)}%`;

export function FundingCalculators({ defaults }: { defaults: { amount: number; costShare: number } }) {
  const [d, setD] = useState({ preMoney: 4_000_000, investment: defaults.amount || 1_000_000, founderPct: 100, newPoolPct: 10 });
  const [l, setL] = useState({ principal: defaults.amount || 250_000, annualRatePct: 8, years: 5, noi: 120_000 });
  const [g, setG] = useState({ projectCost: defaults.amount || 500_000, programPct: defaults.costShare || 50, maxGrant: 0, otherGovernment: 0, stackingLimitPct: 75 });
  const [r, setR] = useState({ cash: 250_000, monthlyExpenses: 60_000, monthlyRevenue: 25_000 });

  const dil = dilution(d);
  const loan = loanRepayment(l);
  const cover = dscr({ annualNetOperatingIncome: l.noi, annualDebtService: loan.monthly * 12 });
  const share = grantCostShare({ ...g, maxGrant: g.maxGrant || null });
  const run = runway(r);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="card flex flex-col gap-3" aria-labelledby="c-dil">
        <h2 id="c-dil" className="text-lg font-bold">Dilution</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Num label="Pre-money valuation" tip="What the company is worth before the new money comes in." value={d.preMoney} onChange={(v) => setD({ ...d, preMoney: v })} step={50_000} />
          <Num label="Investment" tip="New money raised in this round." value={d.investment} onChange={(v) => setD({ ...d, investment: v })} step={25_000} />
          <Num label="Founders own today" tip="Founders' share of the company before the round." value={d.founderPct} onChange={(v) => setD({ ...d, founderPct: v })} step={1} suffix="%" />
          <Num label="New option pool" tip="Options reserved for future hires, as a share of the post-money. Investors usually ask for 10–15%." value={d.newPoolPct} onChange={(v) => setD({ ...d, newPoolPct: v })} step={1} suffix="%" />
        </div>
        <dl className="grid gap-2 sm:grid-cols-3">
          <Stat label="Post-money" value={money(dil.postMoney)} />
          <Stat label="Investors own" value={pct(dil.investorPct)} />
          <Stat label="Founders own after" value={pct(dil.founderAfterPct)} />
        </dl>
      </section>

      <section className="card flex flex-col gap-3" aria-labelledby="c-loan">
        <h2 id="c-loan" className="text-lg font-bold">Loan repayment and DSCR</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Num label="Loan amount" tip="Principal you borrow." value={l.principal} onChange={(v) => setL({ ...l, principal: v })} step={10_000} />
          <Num label="Interest rate" tip="Annual rate. Prime plus 1–4% is common for small business term loans." value={l.annualRatePct} onChange={(v) => setL({ ...l, annualRatePct: v })} step={0.25} suffix="%" />
          <Num label="Term" tip="Years to repay. Equipment loans often match the equipment's useful life." value={l.years} onChange={(v) => setL({ ...l, years: v })} step={1} suffix="years" />
          <Num label="Annual net operating income" tip="Cash the business generates before debt payments (roughly EBITDA)." value={l.noi} onChange={(v) => setL({ ...l, noi: v })} step={5_000} />
        </div>
        <dl className="grid gap-2 sm:grid-cols-3">
          <Stat label="Monthly payment" value={money(loan.monthly)} />
          <Stat label="Total interest" value={money(loan.totalInterest)} />
          <Stat label="DSCR" value={cover.ratio == null ? "—" : `${cover.ratio.toFixed(2)}×`} tone={cover.ratio == null ? undefined : cover.meetsTypical ? "good" : "bad"} />
        </dl>
        <p className="help">Lenders usually look for a debt service coverage ratio of 1.25× or better.</p>
      </section>

      <section className="card flex flex-col gap-3" aria-labelledby="c-grant">
        <h2 id="c-grant" className="text-lg font-bold">Grant cost share</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Num label="Eligible project cost" tip="Only costs the program accepts. Don't include land, GST/PST or costs spent before approval." value={g.projectCost} onChange={(v) => setG({ ...g, projectCost: v })} step={10_000} />
          <Num label="Program pays" tip="The program's cost-share rate. Most pay 50–80%." value={g.programPct} onChange={(v) => setG({ ...g, programPct: v })} step={5} suffix="%" />
          <Num label="Program maximum" tip="Cap per project. Leave 0 if there's no cap." value={g.maxGrant} onChange={(v) => setG({ ...g, maxGrant: v })} step={10_000} />
          <Num label="Other government funding" tip="Other public money for the same costs. It counts toward stacking limits." value={g.otherGovernment} onChange={(v) => setG({ ...g, otherGovernment: v })} step={10_000} />
          <Num label="Stacking limit" tip="Maximum combined government assistance the program allows, as a share of eligible costs." value={g.stackingLimitPct} onChange={(v) => setG({ ...g, stackingLimitPct: v })} step={5} suffix="%" />
        </div>
        <dl className="grid gap-2 sm:grid-cols-3">
          <Stat label="Program pays" value={money(share.grant)} />
          <Stat label="You fund" value={money(share.yourShare)} />
          <Stat label="Government share" value={pct(share.governmentPct)} tone={share.overStackingLimit ? "bad" : undefined} />
        </dl>
        {share.capped && <p className="help">The program maximum limits the grant.</p>}
        {share.overStackingLimit && <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning" role="alert">Combined government funding is over the stacking limit. Reduce other public funding for these costs or raise your share.</p>}
        <p className="help">Most programs reimburse after you spend. Plan how you&apos;ll carry the cost until the claim is paid.</p>
      </section>

      <section className="card flex flex-col gap-3" aria-labelledby="c-run">
        <h2 id="c-run" className="text-lg font-bold">Runway</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Num label="Cash in the bank" tip="Cash available today, excluding money you've been promised but not received." value={r.cash} onChange={(v) => setR({ ...r, cash: v })} step={10_000} />
          <Num label="Monthly expenses" tip="Everything you spend in a typical month, including payroll." value={r.monthlyExpenses} onChange={(v) => setR({ ...r, monthlyExpenses: v })} step={1_000} />
          <Num label="Monthly revenue" tip="Cash collected from customers in a typical month." value={r.monthlyRevenue} onChange={(v) => setR({ ...r, monthlyRevenue: v })} step={1_000} />
        </div>
        <dl className="grid gap-2 sm:grid-cols-3">
          <Stat label="Net burn / month" value={money(Math.max(0, run.netBurn))} />
          <Stat label="Runway" value={run.profitable ? "Cash-flow positive" : `${run.months!.toFixed(1)} months`} tone={run.profitable ? "good" : run.months! < 6 ? "bad" : undefined} />
          <Stat label="Cash runs out" value={run.runsOutOn ? dateShort(run.runsOutOn) : "—"} />
        </dl>
        <p className="help">Start raising when you have at least 6–9 months of runway left; most raises take 3–6 months.</p>
      </section>
    </div>
  );
}
