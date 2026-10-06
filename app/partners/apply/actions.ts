"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";
import { parsePartnerForm } from "@/lib/partners/save";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import type { PartnerFormState } from "@/components/partner-form";

export async function applyAsPartner(_prev: PartnerFormState, formData: FormData): Promise<PartnerFormState> {
  const { userId, profile } = await requireUser("/partners/apply");
  const parsed = parsePartnerForm(formData, true);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partners")
    .insert({ ...parsed.partner, user_id: userId, status: "pending" })
    .select("id")
    .single();
  if (error || !data) return { error: "We couldn't submit your application. You may already have one on file." };
  await supabase.from("partner_criteria").insert({ partner_id: data.id, ...parsed.criteria });

  // OAuth sign-ups default to the business role; switch to partner if this account has no business profile.
  if (profile.role === "business") {
    const admin = createAdminClient();
    const { count } = await admin.from("businesses").select("id", { count: "exact", head: true }).eq("owner_id", userId);
    if (!count) await admin.from("profiles").update({ role: "partner" }).eq("id", userId);
  }
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (to) await sendEmail({ to, subject: `New partner application: ${parsed.partner.display_name}`, text: `Review it: ${env.siteUrl()}/admin/partners` });
  redirect("/partner?applied=1");
}
