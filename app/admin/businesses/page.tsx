import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { industryLabel, stageName } from "@/lib/constants";
import { dateShort, money } from "@/lib/format";

export const metadata = { title: "Businesses" };

export default async function BusinessesAdmin() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("id, name, stage, industry, province, amount_sought, readiness_score, profile_step, consent_matching, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  return (
    <>
      <div className="flex items-end justify-between"><h1 className="text-3xl font-bold">Businesses</h1><a href="/api/admin/export/businesses" className="btn-secondary btn-sm">Export CSV</a></div>
      <div className="card table-wrap p-2"><table className="table">
        <thead><tr><th>Business</th><th>Stage</th><th>Industry</th><th>Prov</th><th className="text-right">Seeking</th><th className="text-right">Readiness</th><th>Status</th><th>Joined</th></tr></thead>
        <tbody>
          {(data ?? []).map((b) => (
            <tr key={b.id}>
              <td><Link href={`/admin/matching?b=${b.id}`} className="font-semibold text-ink hover:underline">{b.name}</Link></td>
              <td>{stageName(b.stage)}</td>
              <td className="text-[13px]">{industryLabel(b.industry)}</td>
              <td>{b.province}</td>
              <td className="n">{money(b.amount_sought, true)}</td>
              <td className="n">{b.readiness_score}</td>
              <td>{b.profile_step <= 6 ? <span className="pill-warning">Profile step {Math.min(b.profile_step, 6)}/6</span> : b.consent_matching ? <span className="pill-success">Matchable</span> : <span className="pill">No consent</span>}</td>
              <td className="text-[13px]">{dateShort(b.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </>
  );
}
