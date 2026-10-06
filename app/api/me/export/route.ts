import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PIPEDA access request: everything the signed-in user can read about themselves, via their own RLS-scoped session.
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const uid = auth.user.id;
  const { data: businesses } = await supabase.from("businesses").select("*").eq("owner_id", uid);
  const ids = (businesses ?? []).map((b) => b.id);
  const byBiz = async (table: string) => (ids.length ? (await supabase.from(table).select("*").in("business_id", ids)).data : []);
  const [profile, consents, assessments, webinars, enrollments, orders, partner] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", uid).single(),
    supabase.from("consents").select("*").eq("user_id", uid),
    supabase.from("assessments").select("*").eq("user_id", uid),
    supabase.from("webinar_registrations").select("*").eq("user_id", uid),
    supabase.from("cohort_enrollments").select("*").eq("user_id", uid),
    supabase.from("service_orders").select("*").eq("requested_by", uid),
    supabase.from("partners").select("*, partner_criteria(*)").eq("user_id", uid),
  ]);
  const body = {
    exported_at: new Date().toISOString(),
    profile: profile.data, businesses, funding_history: await byBiz("funding_history"), documents: await byBiz("documents"),
    share_links: await byBiz("share_links"), consents: consents.data, assessments: assessments.data, webinar_registrations: webinars.data,
    cohort_enrollments: enrollments.data, service_orders: orders.data, partner: partner.data,
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="funding-lab-my-data.json"', "Cache-Control": "no-store" },
  });
}
