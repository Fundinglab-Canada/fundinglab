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
  } else if (kind === "leads") {
    const { data } = await supabase.from("leads").select("id, kind, status, name, email, phone, business_name, city, score, result_band, source_page, created_at");
    rows = [["lead_id", "kind", "status", "name", "email", "phone", "business", "city", "score", "band", "source_page", "created_at"],
      ...(data ?? []).map((l) => [l.id, l.kind, l.status, l.name, l.email, l.phone, l.business_name, l.city, l.score, l.result_band, l.source_page, l.created_at])];
  } else if (kind === "applications") {
    const { data } = await supabase.from("job_applications").select("id, full_name, email, phone, city, province, status, rating, work_type, work_eligible, source, created_at, retain_until, jobs(title)");
    rows = [["application_id", "job", "name", "email", "phone", "city", "province", "status", "rating", "work_type", "work_eligible", "source", "created_at", "retain_until"],
      ...(data ?? []).map((a) => {
        const j = (Array.isArray(a.jobs) ? a.jobs[0] : a.jobs) as { title: string } | null;
        return [a.id, j?.title ?? "General", a.full_name, a.email, a.phone, a.city, a.province, a.status, a.rating, a.work_type, String(a.work_eligible), a.source, a.created_at, a.retain_until];
      })];
  } else if (kind === "webinar") {
    const session = new URL(_req.url).searchParams.get("session");
    let q = supabase.from("webinar_registrations").select("name, email, phone, business_name, stage, sms_opt_in, attended, source, created_at, webinar_sessions(starts_at)");
    if (session) q = q.eq("session_id", session);
    const { data } = await q;
    rows = [["session_starts_at", "name", "email", "phone", "business", "stage", "sms_opt_in", "attended", "source", "registered_at"],
      ...(data ?? []).map((r) => {
        const s = (Array.isArray(r.webinar_sessions) ? r.webinar_sessions[0] : r.webinar_sessions) as { starts_at: string } | null;
        return [s?.starts_at ?? "", r.name, r.email, r.phone, r.business_name, r.stage, String(r.sms_opt_in), r.attended == null ? "" : String(r.attended), r.source, r.created_at];
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
