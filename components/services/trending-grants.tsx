import Link from "next/link";
import { TRENDING_BY_PROVINCE, TRENDING_NATIONAL, type TrendingGrant } from "@/content/trending-grants";

function GrantItem({ g }: { g: TrendingGrant }) {
  return (
    <li className="flex flex-col gap-0.5 border-t border-line pt-2 first:border-0 first:pt-0">
      {g.href ? <Link href={g.href} className="font-semibold text-brand-text underline">{g.name}</Link> : <b className="text-ink">{g.name}</b>}
      <span className="text-sm text-subtle">{g.summary}</span>
    </li>
  );
}

/** Province-by-province summary of programs Funding Lab clients are asking about. */
export function TrendingGrants() {
  return (
    <section className="flex flex-col gap-5" aria-labelledby="trending-title">
      <div>
        <span className="eyebrow">Trending grants in Canada</span>
        <h2 id="trending-title" className="mt-1 text-3xl font-bold">What businesses are applying for now</h2>
        <p className="mt-2 max-w-measure text-subtle">A quick summary by province. Intakes and rules change often, so always confirm with the official program — or ask us and we&apos;ll check for you.</p>
      </div>
      <div className="card flex flex-col gap-3">
        <h3 className="text-lg font-bold">Across Canada (federal)</h3>
        <ul className="grid gap-3 md:grid-cols-2">{TRENDING_NATIONAL.map((g) => <GrantItem key={g.name} g={g} />)}</ul>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {TRENDING_BY_PROVINCE.map((r) => (
          <details key={r.id} className="card group" open={r.id === "BC"}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-lg font-bold">
              {r.name}<span className="text-sm font-normal text-subtle group-open:hidden">{r.grants.length} programs ▾</span>
            </summary>
            <ul className="mt-3 flex flex-col gap-2">{r.grants.map((g) => <GrantItem key={g.name} g={g} />)}</ul>
          </details>
        ))}
      </div>
    </section>
  );
}
