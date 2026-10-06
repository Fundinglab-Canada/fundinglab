"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";
import { parsePartnerForm } from "@/lib/partners/save";
import { sendEmail, teamInbox } from "@/lib/email";
import { env } from "@/lib/env";
import type { PartnerFormState } from "@/components/partner-form";

export async function applyAsPartner(_prev: PartnerFormState, formData: FormData): Promise<PartnerFormState> {
  const { userId, profile } = await requireUser("/partners/join");
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
  await supabase.from("consents").insert({ user_id: userId, consent_type: "share_with_partners", granted: true });

  // OAuth sign-ups default to the business role; switch to partner if this account has no business profile.
  if (profile.role === "business") {
    const admin = createAdminClient();
    const { count } = await admin.from("businesses").select("id", { count: "exact", head: true }).eq("owner_id", userId);
    if (!count) await admin.from("profiles").update({ role: "partner" }).eq("id", userId);
  }
  await sendEmail({ to: teamInbox(), subject: `New partner application: ${parsed.partner.display_name}`, text: `Type: ${parsed.partner.type}\nReview it: ${env.siteUrl()}/admin/partners` });
  if (profile.email) await sendEmail({ to: profile.email, subject: "We received your Funding Lab partner application", text: "Thanks for applying. The Funding Lab Team reviews new partners within three business days. Your profile stays private until approved." });
  redirect("/partner?applied=1");
}
