import Link from "next/link";
import { Icon } from "@/components/icons";
import { ClosingCta } from "@/components/cta";
import { FUNDING_PATHS, stageName } from "@/lib/constants";

export const metadata = { title: "The 7 funding paths", description: "Crowdfunding, angels, VC, private equity, grants, business loans and IPO/acquisition — who each suits and when." };

export default function FundingPathsPage() {
  return (
    <>
      <section className="container flex flex-col gap-6 py-14">
        <div className="max-w-measure">
          <span className="eyebrow">Funding paths</span>
          <h1 className="mt-2 text-4xl font-extrabold">Seven ways to fund a Canadian business</h1>
          <p className="mt-3 text-subtle">Each path suits a different stage. Most companies combine two or three — for example, a federal grant to de-risk R&amp;D alongside an angel round.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {FUNDING_PATHS.map((p) => (
            <Link key={p.id} href={`/funding-paths/${p.slug}`} className="card flex flex-col gap-2 hover:border-brand-text">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-soft text-brand-text"><Icon name={p.icon} /></span>
                <h2 className="text-xl font-bold">{p.name}</h2>
              </div>
              <p className="text-body">{p.who}</p>
              <div className="flex flex-wrap items-center gap-1">{p.stages.map((s) => <span key={s} className="pill">{stageName(s)}</span>)}<span className="num ml-auto text-sm text-subtle">{p.range}</span></div>
            </Link>
          ))}
        </div>
      </section>
      <ClosingCta secondary={{ href: "/assessment", label: "Not sure? Take the free Funding Check" }} />
    </>
  );
}
