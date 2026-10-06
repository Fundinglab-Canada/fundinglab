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

/** Scores every active partner for one business and upserts suggestions (keeps decisions already made). */
export async function recomputeSuggestions(formData: FormData) {
  const supabase = await admin();
  const businessId = z.string().uuid().parse(formData.get("business_id"));
  const [{ data: b }, { data: partners }, { data: existing }] = await Promise.all([
    supabase.from("businesses").select("stage, industry, province, amount_sought, use_of_funds").eq("id", businessId).single(),
    supabase.from("partners").select("id, type, partner_criteria(*)").eq("status", "active"),
    supabase.from("matches").select("partner_id, status").eq("business_id", businessId),
  ]);
  if (!b || !partners) return;
  const decided = new Set((existing ?? []).filter((m) => m.status !== "suggested").map((m) => m.partner_id));
  const candidates = partners.map((p) => {
    const c = (Array.isArray(p.partner_criteria) ? p.partner_criteria[0] : p.partner_criteria) ?? {};
    return {
      id: p.id as string, type: p.type as string,
      stages: c.stages ?? [], industries: c.industries ?? [], provinces: c.provinces ?? [],
      min_amount: c.min_amount ?? null, max_amount: c.max_amount ?? null, uses_of_funds: c.uses_of_funds ?? [],
    };
  });
  const ranked = rankPartners(
    { stage: b.stage, industry: b.industry, province: b.province, amount_sought: b.amount_sought, use_of_funds: b.use_of_funds ?? [] },
    candidates,
  ).filter((r) => !decided.has(r.partner.id));
  if (ranked.length) {
    await supabase.from("matches").upsert(
      ranked.map((r) => ({ business_id: businessId, partner_id: r.partner.id, score: r.score, reasons: r.reasons, status: "suggested" })),
      { onConflict: "business_id,partner_id" },
    );
  }
  revalidatePath("/admin/matches");
}

export async function approveMatch(formData: FormData) {
  const supabase = await admin();
  const { error } = await supabase.rpc("fl_approve_match", {
    p_match_id: z.string().uuid().parse(formData.get("match_id")),
    p_note: (formData.get("note") as string) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/matches");
  revalidatePath("/admin/pipeline");
}

export async function dismissMatch(formData: FormData) {
  const supabase = await admin();
  await supabase.from("matches").update({ status: "dismissed" }).eq("id", z.string().uuid().parse(formData.get("match_id")));
  revalidatePath("/admin/matches");
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
  await supabase.from("service_orders").update({ status }).eq("id", z.string().uuid().parse(formData.get("id")));
  revalidatePath("/admin/orders");
}
