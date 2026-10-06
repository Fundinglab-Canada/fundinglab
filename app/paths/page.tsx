import Link from "next/link";
import { Icon } from "@/components/icons";
import { FUNDING_PATHS, stageName } from "@/lib/constants";

export const metadata = { title: "Funding paths" };

export default function PathsPage() {
  return (
    <section className="container flex flex-col gap-6 py-14">
      <div className="max-w-measure">
        <span className="eyebrow">Funding paths</span>
        <h1 className="mt-2 text-4xl font-extrabold">Seven ways to fund a Canadian business</h1>
        <p className="mt-3 text-subtle">
          Each path suits a different stage. Most companies combine two or three, for example a federal grant to de-risk R&amp;D alongside an angel round.
        </p>
      </div>
      {FUNDING_PATHS.map((p) => (
        <article id={p.id} key={p.id} className="card grid scroll-mt-24 gap-5 md:grid-cols-[1fr_260px]">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-soft text-teal-text"><Icon name={p.icon} /></span>
              <h2 className="text-2xl font-bold">{p.name}</h2>
            </div>
            <p>{p.who}</p>
          </div>
          <dl className="flex flex-col gap-2 text-sm">
            <dt className="eyebrow text-subtle">Typical stage</dt>
            <dd className="flex flex-wrap gap-1">{p.stages.map((s) => <span key={s} className="pill-success">{stageName(s)}</span>)}</dd>
            <dt className="eyebrow mt-2 text-subtle">Typical size</dt>
            <dd className="num">{p.range}</dd>
          </dl>
        </article>
      ))}
      <Link href="/login?next=/profile" className="btn-primary self-start">See which paths fit you</Link>
    </section>
  );
}
