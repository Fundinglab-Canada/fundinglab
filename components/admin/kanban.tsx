"use client";

import { useOptimistic, useTransition } from "react";
import { DEAL_STATUSES, partnerTypeLabel } from "@/lib/constants";
import { money } from "@/lib/format";
import type { DealRow } from "@/lib/types";
import { moveDeal, updateDealAmounts } from "@/app/admin/actions";

export function Kanban({ deals }: { deals: DealRow[] }) {
  const [optimistic, apply] = useOptimistic(deals, (state, m: { id: string; status: DealRow["status"] }) =>
    state.map((d) => (d.id === m.id ? { ...d, status: m.status } : d)),
  );
  const [, start] = useTransition();
  const move = (id: string, status: DealRow["status"]) =>
    start(async () => {
      apply({ id, status });
      await moveDeal(id, status, Date.now() % 1_000_000);
    });

  return (
    <div className="grid auto-cols-[minmax(220px,1fr)] grid-flow-col gap-2.5 overflow-x-auto pb-2">
      {DEAL_STATUSES.map((col) => {
        const items = optimistic.filter((d) => d.status === col.id);
        return (
          <div
            key={col.id}
            className="flex min-h-[240px] flex-col gap-2 rounded-lg bg-muted p-2.5"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { const id = e.dataTransfer.getData("text/plain"); if (id) move(id, col.id); }}
          >
            <h2 className="flex justify-between text-xs font-semibold uppercase tracking-wider text-subtle">
              <span>{col.label}</span><span className="num">{items.length}</span>
            </h2>
            {items.map((d) => (
              <article
                key={d.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", d.id)}
                className={`flex cursor-grab flex-col gap-1.5 rounded-md border border-line border-l-[3px] bg-surface p-2.5 text-[13px] ${
                  d.status === "funded" ? "border-l-info" : d.status === "closed_lost" ? "border-l-danger" : "border-l-brand"
                }`}
              >
                <b className="text-sm text-ink">{d.businesses?.name}</b>
                <span className="text-subtle">{d.partners?.display_name}</span>
                <div className="flex items-center justify-between"><span className="pill">{partnerTypeLabel(d.deal_type)}</span><span className="num">{money(d.funded_amount ?? d.expected_amount, true)}</span></div>
                <span className="num text-[12px] text-subtle">
                  Fee {(Number(d.commission_rate) * 100).toFixed(1)}% · {d.status === "funded" ? `earned ${money(d.commission_amount)}` : `est. ${money(Number(d.expected_amount ?? 0) * Number(d.commission_rate))}`}
                </span>
                <select aria-label="Move deal" value={d.status} onChange={(e) => move(d.id, e.target.value as DealRow["status"])} className="input px-2 py-1 text-[12px]">
                  {DEAL_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                {(d.status === "term_sheet" || d.status === "funded") && (
                  <form action={updateDealAmounts} className="flex items-end gap-1">
                    <input type="hidden" name="id" value={d.id} />
                    <label className="flex-1 text-[11px]">Funded (CAD)<input name="funded_amount" type="number" min={0} defaultValue={d.funded_amount ?? ""} className="input px-2 py-1 text-[12px]" /></label>
                    <label className="w-16 text-[11px]">Fee %<input name="commission_rate" type="number" step="0.1" min={0} max={100} defaultValue={(Number(d.commission_rate) * 100).toFixed(1)} className="input px-2 py-1 text-[12px]" /></label>
                    <button className="btn-secondary btn-sm px-2">Save</button>
                  </form>
                )}
              </article>
            ))}
          </div>
        );
      })}
    </div>
  );
}
