import { redirect } from "next/navigation";
import { requireUser, getMyBusiness } from "@/lib/auth";
import { getOpenCohort, getSiteContent } from "@/lib/content";
import { money } from "@/lib/format";
import { EnrollForm } from "./enroll-form";

export const metadata = { title: "Enroll — Road to Funding" };

export default async function EnrollPage() {
  await requireUser("/road-to-funding/enroll");
  const cohort = await getOpenCohort();
  if (!cohort) redirect("/road-to-funding");
  const [business, refund] = await Promise.all([getMyBusiness(), getSiteContent("cohort_refund_policy", "Full refund up to 7 days before the first session.")]);
  return (
    <section className="container flex max-w-2xl flex-col gap-4 py-12">
      <span className="eyebrow">Road to Funding</span>
      <h1 className="text-3xl font-extrabold">Enroll in {cohort.name}</h1>
      <p className="text-subtle">{money(cohort.price_cad)} CAD + tax. {cohort.seats_left > 0 ? `${cohort.seats_left} seats left.` : "This cohort is full; you'll join the waitlist and won't be charged."}</p>
      <EnrollForm cohortId={cohort.id} full={cohort.seats_left <= 0} refund={refund}
        defaults={{ business_name: business?.name ?? "", stage: business?.stage ?? "", amount_sought: business?.amount_sought ?? null }} />
    </section>
  );
}
