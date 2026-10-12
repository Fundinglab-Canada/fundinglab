import Link from "next/link";
import { requireBusinessContext } from "@/lib/auth";

export const metadata = { title: "Financial model" };

export default async function FinancialModelPage() {
  await requireBusinessContext("/app/prep/financial-model");
  return (
    <section className="container flex max-w-3xl flex-col gap-6 py-10">
      <Link href="/app/prep" className="text-sm text-subtle hover:underline">← Prep Studio</Link>
      <div>
        <span className="eyebrow">Financial model</span>
        <h1 className="mt-1 text-3xl font-bold">3-statement financial model</h1>
        <p className="max-w-measure text-subtle">An income statement, balance sheet and cash-flow statement for three years, monthly for year one. Lenders use it to test repayment; investors use it to test growth assumptions.</p>
      </div>
      <ol className="card flex list-decimal flex-col gap-2 pl-10 text-sm">
        <li>Download the template (CSV, opens in Excel, Numbers or Google Sheets).</li>
        <li>Fill in last year&apos;s actuals first, then your assumptions: price, volume, hiring plan, costs.</li>
        <li>Check that cash never goes negative without financing, and that the balance sheet balances.</li>
        <li>Upload the finished model to the <b>Financial</b> folder of your data room.</li>
      </ol>
      <div className="flex flex-wrap gap-2">
        <a href="/api/templates/financial-model" className="btn-primary">Download template</a>
        <Link href="/app/prep/data-room" className="btn-secondary">Upload to data room</Link>
        <Link href="/services/financial_model?from=prep" className="btn-ghost">Have an expert build it</Link>
      </div>
    </section>
  );
}
