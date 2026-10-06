import Link from "next/link";
import type { ProgramRow } from "@/lib/programs/types";
import { programStatus } from "@/lib/programs/queries";
import { Countdown } from "@/components/local-time";

export function FeaturedGrantCard({ p }: { p: ProgramRow }) {
  const status = programStatus(p);
  const amount = p.content?.keyNumbers?.[0];
  return (
    <article className="card flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="pill-info">{p.badge}</span>
        {p.close_at && !status.closed ? <Countdown to={p.close_at} label="Closes in" /> : <span className={status.closed ? "pill-warning" : "pill-success"}>{status.text.split("·")[0]}</span>}
      </div>
      <h3 className="text-xl font-bold">{p.headline}</h3>
      {amount && <p className="text-2xl font-extrabold text-ink"><span className="num">{amount.value}</span> <span className="text-sm font-medium text-subtle">{amount.label}</span></p>}
      <p className="text-sm text-subtle">{p.summary}</p>
      <p className="text-[13px] font-medium text-body">{status.text}</p>
      <Link href={`/grants/${p.slug}`} className="btn-primary mt-auto self-start">See if you qualify</Link>
    </article>
  );
}
