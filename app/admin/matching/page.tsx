import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { industryLabel, partnerTypeLabel, stageName, useLabel } from "@/lib/constants";
import { money } from "@/lib/format";
import { approveMatch, dismissMatch, recomputeAll, recomputeSuggestions } from "../actions";
import { MatchQueue } from "./queue";

export const metadata = { title: "Matching" };

export default async function MatchesPage({ searchParams }: { searchParams: Promise<{ b?: string; view?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  if (sp.view === "queue") return <MatchQueue />;
  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name, stage, industry, province, amount_sought, use_of_funds, consent_matching, readiness_score")
    .not("stage", "is", null)
    .order("readiness_score", { ascending: false })
    .limit(200);
  const list = businesses ?? [];
  const current = list.find((b) => b.id === sp.b) ?? list[0];
  const { data: matches } = current
    ? await supabase
        .from("matches")
        .select("id, score, reasons, score_breakdown, source, status, expires_at, business_opt_in, partner_opt_in, partners(display_name, type, location)")
        .eq("business_id", current.id)
        .neq("status", "dismissed")
        .order("score", { ascending: false })
    : { data: [] };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-3xl font-bold">Matching</h1>
          <p className="text-sm text-subtle">Score = stage 30 + industry 20 + geography 15 + ticket size 20 + use of funds 10 + readiness bonus 5. Approving notifies both sides; identities release only after both accept. Introductions expire after 14 days.</p></div>
        <div className="flex gap-2">
          <Link href="/admin/matching?view=queue" className="btn-secondary btn-sm">Review queue</Link>
          <form action={recomputeAll}><button className="btn-secondary btn-sm">Recompute all</button></form>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav className="card flex max-h-[70vh] flex-col overflow-y-auto p-2" aria-label="Businesses">
          {list.map((b) => (
            <Link key={b.id} href={`/admin/matching?b=${b.id}`} className={`rounded-md px-3 py-2 text-sm ${b.id === current?.id ? "bg-brand-soft font-semibold text-brand-text" : "hover:bg-muted"}`}>
              {b.name}<span className="num float-right text-subtle">{b.readiness_score}</span>
            </Link>
          ))}
        </nav>
        {current ? (
          <div className="flex min-w-0 flex-col gap-4">
            <div className="card flex flex-wrap items-center justify-between gap-3">
              <div><b className="text-ink">{current.name}</b>
                <p className="text-[13px] text-subtle">{stageName(current.stage)} · {industryLabel(current.industry)} · {current.province} · seeking {money(current.amount_sought)} · {(current.use_of_funds ?? []).map(useLabel).join(", ")}</p></div>
              <div className="flex items-center gap-2">
                <span className={current.consent_matching ? "pill-success" : "pill-danger"}>{current.consent_matching ? "Matching consent on file" : "No matching consent"}</span>
                <form action={recomputeSuggestions}><input type="hidden" name="business_id" value={current.id} /><button className="btn-secondary btn-sm">Recompute suggestions</button></form>
              </div>
            </div>
            <div className="card table-wrap p-2"><table className="table">
              <thead><tr><th>Partner</th><th>Fit</th><th>Why</th><th className="text-right">Action</th></tr></thead>
              <tbody>
                {(matches ?? []).map((m) => {
                  const p = (Array.isArray(m.partners) ? m.partners[0] : m.partners) as { display_name: string; type: string; location: string | null } | null;
                  return (
                    <tr key={m.id}>
                      <td><b className="text-ink">{p?.display_name}</b><div className="text-[13px] text-subtle">{partnerTypeLabel(p?.type ?? "")} · {p?.location}</div></td>
                      <td className="min-w-[140px]"><div className="flex items-center gap-2"><span className="num">{m.score}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded bg-muted"><i className={`block h-full ${m.score < 60 ? "bg-warning" : "bg-brand"}`} style={{ width: `${m.score}%` }} /></div></div></td>
                      <td className="text-[13px]">{m.source === "partner_interest" && <span className="pill-highlight m-0.5">Partner interest</span>}{(m.reasons ?? []).map((r: string) => <span key={r} className="pill m-0.5">{r}</span>)}
                        {m.score_breakdown && Object.keys(m.score_breakdown).length > 0 && <div className="num mt-1 text-[12px] text-subtle">{Object.entries(m.score_breakdown as Record<string, number>).map(([k, v]) => `${k} ${v}`).join(" · ")}</div>}</td>
                      <td className="whitespace-nowrap text-right">
                        {m.status === "suggested" ? (
                          <div className="flex justify-end gap-1">
                            <form action={approveMatch}><input type="hidden" name="match_id" value={m.id} />
                              <button className="btn-primary btn-sm" disabled={!current.consent_matching}>Approve intro</button></form>
                            <form action={dismissMatch}><input type="hidden" name="match_id" value={m.id} /><button className="btn-ghost btn-sm">Dismiss</button></form>
                          </div>
                        ) : (
                          <span className={m.status === "mutual" ? "pill-success" : m.status === "declined" || m.status === "expired" ? "pill-danger" : "pill-warning"}>
                            {m.status === "mutual" ? "Connected" : m.status === "declined" ? "Declined" : m.status === "expired" ? "Expired" : `Introduced · biz ${fmt(m.business_opt_in)} / partner ${fmt(m.partner_opt_in)}`}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!matches?.length && <p className="p-4 text-sm text-subtle">No suggestions yet. Select “Recompute suggestions”.</p>}
            </div>
          </div>
        ) : <p className="text-subtle">No completed business profiles yet.</p>}
      </div>
    </>
  );
}

const fmt = (v: boolean | null) => (v === null ? "waiting" : v ? "yes" : "no");
