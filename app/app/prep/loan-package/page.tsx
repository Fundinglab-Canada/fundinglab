import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessContext } from "@/lib/auth";
import { hasFeature } from "@/lib/plans";
import { LEGAL_STRUCTURES, industryLabel, sourceLabel, stageName, useLabel } from "@/lib/constants";
import { dateShort, money } from "@/lib/format";
import { capTableSummary, folderLabel, type CapEntry } from "@/lib/prep";
import { UpgradeCard } from "@/components/app/upgrade-card";
import { PrintButton } from "@/components/print-button";
import type { FundingHistoryRow } from "@/lib/types";

export const metadata = { title: "Loan package" };

const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="grid grid-cols-[180px_1fr] gap-3 border-b border-line py-1.5 text-sm"><dt className="text-subtle">{k}</dt><dd className="text-ink">{v || "—"}</dd></div>
);

/** Lender-ready summary (§7.5) generated from the profile, financials and use of funds. Print or save as PDF. */
export default async function LoanPackagePage() {
  const { business: b, plan } = await requireBusinessContext("/app/prep/loan-package");
  if (!hasFeature(plan, "loan_package")) {
    return (
      <section className="container flex max-w-4xl flex-col gap-6 py-10">
        <Link href="/app/prep" className="text-sm text-subtle hover:underline">← Prep Studio</Link>
        <UpgradeCard feature="loan_package" title="The lender-ready loan package is part of Starter">A clean summary of your business, financials, existing debt, ownership and use of funds, ready to send to a bank or credit union.</UpgradeCard>
      </section>
    );
  }
  const supabase = await createClient();
  const [{ data: history }, { data: cap }, { data: docs }] = await Promise.all([
    supabase.from("funding_history").select("*").eq("business_id", b.id).order("year", { ascending: false }),
    supabase.from("cap_tables").select("entries").eq("business_id", b.id).maybeSingle(),
    supabase.from("documents").select("file_name, folder").eq("business_id", b.id).order("folder"),
  ]);
  const hist = (history ?? []) as FundingHistoryRow[];
  const debt = hist.filter((h) => h.source === "business_loan" && h.status === "active");
  const owners = capTableSummary((cap?.entries ?? []) as CapEntry[]).rows.slice(0, 6);
  const missing = [
    !b.amount_sought && "funding amount",
    !b.use_of_funds.length && "use of funds",
    b.revenue_12m == null && b.annual_revenue == null && "revenue",
    !(docs ?? []).some((d) => d.folder === "financial") && "financial statements",
  ].filter(Boolean) as string[];

  return (
    <section className="container flex max-w-4xl flex-col gap-6 py-10">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/app/prep" className="text-sm text-subtle hover:underline">← Prep Studio</Link>
        <PrintButton label="Print / save as PDF" />
      </div>
      {missing.length > 0 && (
        <p className="no-print rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">Lenders will ask for: {missing.join(", ")}. <Link href="/app/profile" className="underline">Complete your profile</Link> to fill these in.</p>
      )}

      <article className="card flex flex-col gap-6 print:border-0 print:shadow-none">
        <header className="flex flex-col gap-1 border-b border-line pb-4">
          <span className="eyebrow">Loan application summary</span>
          <h1 className="text-3xl font-bold">{b.legal_name || b.name}</h1>
          <span className="text-sm text-subtle">Prepared {dateShort(new Date())} with Funding Lab</span>
        </header>

        <div><h2 className="mb-2 text-lg font-bold">The request</h2><dl>
          <Row k="Amount requested" v={b.amount_sought ? money(b.amount_sought) : null} />
          <Row k="Timeline" v={b.timeline} />
          <Row k="Use of funds" v={b.use_of_funds.map(useLabel).join(", ") + (b.hire_roles ? ` (roles: ${b.hire_roles})` : "") + (b.use_of_funds_other ? ` (${b.use_of_funds_other})` : "")} />
        </dl></div>

        <div><h2 className="mb-2 text-lg font-bold">The business</h2><dl>
          <Row k="Operating name" v={b.name} />
          <Row k="Legal structure" v={LEGAL_STRUCTURES.find((l) => l.id === b.legal_structure)?.label} />
          <Row k="Incorporated in" v={b.incorporation_province} />
          <Row k="Location" v={b.city ? `${b.city}, ${b.province}` : b.province} />
          <Row k="Industry" v={b.industry === "other" && b.industry_other ? b.industry_other : industryLabel(b.industry)} />
          <Row k="Years in business" v={b.years_in_business} />
          <Row k="Stage" v={stageName(b.stage)} />
          <Row k="Employees" v={b.employees} />
          <Row k="Website" v={b.website} />
          <Row k="Description" v={b.description} />
        </dl></div>

        <div><h2 className="mb-2 text-lg font-bold">Financial snapshot</h2><dl>
          <Row k="Revenue (last 12 months)" v={b.revenue_12m != null ? money(b.revenue_12m) : b.annual_revenue != null ? money(b.annual_revenue) : null} />
          <Row k="Growth rate" v={b.growth_rate_pct != null ? `${Number(b.growth_rate_pct)}%` : null} />
          <Row k="Customers" v={b.customers} />
          {b.key_metrics.map((m) => <Row key={m.label} k={m.label} v={m.value} />)}
        </dl></div>

        <div><h2 className="mb-2 text-lg font-bold">Existing financing</h2>
          {debt.length ? (
            <div className="table-wrap"><table className="table"><thead><tr><th>Lender</th><th>Type</th><th className="n">Amount</th><th>Year</th></tr></thead>
              <tbody>{debt.map((d) => <tr key={d.id}><td>{d.provider_name ?? "—"}</td><td>{sourceLabel(d.source)}</td><td className="n">{money(d.amount)}</td><td>{d.year ?? "—"}</td></tr>)}</tbody></table></div>
          ) : <p className="text-sm text-subtle">No active loans reported.</p>}
          {hist.length > debt.length && <p className="mt-2 text-sm text-subtle">Other funding received: {money(hist.filter((h) => !debt.includes(h)).reduce((s, h) => s + Number(h.amount), 0))} (grants, equity and repaid loans).</p>}
        </div>

        {owners.length > 0 && (
          <div><h2 className="mb-2 text-lg font-bold">Ownership</h2><dl>{owners.map((o) => <Row key={`${o.holder}-${o.class}`} k={o.holder} v={`${o.pct.toFixed(1)}% (${o.class})`} />)}</dl></div>
        )}

        <div><h2 className="mb-2 text-lg font-bold">Management</h2>
          {b.team.length ? <dl>{b.team.map((t) => <Row key={t.name} k={t.name} v={t.role} />)}</dl> : <p className="text-sm text-subtle">Add your team in Profile → Traction.</p>}
        </div>

        <div><h2 className="mb-2 text-lg font-bold">Supporting documents available</h2>
          {docs?.length ? <ul className="list-disc pl-5 text-sm">{docs.map((d) => <li key={d.file_name}>{d.file_name} <span className="text-subtle">({folderLabel(d.folder)})</span></li>)}</ul> : <p className="text-sm text-subtle">None uploaded yet.</p>}
        </div>

        <footer className="border-t border-line pt-3 text-[12px] text-subtle">
          Contact: {b.contact_name ?? "—"}{b.contact_email ? ` · ${b.contact_email}` : ""}{b.contact_phone ? ` · ${b.contact_phone}` : ""}. Figures are provided by the business and have not been audited by Funding Lab.
        </footer>
      </article>
      <p className="no-print text-sm text-subtle">Want a lender to see this? <Link href="/services/loan_consulting?from=loan_package" className="underline">Loan Consulting</Link> matches you with lenders and polishes the package.</p>
    </section>
  );
}
