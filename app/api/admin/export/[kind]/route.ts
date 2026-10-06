import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/format";

/** CSV export for admins. RLS plus an explicit role check. */
export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let rows: (string | number | null)[][];
  if (kind === "deals") {
    const { data } = await supabase.from("deals").select("id, deal_type, status, expected_amount, funded_amount, commission_rate, commission_amount, created_at, closed_at, businesses(name), partners(display_name)");
    rows = [["deal_id", "business", "partner", "type", "status", "expected_amount", "funded_amount", "commission_rate", "commission_amount", "created_at", "closed_at"],
      ...(data ?? []).map((d) => {
        const b = (Array.isArray(d.businesses) ? d.businesses[0] : d.businesses) as { name: string } | null;
        const p = (Array.isArray(d.partners) ? d.partners[0] : d.partners) as { display_name: string } | null;
        return [d.id, b?.name ?? "", p?.display_name ?? "", d.deal_type, d.status, d.expected_amount, d.funded_amount, d.commission_rate, d.commission_amount, d.created_at, d.closed_at];
      })];
  } else if (kind === "businesses") {
    const { data } = await supabase.from("businesses").select("id, name, stage, industry, province, city, amount_sought, readiness_score, consent_matching, created_at");
    rows = [["business_id", "name", "stage", "industry", "province", "city", "amount_sought", "readiness_score", "consent_matching", "created_at"],
      ...(data ?? []).map((b) => [b.id, b.name, b.stage, b.industry, b.province, b.city, b.amount_sought, b.readiness_score, String(b.consent_matching), b.created_at])];
  } else if (kind === "orders") {
    const { data } = await supabase.from("service_orders").select("id, kind, status, amount, currency, created_at, paid_at, businesses(name)");
    rows = [["order_id", "business", "service", "status", "amount", "currency", "created_at", "paid_at"],
      ...(data ?? []).map((o) => {
        const b = (Array.isArray(o.businesses) ? o.businesses[0] : o.businesses) as { name: string } | null;
        return [o.id, b?.name ?? "", o.kind, o.status, o.amount, o.currency, o.created_at, o.paid_at];
      })];
  } else {
    return NextResponse.json({ error: "Unknown export" }, { status: 404 });
  }

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="funding-lab-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
