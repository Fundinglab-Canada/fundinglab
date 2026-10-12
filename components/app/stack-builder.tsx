"use client";

import { useActionState, useMemo, useState } from "react";
import { STACK_SOURCES, stackMetrics, stackSource, type StackItem, type StackSourceId } from "@/lib/roadmap";
import { money } from "@/lib/format";
import { saveStack, type StackState } from "@/app/app/roadmap/actions";

const BAR = ["bg-brand", "bg-info", "bg-highlight", "bg-navy", "bg-warning", "bg-danger"];

/** Capital Stack Builder (§7.3): drag (or tap "Add") sources into a stack toward the target amount. */
export function StackBuilder({ initial, target: initialTarget, preMoney: initialPre }: { initial: StackItem[]; target: number; preMoney: number | null }) {
  const [items, setItems] = useState<StackItem[]>(initial);
  const [target, setTarget] = useState(initialTarget);
  const [preMoney, setPreMoney] = useState<number | null>(initialPre);
  const [over, setOver] = useState(false);
  const [state, action, pending] = useActionState<StackState, FormData>(saveStack, undefined);
  const m = useMemo(() => stackMetrics(items, target, preMoney), [items, target, preMoney]);

  const add = (source: StackSourceId) =>
    setItems((xs) => (xs.length >= 20 ? xs : [...xs, { id: `s${Date.now().toString(36)}${xs.length}`, source, amount: Math.max(0, Math.round(m.gap / 1000) * 1000) }]));
  const update = (id: string, patch: Partial<StackItem>) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const remove = (id: string) => setItems((xs) => xs.filter((x) => x.id !== id));
  const num = (v: string) => (v === "" ? 0 : Math.max(0, Number(v)));

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-subtle">Funding sources</h3>
        <p className="help">Drag a source into your stack, or tap Add.</p>
        <ul className="flex flex-col gap-1.5">
          {STACK_SOURCES.map((s) => (
            <li key={s.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", s.id)}
              className="flex cursor-grab items-center justify-between gap-2 rounded-md border border-line bg-surface px-2.5 py-1.5 text-[13px]">
              <span><b className="text-ink">{s.label}</b><span className="block text-subtle">{s.dilutive ? "Equity" : s.government ? "Government" : "Debt / cash"} · ~{s.cost}%</span></span>
              <button type="button" onClick={() => add(s.id)} className="btn-ghost btn-sm" aria-label={`Add ${s.label}`}>Add</button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="field">Target amount (CAD)
            <input className="input num" type="number" min={0} step={1000} value={target || ""} onChange={(e) => setTarget(num(e.target.value))} />
          </label>
          <label className="field">Pre-money valuation (for equity)
            <input className="input num" type="number" min={0} step={10000} value={preMoney ?? ""} onChange={(e) => setPreMoney(e.target.value === "" ? null : num(e.target.value))} />
            <span className="help">Only needed to estimate founder dilution.</span>
          </label>
        </div>

        <div onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); const id = e.dataTransfer.getData("text/plain"); if (stackSource(id)) add(id as StackSourceId); }}
          className={`flex min-h-[140px] flex-col gap-2 rounded-lg border-2 border-dashed p-3 ${over ? "border-brand bg-brand-soft" : "border-line"}`}>
          {items.length === 0 && <p className="m-auto text-sm text-subtle">Drop funding sources here to build your stack.</p>}
          {items.map((i, idx) => {
            const s = stackSource(i.source)!;
            return (
              <div key={i.id} className="grid grid-cols-[1fr_auto] items-end gap-2 rounded-md border border-line bg-surface p-2.5 sm:grid-cols-[1fr_140px_90px_auto]">
                <span className="flex items-center gap-2 text-sm"><i className={`h-3 w-3 shrink-0 rounded-sm ${BAR[idx % BAR.length]}`} aria-hidden /><b className="text-ink">{s.label}</b></span>
                <label className="text-[12px] font-semibold text-subtle">Amount
                  <input className="input num py-1.5" type="number" min={0} step={1000} value={i.amount || ""} onChange={(e) => update(i.id, { amount: num(e.target.value) })} />
                </label>
                <label className="text-[12px] font-semibold text-subtle" title="Interest for debt; investors' expected return for equity">Cost %
                  <input className="input num py-1.5" type="number" min={0} max={100} step={0.5} value={i.cost ?? s.cost} onChange={(e) => update(i.id, { cost: Math.min(100, num(e.target.value)) })} />
                </label>
                <button type="button" onClick={() => remove(i.id)} className="btn-ghost btn-sm text-danger" aria-label={`Remove ${s.label}`}>Remove</button>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex h-4 overflow-hidden rounded-full bg-muted" role="img" aria-label={`Stack covers ${Math.round(m.progressPct)}% of the target`}>
            {items.filter((i) => i.amount > 0).map((i, idx) => (
              <i key={i.id} className={`block h-full ${BAR[items.indexOf(i) % BAR.length]}`} style={{ width: `${target > 0 ? Math.min(100, (i.amount / Math.max(target, m.total)) * 100) : 0}%` }} title={`${stackSource(i.source)!.label}: ${money(i.amount)}`} data-i={idx} />
            ))}
          </div>
          <span className="text-sm text-subtle"><b className="num text-ink">{money(m.total)}</b> of {money(target)} · {m.gap > 0 ? <>gap <b className="num text-ink">{money(m.gap)}</b></> : "target covered"}</span>
        </div>

        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md bg-muted p-3"><dt className="text-xs font-semibold uppercase tracking-wider text-subtle" title="Weighted average of each source's cost">Blended cost of capital</dt><dd className="num text-2xl font-bold text-ink">{m.blendedCost.toFixed(1)}%</dd></div>
          <div className="rounded-md bg-muted p-3"><dt className="text-xs font-semibold uppercase tracking-wider text-subtle">Founder dilution</dt>
            <dd className="num text-2xl font-bold text-ink">{m.dilutionPct != null ? `${m.dilutionPct.toFixed(1)}%` : m.needsValuation ? "—" : "0%"}</dd>
            {m.needsValuation && <span className="help">Add a pre-money valuation.</span>}</div>
          <div className="rounded-md bg-muted p-3"><dt className="text-xs font-semibold uppercase tracking-wider text-subtle">Government share</dt><dd className="num text-2xl font-bold text-ink">{m.governmentPct.toFixed(0)}%</dd></div>
        </dl>
        {m.stackingWarning && (
          <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning" role="alert">
            Combined government funding is {m.governmentPct.toFixed(0)}% of the total. Many programs cap total government assistance for the same costs (often 50–75%). Check each program&apos;s stacking limit.
          </p>
        )}

        <form action={action} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="stack" value={JSON.stringify({ target, preMoney, items })} />
          <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save stack"}</button>
          {state?.ok && <span className="pill-success" role="status">Saved</span>}
          {state?.error && <span className="error" role="alert">{state.error}</span>}
          <span className="help">Costs are indicative. Equity cost is investors&apos; expected return, not a cash payment.</span>
        </form>
      </div>
    </div>
  );
}
