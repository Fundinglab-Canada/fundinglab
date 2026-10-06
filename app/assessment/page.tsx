import { getSessionProfile } from "@/lib/auth";
import { PILLARS } from "@/lib/assessment";
import { FUNDING_PATHS } from "@/lib/constants";
import { AssessmentWizard } from "@/components/assessment/wizard";
import { ClosingCta } from "@/components/cta";

export const metadata = {
  title: "Funding Readiness Assessment — free, 5 minutes",
  description: "Answer 21 quick questions and get your Funding Readiness Score, your biggest gaps, and the funding paths that fit today.",
};

export default async function AssessmentPage({ searchParams }: { searchParams: Promise<{ path?: string }> }) {
  const session = await getSessionProfile().catch(() => null);
  const slug = (await searchParams).path;
  const path = FUNDING_PATHS.find((p) => p.slug === slug);
  return (
    <>
      <section className="container grid items-start gap-8 py-10 md:py-14 lg:grid-cols-[.8fr_1.2fr]">
        <div className="flex flex-col gap-4">
          <span className="eyebrow">Funding Readiness Assessment</span>
          {path && <p className="pill-info self-start">Checking your fit for {path.name}</p>}
          <h1 className="text-3xl font-extrabold md:text-4xl">How ready are you to raise?</h1>
          <p className="text-lg text-body">21 questions, about 5 minutes. You get a score out of 100, your biggest gaps and how to fix them, and the funding paths that fit today.</p>
          <ul className="flex flex-col gap-1 text-sm text-subtle">
            {PILLARS.map((p) => <li key={p.id} className="flex justify-between border-b border-line py-1"><span>{p.label}</span><span className="num">{Math.round(p.weight * 100)}%</span></li>)}
          </ul>
          <p className="text-[13px] text-subtle">An indicator, not a guarantee of funding. Your answers stay private.</p>
        </div>
        <AssessmentWizard signedIn={!!session} />
      </section>
      <ClosingCta />
    </>
  );
}
