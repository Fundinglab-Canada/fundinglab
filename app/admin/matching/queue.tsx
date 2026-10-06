import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { industryLabel, partnerTypeLabel, stageName } from "@/lib/constants";
import { money } from "@/lib/format";
import { approveMatch, dismissMatch } from "../actions";

/** Cross-business review queue: partner interest first, then the strongest engine suggestions. */
export async function MatchQueue() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select("id, score, reasons, source, created_at, businesses(id, name, stage, industry, province, amount_sought, consent_matching), partners(display_name, type)")
    .eq("status", "suggested")
    .order("created_at", { ascending: false })
    .limit(300);
  const rows = (data ?? []).sort((a, b) => Number(b.source === "partner_interest") - Number(a.source === "partner_interest") || b.score - a.score).slice(0, 100);
  return (
    <>
      <div className="flex items-end justify-between"><h1 className="text-3xl font-bold">Review queue</h1><Link href="/admin/matching" className="btn-secondary btn-sm">By business</Link></div>
      <div className="card table-wrap p-2"><table className="table">
        <thead><tr><th>Business</th><th>Partner</th><th>Fit</th><th>Source</th><th className="text-right">Action</th></tr></thead>
        <tbody>
          {rows.map((m) => {
            const b = (Array.isArray(m.businesses) ? m.businesses[0] : m.businesses) as { id: string; name: string; stage: string; industry: string; province: string; amount_sought: number; consent_matching: boolean } | null;
            const p = (Array.isArray(m.partners) ? m.partners[0] : m.partners) as { display_name: string; type: string } | null;
            return (
              <tr key={m.id}>
                <td><Link href={`/admin/matching?b=${b?.id}`} className="font-semibold text-ink hover:underline">{b?.name}</Link>
                  <div className="text-[13px] text-subtle">{stageName(b?.stage)} · {industryLabel(b?.industry)} · {b?.province} · {money(b?.amount_sought, true)}</div></td>
                <td><b className="text-ink">{p?.display_name}</b><div className="text-[13px] text-subtle">{partnerTypeLabel(p?.type ?? "")}</div></td>
                <td className="num">{m.score || "—"}</td>
                <td>{m.source === "partner_interest" ? <span className="pill-highlight">Partner interest</span> : <span className="pill">Engine</span>}</td>
                <td className="whitespace-nowrap text-right">
                  <div className="flex justify-end gap-1">
                    <form action={approveMatch}><input type="hidden" name="match_id" value={m.id} /><button className="btn-primary btn-sm" disabled={!b?.consent_matching}>Approve intro</button></form>
                    <form action={dismissMatch}><input type="hidden" name="match_id" value={m.id} /><button className="btn-ghost btn-sm">Dismiss</button></form>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!rows.length && <p className="p-4 text-sm text-subtle">Queue is empty.</p>}</div>
    </>
  );
}
