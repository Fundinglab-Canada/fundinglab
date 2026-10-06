import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyBusiness, requireUser } from "@/lib/auth";
import { FUNDING_PATHS, SERVICES, industryLabel, partnerTypeLabel, sourceLabel, stageName } from "@/lib/constants";
import { money } from "@/lib/format";
import { nextStep, readiness } from "@/lib/readiness";
import type { FundingHistoryRow, Introduction } from "@/lib/types";
import { JourneyBar, ReadinessGauge } from "@/components/journey";
import { respondToIntroduction } from "./actions";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { profile } = await requireUser("/dashboard");
  if (profile.role === "admin") redirect("/admin");
  if (profile.role === "partner") redirect("/partner");
  const business = await getMyBusiness();
  if (!business || !business.stage) redirect("/profile");
  const sp = await searchParams;

  const supabase = await createClient();
  const [{ data: historyData }, { data: docs }, { data: intros }, { data: pending }] = await Promise.all([
    supabase.from("funding_history").select("*").eq("business_id", business.id).order("year", { ascending: false }),
    supabase.from("documents").select("kind").eq("business_id", business.id),
    supabase.rpc("fl_my_introductions", { p_business_id: business.id }),
    supabase.rpc("fl_pending_match_count", { p_business_id: business.id }),
  ]);
  const history = (historyData ?? []) as FundingHistoryRow[];
  const introductions = (intros ?? []) as Introduction[];
  const docKinds = (docs ?? []).map((d) => d.kind as string);
  const r = readiness({
    stage: business.stage, years_in_business: business.years_in_business, annual_revenue: business.annual_revenue,
    documents: docKinds, funding_history_count: history.length,
    has_basics: !!(business.industry && business.amount_sought && business.use_of_funds.length),
  });
  const tip = nextStep(r.parts, docKinds);
  const recs = FUNDING_PATHS.filter((p) => (p.stages as readonly string[]).includes(business.stage!));
  const total = history.reduce((s, h) => s + Number(h.amount), 0);

  return (
    <section className="container flex flex-col gap-5 py-10">
      {sp.welcome && <p className="pill-success self-start px-4 py-2 text-sm">Profile complete. Funding Lab will review partner matches for you.</p>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Funding journey</span>
          <h1 className="mt-1 text-3xl font-bold">{business.name}</h1>
          <p className="text-sm text-subtle">
            {industryLabel(business.industry)} · {business.city}, {business.province} · seeking{" "}
            <b className="num text-ink">{money(business.amount_sought)}</b> in {business.timeline ?? "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/profile?step=1" className="btn-secondary">Edit profile</Link>
          <Link href="/snapshot" className="btn-primary">Investor snapshot</Link>
        </div>
      </div>

      <div className="card"><h2 className="mb-4 text-lg font-bold">Where you are</h2><JourneyBar stage={business.stage} /></div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card flex flex-col gap-4">
          <h2 className="text-lg font-bold">Funding Readiness Score</h2>
          <ReadinessGauge total={r.total} parts={r.parts} />
          {tip && <p className="text-sm text-subtle">{tip}</p>}
        </div>

        <div className="card flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Introductions</h2>
            <span className={introductions.length ? "pill-success" : "pill"}>{introductions.length} introduced</span>
          </div>
          <p className="text-sm">
            Funding Lab has introduced you to <b>{introductions.length}</b> partner{introductions.length === 1 ? "" : "s"}.
            {Number(pending) > 0 && <span className="text-subtle"> {Number(pending)} more under review.</span>}
          </p>
          {!business.consent_matching && (
            <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
              Matching is off. <Link href="/profile?step=5" className="underline">Turn on matching consent</Link> so we can introduce you.
            </p>
          )}
          <ul className="flex flex-col">
            {introductions.map((i) => (
              <li key={i.match_id} className="flex flex-col gap-2 border-t border-line py-3 first:border-0">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <b className="text-ink">{i.partner_name}</b>
                    <span className="block text-[13px] text-subtle">{partnerTypeLabel(i.partner_type)}{i.partner_location ? ` · ${i.partner_location}` : ""}</span>
                  </div>
                  <span className={i.status === "mutual" ? "pill-success" : "pill-warning"}>{i.status === "mutual" ? "Connected" : "Awaiting replies"}</span>
                </div>
                {i.partner_bio && <p className="text-[13px] text-subtle">{i.partner_bio}</p>}
                {i.status === "mutual" ? (
                  <p className="text-sm">
                    Contact: <b>{i.contact_person}</b> · <span className="num">{i.contact_email}</span>{i.contact_phone ? ` · ${i.contact_phone}` : ""}
                  </p>
                ) : i.business_opt_in === null ? (
                  <form action={respondToIntroduction} className="flex gap-2">
                    <input type="hidden" name="match_id" value={i.match_id} />
                    <button name="accept" value="yes" className="btn-primary btn-sm">Accept introduction</button>
                    <button name="accept" value="no" className="btn-secondary btn-sm">Decline</button>
                  </form>
                ) : (
                  <p className="text-[13px] text-subtle">You accepted. Contact details appear when the partner accepts too.</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card flex flex-col gap-4">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Recommended paths for the {stageName(business.stage)} stage</h2><Link href="/paths" className="btn-ghost btn-sm">All paths</Link></div>
        <div className="grid gap-4 md:grid-cols-3">
          {recs.map((p) => (
            <div key={p.id} className="flex flex-col gap-1 border-l-2 border-teal pl-3">
              <b className="text-ink">{p.name}</b><span className="text-sm text-subtle">{p.who}</span><span className="num text-sm">{p.range}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card flex flex-col gap-2">
          <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Funding history</h2><b className="num text-ink">{money(total)}</b></div>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Source</th><th>Year</th><th className="text-right">Amount</th></tr></thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{h.auto_found ? <>{h.program_name} <span className="pill-info">Federal grant</span></> : sourceLabel(h.source)}</td>
                  <td className="num">{h.year ?? "—"}</td>
                  <td className="n">{money(h.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
          {history.some((h) => h.auto_found) && <p className="help">Federal grants: Government of Canada Open Data (federal only).</p>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {SERVICES.map((s) => (
            <Link key={s.kind} href={`/services#${s.kind}`} className="card flex flex-col gap-1 hover:border-teal">
              <b className="text-ink">{s.name}</b><span className="text-[13px] text-subtle">{s.priceLabel}</span>
              <span className="mt-auto pt-2 text-sm font-semibold text-teal-text">Get a quote</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
