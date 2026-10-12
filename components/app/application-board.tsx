"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { APP_STATUSES, appTypeLabel, type AppStatus } from "@/lib/applications";
import { dateShort, money } from "@/lib/format";
import { moveApplication } from "@/app/app/applications/actions";

export type BoardCard = {
  id: string; title: string; type: string; provider: string | null; status: AppStatus;
  amount_requested: number | null; amount_approved: number | null; due_date: string | null; done: number; total: number;
};

/** Application Center Kanban (§7.6): Planning → Drafting → Under Review → Submitted → Approved / Declined. */
export function ApplicationBoard({ cards }: { cards: BoardCard[] }) {
  const router = useRouter();
  const [optimistic, apply] = useOptimistic(cards, (state, m: { id: string; status: AppStatus }) => state.map((c) => (c.id === m.id ? { ...c, status: m.status } : c)));
  const [, start] = useTransition();
  const move = (id: string, status: AppStatus) => {
    // Declines need a reason, approvals confirm the amount: both happen on the detail page.
    if (status === "declined" || status === "approved") { router.push(`/app/applications/${id}?set=${status}`); return; }
    start(async () => { apply({ id, status }); await moveApplication(id, status); });
  };
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid auto-cols-[minmax(230px,1fr)] grid-flow-col gap-2.5 overflow-x-auto pb-2">
      {APP_STATUSES.map((col) => {
        const items = optimistic.filter((c) => c.status === col.id);
        return (
          <div key={col.id} className="flex min-h-[260px] flex-col gap-2 rounded-lg bg-muted p-2.5"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { const id = e.dataTransfer.getData("text/plain"); if (id) move(id, col.id); }}>
            <h2 className="flex justify-between text-xs font-semibold uppercase tracking-wider text-subtle"><span>{col.label}</span><span className="num">{items.length}</span></h2>
            {items.map((c) => {
              const overdue = c.due_date && c.due_date < today && !["submitted", "approved", "declined"].includes(c.status);
              return (
                <article key={c.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                  className={`flex cursor-grab flex-col gap-1.5 rounded-md border border-line border-l-[3px] bg-surface p-2.5 text-[13px] ${c.status === "approved" ? "border-l-brand" : c.status === "declined" ? "border-l-danger" : "border-l-info"}`}>
                  <Link href={`/app/applications/${c.id}`} className="text-sm font-bold text-ink hover:underline">{c.title}</Link>
                  {c.provider && <span className="text-subtle">{c.provider}</span>}
                  <div className="flex items-center justify-between gap-2"><span className="pill">{appTypeLabel(c.type)}</span><span className="num">{money(c.amount_approved ?? c.amount_requested, true)}</span></div>
                  <div className="flex items-center justify-between gap-2 text-[12px] text-subtle">
                    <span className={overdue ? "font-semibold text-danger" : ""}>{c.due_date ? `Due ${dateShort(c.due_date)}` : "No due date"}</span>
                    <span className="num">{c.done}/{c.total} docs</span>
                  </div>
                  <select aria-label={`Move ${c.title}`} value={c.status} onChange={(e) => move(c.id, e.target.value as AppStatus)} className="input px-2 py-1 text-[12px]">
                    {APP_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </article>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
