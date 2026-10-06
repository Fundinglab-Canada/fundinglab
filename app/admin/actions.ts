"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { rankPartners } from "@/lib/matching/score";
import { DEAL_STATUSES } from "@/lib/constants";
import { EMAIL_TEMPLATES, sendEmail } from "@/lib/email";

async function admin() {
  await requireRole("admin", "/admin");
  return createClient();
}

type Candidate = { id: string; type: string; stages: string[]; industries: string[]; provinces: string[]; min_amount: number | null; max_amount: number | null; uses_of_funds: string[] };

async function activeCandidates(supabase: Awaited<ReturnType<typeof createClient>>): Promise<Candidate[]> {
  const { data: partners } = await supabase.from("partners").select("id, type, partner_criteria(*)").eq("status", "active");
  return (partners ?? []).map((p) => {
    const c = (Array.isArray(p.partner_criteria) ? p.partner_criteria[0] : p.partner_criteria) ?? {};
    return {
      id: p.id as string, type: p.type as string,
      stages: c.stages ?? [], industries: c.industries ?? [], provinces: c.provinces ?? [],
      min_amount: c.min_amount ?? null, max_amount: c.max_amount ?? null, uses_of_funds: c.uses_of_funds ?? [],
    };
  });
}

/** Scores every active partner for one business and upserts suggestions (keeps decisions already made). */
async function scoreBusiness(supabase: Awaited<ReturnType<typeof createClient>>, businessId: string, candidates: Candidate[]) {
  const [{ data: b }, { data: existing }] = await Promise.all([
    supabase.from("businesses").select("stage, industry, province, amount_sought, use_of_funds, readiness_score, consent_matching").eq("id", businessId).single(),
    supabase.from("matches").select("partner_id, status, source").eq("business_id", businessId),
  ]);
  if (!b || !b.consent_matching) return 0;
  const keep = new Map((existing ?? []).map((m) => [m.partner_id, m]));
  const ranked = rankPartners(
    { stage: b.stage, industry: b.industry, province: b.province, amount_sought: b.amount_sought, use_of_funds: b.use_of_funds ?? [], readiness_score: b.readiness_score },
    candidates,
  ).filter((r) => r.score >= 40 && (!keep.has(r.partner.id) || keep.get(r.partner.id)!.status === "suggested"));
  if (ranked.length) {
    await supabase.from("matches").upsert(
      ranked.map((r) => ({
        business_id: businessId, partner_id: r.partner.id, score: r.score, reasons: r.reasons, score_breakdown: r.breakdown, status: "suggested",
        source: keep.get(r.partner.id)?.source ?? "engine",
      })),
      { onConflict: "business_id,partner_id" },
    );
  }
  return ranked.length;
}

export async function recomputeSuggestions(formData: FormData) {
  const supabase = await admin();
  const businessId = z.string().uuid().parse(formData.get("business_id"));
  await scoreBusiness(supabase, businessId, await activeCandidates(supabase));
  revalidatePath("/admin/matching");
}

/** Runs the engine for every business with matching consent. */
export async function recomputeAll() {
  const supabase = await admin();
  const candidates = await activeCandidates(supabase);
  const { data: list } = await supabase.from("businesses").select("id").eq("consent_matching", true).not("stage", "is", null).limit(1000);
  for (const b of list ?? []) await scoreBusiness(supabase, b.id, candidates);
  revalidatePath("/admin/matching");
}

export async function approveMatch(formData: FormData) {
  const supabase = await admin();
  const { error } = await supabase.rpc("fl_approve_match", {
    p_match_id: z.string().uuid().parse(formData.get("match_id")),
    p_note: (formData.get("note") as string) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/matching");
  revalidatePath("/admin/pipeline");
}

export async function dismissMatch(formData: FormData) {
  const supabase = await admin();
  await supabase.from("matches").update({ status: "dismissed" }).eq("id", z.string().uuid().parse(formData.get("match_id")));
  revalidatePath("/admin/matching");
}

const dealStatus = z.enum(DEAL_STATUSES.map((s) => s.id) as [string, ...string[]]);

export async function moveDeal(dealId: string, status: string, position: number) {
  const supabase = await admin();
  const s = dealStatus.parse(status);
  await supabase
    .from("deals")
    .update({ status: s, position, closed_at: ["funded", "closed_lost"].includes(s) ? new Date().toISOString() : null })
    .eq("id", z.string().uuid().parse(dealId));
  revalidatePath("/admin/pipeline");
}

export async function updateDealAmounts(formData: FormData) {
  const supabase = await admin();
  const id = z.string().uuid().parse(formData.get("id"));
  const funded = formData.get("funded_amount");
  const rate = formData.get("commission_rate");
  await supabase
    .from("deals")
    .update({
      funded_amount: funded ? Number(funded) : null,
      commission_rate: rate ? Math.min(1, Math.max(0, Number(rate) / 100)) : undefined,
    })
    .eq("id", id);
  revalidatePath("/admin/pipeline");
}

export async function setPartnerStatus(formData: FormData) {
  const supabase = await admin();
  const id = z.string().uuid().parse(formData.get("id"));
  const status = z.enum(["active", "declined", "suspended"]).parse(formData.get("status"));
  const { data: me } = await supabase.auth.getUser();
  const { data: p } = await supabase
    .from("partners")
    .update({ status, approved_by: status === "active" ? me.user?.id : null, approved_at: status === "active" ? new Date().toISOString() : null })
    .eq("id", id)
    .select("contact_email")
    .single();
  if (status === "active" && p?.contact_email) await sendEmail({ to: p.contact_email, ...EMAIL_TEMPLATES.partner_approved({}) });
  revalidatePath("/admin/partners");
}

export async function setOrderStatus(formData: FormData) {
  const supabase = await admin();
  const status = z.enum(["quote_requested", "quote_sent", "checkout_started", "paid", "in_progress", "delivered", "cancelled"]).parse(formData.get("status"));
  const quote = formData.get("quote_amount_cad");
  const partner = String(formData.get("assigned_partner_id") ?? "");
  await supabase.from("service_orders").update({
    status,
    quote_amount_cad: quote ? Number(quote) : null,
    assigned_partner_id: partner ? z.string().uuid().parse(partner) : null,
  }).eq("id", z.string().uuid().parse(formData.get("id")));
  revalidatePath("/admin/services");
}

const leadStatus = z.enum(["new", "contacted", "qualified", "converted", "closed"]);
export async function updateLead(formData: FormData) {
  const supabase = await admin();
  await supabase.from("leads").update({
    status: leadStatus.parse(formData.get("status")), admin_notes: String(formData.get("admin_notes") ?? "").slice(0, 2000) || null,
  }).eq("id", z.string().uuid().parse(formData.get("id")));
  revalidatePath("/admin/leads");
}

export async function updateMessage(formData: FormData) {
  const supabase = await admin();
  await supabase.from("contact_messages").update({
    status: z.enum(["new", "replied", "closed"]).parse(formData.get("status")), admin_notes: String(formData.get("admin_notes") ?? "").slice(0, 2000) || null,
  }).eq("id", z.string().uuid().parse(formData.get("id")));
  revalidatePath("/admin/messages");
}

export async function updateApplication(formData: FormData) {
  const supabase = await admin();
  const rating = Number(formData.get("rating"));
  await supabase.from("job_applications").update({
    status: z.enum(["new", "reviewing", "interview", "offer", "hired", "rejected", "withdrawn"]).parse(formData.get("status")),
    rating: rating >= 1 && rating <= 5 ? rating : null,
    admin_notes: String(formData.get("admin_notes") ?? "").slice(0, 2000) || null,
  }).eq("id", z.string().uuid().parse(formData.get("id")));
  revalidatePath("/admin/careers");
}

export async function saveSiteContent(formData: FormData) {
  const supabase = await admin();
  const key = z.string().regex(/^[a-z0-9_]{2,60}$/).parse(formData.get("key"));
  await supabase.from("site_content").upsert({ key, value: String(formData.get("value") ?? "").slice(0, 20000), updated_at: new Date().toISOString() });
  revalidatePath("/", "layout");
}

export async function setAttendance(formData: FormData) {
  const supabase = await admin();
  await supabase.from("cohort_attendance").upsert({
    session_id: z.string().uuid().parse(formData.get("session_id")),
    enrollment_id: z.string().uuid().parse(formData.get("enrollment_id")),
    attended: formData.get("attended") === "1",
  });
  revalidatePath("/admin/programs-education");
}

export async function setEnrollmentStatus(formData: FormData) {
  const supabase = await admin();
  await supabase.from("cohort_enrollments").update({
    status: z.enum(["pending_payment", "enrolled", "waitlisted", "refunded", "transferred", "completed", "cancelled"]).parse(formData.get("status")),
  }).eq("id", z.string().uuid().parse(formData.get("id")));
  revalidatePath("/admin/programs-education");
}

export async function ensureWebinarSessions() {
  const supabase = await admin();
  await supabase.rpc("fl_ensure_webinar_sessions", { p_weeks: 8 });
  revalidatePath("/admin/programs-education");
}

/** Uploads a guide PDF for a featured program to the private guides bucket. */
export async function uploadGuide(formData: FormData) {
  const supabase = await admin();
  const id = z.string().uuid().parse(formData.get("program_id"));
  const file = formData.get("file");
  if (!(file instanceof File) || file.type !== "application/pdf" || file.size > 15 * 1024 * 1024) throw new Error("Upload a PDF under 15 MB.");
  const { data: p } = await supabase.from("programs").select("slug").eq("id", id).single();
  const path = `${p?.slug ?? id}/${Date.now()}.pdf`;
  const { error } = await supabase.storage.from("guides").upload(path, file, { contentType: "application/pdf" });
  if (error) throw new Error(error.message);
  await supabase.from("programs").update({ guide_pdf_path: path }).eq("id", id);
  revalidatePath("/admin/programs");
}

export async function markVerified(formData: FormData) {
  const supabase = await admin();
  const { data: me } = await supabase.from("profiles").select("full_name, email").eq("id", (await supabase.auth.getUser()).data.user!.id).single();
  await supabase.from("programs").update({ last_verified_at: new Date().toISOString().slice(0, 10), verified_by: me?.full_name ?? me?.email ?? "admin" })
    .eq("id", z.string().uuid().parse(formData.get("id")));
  revalidatePath("/admin/programs");
}
