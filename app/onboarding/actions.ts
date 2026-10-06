"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser, getMyBusiness } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { slugify } from "@/lib/format";
import { PROVINCES, STAGES } from "@/lib/constants";

const schema = z.object({
  role: z.enum(["business", "partner"]),
  full_name: z.string().trim().min(2, "Enter your name.").max(120),
  business_name: z.string().trim().max(160).optional(),
  stage: z.enum(STAGES.map((s) => s.id) as [string, ...string[]]).optional().or(z.literal("")),
  province: z.enum(PROVINCES).optional(),
  phone: z.string().trim().max(40).optional(),
  sms_opt_in: z.literal("on").optional(),
  marketing: z.literal("on").optional(),
});

export async function completeOnboarding(_prev: { error?: string } | undefined, formData: FormData): Promise<{ error?: string }> {
  const { userId, profile } = await requireUser("/onboarding");
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.sms_opt_in && !d.phone) return { error: "Add a mobile number for SMS reminders, or untick the box." };
  const supabase = await createClient();

  if (d.role === "business" && !d.business_name) return { error: "Enter your business name." };
  if (d.role === "business" && !(await getMyBusiness())) {
    const base = slugify(d.business_name!) || "business";
    const { error } = await supabase.from("businesses").insert({
      owner_id: userId, name: d.business_name!, slug: `${base}-${crypto.randomUUID().slice(0, 6)}`, stage: d.stage || null,
      province: d.province ?? "BC", contact_name: d.full_name, contact_email: profile.email, contact_phone: d.phone || null,
    });
    if (error) return { error: "We couldn't create your business profile. Try again." };
  }
  await supabase.from("profiles").update({
    full_name: d.full_name, phone: d.phone || null, sms_opt_in: !!d.sms_opt_in, marketing_opt_in: !!d.marketing, onboarded: true,
  }).eq("id", userId);
  await supabase.from("consents").insert([
    { user_id: userId, consent_type: "marketing", granted: !!d.marketing },
    ...(d.sms_opt_in ? [{ user_id: userId, consent_type: "sms", granted: true }] : []),
  ]);

  // Role changes are admin-only under RLS; a brand-new account with no business may switch itself to partner here.
  if (d.role === "partner" && profile.role === "business" && !(await getMyBusiness())) {
    await createAdminClient().from("profiles").update({ role: "partner" }).eq("id", userId);
  }
  const next = safeNext(formData.get("next"));
  if (d.role === "partner") redirect(next.startsWith("/partners/join") ? next : "/partners/join");
  redirect(next === "/app" ? "/app/profile?step=1" : next);
}
