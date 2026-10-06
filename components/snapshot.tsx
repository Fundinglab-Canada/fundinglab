import { BRAND, sourceLabel, stageName, useLabel } from "@/lib/constants";
import { industryText } from "@/lib/snapshot-summary";
import { money } from "@/lib/format";

export type SnapshotData = {
  name: string;
  website: string | null;
  industry: string | null;
  industry_other?: string | null;
  province: string | null;
  city: string | null;
  years_in_business: number | null;
  stage: string | null;
  amount_sought: number | null;
  timeline: string | null;
  use_of_funds: string[];
  hire_roles: string | null;
  annual_revenue: number | null;
  readiness_score: number;
  funding_history: { source: string; amount: number; year: number | null; program_name: string | null; department: string | null; loan_subtype: string | null }[];
  documents: string[];
  description?: string | null;
  revenue_12m?: number | null;
  growth_rate_pct?: number | null;
  customers?: number | null;
  employees?: number | null;
  key_metrics?: { label: string; value: string }[];
  team?: { name: string; role: string }[];
};

/** One-page investor snapshot. Shared by the owner preview and the public /b/[slug] link. Prints cleanly to PDF. */
export function InvestorSnapshot({ s, summary }: { s: SnapshotData; summary?: string[] }) {
  const raised = s.funding_history.reduce((t, h) => t + Number(h.amount), 0);
  const kv: [string, string][] = [
    ["Stage", stageName(s.stage)],
    ["Raising", s.amount_sought ? money(s.amount_sought) : "—"],
    ["Timeline", s.timeline ?? "—"],
    ["Raised to date", money(raised)],
    ["Revenue (12 mo)", s.revenue_12m != null ? money(s.revenue_12m) : s.annual_revenue ? money(s.annual_revenue) : "—"],
    ...(s.growth_rate_pct != null ? [["Growth", `${s.growth_rate_pct}% YoY`] as [string, string]] : []),
    ...(s.customers != null ? [["Customers", s.customers.toLocaleString("en-CA")] as [string, string]] : []),
    ["Readiness", `${s.readiness_score}/100`],
  ];
  return (
    <article className="mx-auto w-full max-w-[860px] overflow-hidden rounded-xl border border-line bg-surface print:border-0">
      <header className="flex flex-col gap-2 bg-navy p-5 text-white sm:p-7 print:bg-surface print:text-ink">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">Investor snapshot · Funding Lab</span>
        <h1 className="text-3xl font-bold text-white print:text-ink">{s.name}</h1>
        <span className="text-white/80 print:text-subtle">
          {industryText(s.industry, s.industry_other)} · {s.city}, {s.province}{s.years_in_business != null ? ` · ${s.years_in_business} years` : ""}{s.website ? ` · ${s.website}` : ""}
        </span>
      </header>
      <div className="grid gap-6 p-5 sm:p-7">
        {summary?.length ? (
          <section className="flex flex-col gap-2 rounded-lg bg-brand-soft p-4 sm:p-5" aria-labelledby="summary-title">
            <h2 id="summary-title" className="text-lg font-bold">Summary</h2>
            {summary.map((p, i) => <p key={i} className="text-body">{p}</p>)}
          </section>
        ) : s.description && <p className="text-body">{s.description}</p>}
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {kv.map(([k, v]) => (
            <div key={k} className="border-l-2 border-brand pl-3">
              <dt className="text-xs uppercase tracking-wider text-subtle">{k}</dt>
              <dd className="num text-lg font-medium text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">Use of funds</h2>
          <div className="flex flex-wrap gap-1.5">
            {s.use_of_funds.map((u) => (
              <span key={u} className="pill-success">{useLabel(u)}{u === "hire_staff" && s.hire_roles ? `: ${s.hire_roles}` : ""}</span>
            ))}
          </div>
        </div>
        {!!s.key_metrics?.length && (
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-bold">Key metrics</h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">{s.key_metrics.map((m) => <div key={m.label}><dt className="text-xs text-subtle">{m.label}</dt><dd className="num font-medium text-ink">{m.value}</dd></div>)}</dl>
          </div>
        )}
        {!!s.team?.length && (
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-bold">Leadership</h2>
            <ul className="grid gap-1 sm:grid-cols-2">{s.team.map((t) => <li key={t.name + t.role}><b className="text-ink">{t.name}</b> <span className="text-subtle">· {t.role}</span></li>)}</ul>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">Funding history</h2>
          <div className="table-wrap"><table className="table"><tbody>
            {s.funding_history.map((h, i) => (
              <tr key={i}>
                <td>{h.program_name ?? sourceLabel(h.source)}{h.department && <span className="block text-[13px] text-subtle">{h.department}</span>}</td>
                <td className="num">{h.year ?? "—"}</td>
                <td className="n">{money(h.amount)}</td>
              </tr>
            ))}
          </tbody></table></div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {([["pitch_deck", "Pitch deck"], ["financials", "Financials"], ["business_plan", "Business plan"]] as const).map(([k, l]) => (
            <span key={k} className={s.documents.includes(k) ? "pill-success" : "pill"}>{l}: {s.documents.includes(k) ? "available on request" : "not provided"}</span>
          ))}
        </div>
        <p className="text-[13px] text-subtle">Contact details are released through Funding Lab after both sides opt in. {BRAND.disclaimer}</p>
      </div>
    </article>
  );
}
