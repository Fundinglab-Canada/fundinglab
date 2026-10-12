import { requireBusinessContext } from "@/lib/auth";
import { hasFeature } from "@/lib/plans";
import { FundingCalculators } from "@/components/app/funding-calculators";
import { UpgradeCard } from "@/components/app/upgrade-card";

export const metadata = { title: "Funding calculators" };

export default async function CalculatorsPage() {
  const { business, plan } = await requireBusinessContext("/app/calculators");
  return (
    <section className="container flex flex-col gap-6 py-10">
      <div>
        <span className="eyebrow">Calculators</span>
        <h1 className="mt-1 text-3xl font-bold">Run the numbers before you raise</h1>
        <p className="max-w-measure text-subtle">Dilution, loan payments and debt coverage, grant cost share and runway. Every field explains itself; results are estimates, not financial advice.</p>
      </div>
      {hasFeature(plan, "calculators") ? (
        <FundingCalculators defaults={{ amount: Number(business.amount_sought ?? 0), costShare: 50 }} />
      ) : (
        <UpgradeCard feature="calculators" title="Funding calculators are part of Starter">
          Model dilution, loan payments, DSCR, grant cost share and runway with your own numbers.
        </UpgradeCard>
      )}
    </section>
  );
}
