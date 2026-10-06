import { BRAND, industryLabel, sourceLabel, stageName, useLabel } from "@/lib/constants";
import { money } from "@/lib/format";

export type SnapshotData = {
  name: string;
  website: string | null;
  industry: string | null;
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
};

/** One-page investor snapshot. Shared by the owner preview and the public /b/[slug] link. Prints cleanly to PDF. */
export function InvestorSnapshot({ s }: { s: SnapshotData }) {
  const raised = s.funding_history.reduce((t, h) => t + Number(h.amount), 0);
  const kv: [string, string][] = [
    ["Stage", stageName(s.stage)],
    ["Raising", money(s.amount_sought)],
    ["Timeline", s.timeline ?? "—"],
    ["Raised to date", money(raised)],
    ["Annual revenue", s.annual_revenue ? money(s.annual_revenue) : "—"],
    ["Readiness", `${s.readiness_score}/100`],
  ];
  return (
    <article className="mx-auto w-full max-w-[860px] overflow-hidden rounded-xl border border-line bg-white print:border-0">
      <header className="flex flex-col gap-2 bg-navy p-7 text-white print:bg-white print:text-ink">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-leaf-onnavy">Investor snapshot</span>
        <h1 className="text-3xl font-bold text-white print:text-ink">{s.name}</h1>
        <span className="text-white/80 print:text-subtle">
          {industryLabel(s.industry)} · {s.city}, {s.province}{s.years_in_business != null ? ` · ${s.years_in_business} years` : ""}{s.website ? ` · ${s.website}` : ""}
        </span>
      </header>
      <div className="grid gap-6 p-7">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {kv.map(([k, v]) => (
            <div key={k} className="border-l-2 border-teal pl-3">
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
