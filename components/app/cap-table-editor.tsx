"use client";

import { useActionState, useMemo, useState } from "react";
import { SHARE_CLASSES, capTableSummary, type CapEntry } from "@/lib/prep";
import { toCsv } from "@/lib/format";
import { saveCapTable, type CapState } from "@/app/app/prep/actions";

// Chart colours as CSS variables so they follow light/dark mode.
const COLORS = ["--c-brand", "--c-info", "--c-highlight", "--c-navy", "--c-warning", "--c-danger", "--c-line-strong"];
const color = (i: number) => `rgb(var(${COLORS[i % COLORS.length]}))`;

export function CapTableEditor({ initial, company }: { initial: CapEntry[]; company: string }) {
  const [rows, setRows] = useState<CapEntry[]>(initial.length ? initial : [{ holder: "", class: "Common", shares: 0, options: 0 }]);
  const [state, action, pending] = useActionState<CapState, FormData>(saveCapTable, undefined);
  const summary = useMemo(() => capTableSummary(rows), [rows]);
  const set = (i: number, patch: Partial<CapEntry>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  let acc = 0;
  const stops = summary.rows.map((r, i) => { const from = acc; acc += r.pct; return `${color(i)} ${from}% ${acc}%`; });
  const download = () => {
    const csv = toCsv([["Holder", "Class", "Shares", "Options", "Fully diluted", "Ownership %"], ...summary.rows.map((r) => [r.holder, r.class, r.shares, r.options, r.total, r.pct.toFixed(2)]), ["Total", "", "", "", summary.fullyDiluted, "100"]]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${company.replace(/[^\w]+/g, "-").toLowerCase()}-cap-table.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
      <div className="flex flex-col gap-3">
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Holder</th><th>Class</th><th className="n">Shares</th><th className="n">Options</th><th className="n">%</th><th></th></tr></thead>
          <tbody>
            {rows.map((r, i) => {
              const pct = summary.rows.find((x) => x.holder === r.holder && x.class === r.class)?.pct;
              return (
                <tr key={i}>
                  <td><input aria-label="Holder" value={r.holder} maxLength={120} onChange={(e) => set(i, { holder: e.target.value })} className="input min-w-[140px] py-1.5" placeholder="Name" /></td>
                  <td><select aria-label="Class" value={r.class} onChange={(e) => set(i, { class: e.target.value })} className="input py-1.5">{SHARE_CLASSES.map((c) => <option key={c}>{c}</option>)}</select></td>
                  <td><input aria-label="Shares" type="number" min={0} value={r.shares || ""} onChange={(e) => set(i, { shares: Math.max(0, Math.floor(Number(e.target.value))) })} className="input num w-32 py-1.5" /></td>
                  <td><input aria-label="Options" type="number" min={0} value={r.options || ""} onChange={(e) => set(i, { options: Math.max(0, Math.floor(Number(e.target.value))) })} className="input num w-28 py-1.5" /></td>
                  <td className="n">{pct != null ? `${pct.toFixed(1)}%` : "—"}</td>
                  <td><button type="button" onClick={() => setRows((x) => x.filter((_, j) => j !== i))} className="btn-ghost btn-sm text-danger" aria-label={`Remove ${r.holder || "row"}`}>×</button></td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setRows((r) => (r.length >= 100 ? r : [...r, { holder: "", class: "Common", shares: 0, options: 0 }]))} className="btn-secondary btn-sm">Add holder</button>
          <form action={action} className="flex items-center gap-2">
            <input type="hidden" name="entries" value={JSON.stringify(rows)} />
            <button className="btn-primary btn-sm" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
          </form>
          <button type="button" onClick={download} className="btn-ghost btn-sm" disabled={!summary.rows.length}>Export CSV</button>
          {state?.ok && <span className="pill-success" role="status">Saved</span>}
          {state?.error && <span className="error" role="alert">{state.error}</span>}
        </div>
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="h-48 w-48 rounded-full" role="img" aria-label="Ownership chart" style={{ background: summary.rows.length ? `conic-gradient(${stops.join(", ")})` : "rgb(var(--c-muted))" }} />
        <span className="num text-sm text-subtle">{summary.fullyDiluted.toLocaleString("en-CA")} shares fully diluted</span>
        <ul className="flex w-full flex-col gap-1 text-sm">
          {summary.rows.map((r, i) => (
            <li key={`${r.holder}-${r.class}`} className="flex items-center justify-between gap-2"><span className="flex items-center gap-2"><i className="h-3 w-3 rounded-sm" style={{ background: color(i) }} />{r.holder}</span><span className="num">{r.pct.toFixed(1)}%</span></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
