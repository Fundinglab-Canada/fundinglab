"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyBusiness, requireUser } from "@/lib/auth";
import { sendEmail, teamInbox } from "@/lib/email";

export async function saveSettings(formData: FormData) {
  const { userId, profile } = await requireUser("/app/settings");
  const business = await getMyBusiness();
  const supabase = await createClient();
  const want = {
    matching: formData.get("matching") === "on",
    share_with_partners: formData.get("sharing") === "on",
    marketing: formData.get("marketing") === "on",
    sms: formData.get("sms") === "on",
  };
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40) || null;
  if (want.sms && !phone) redirect("/app/settings?error=Add%20a%20mobile%20number%20for%20SMS.");
  const now = new Date().toISOString();
  await supabase.from("profiles").update({ marketing_opt_in: want.marketing, sms_opt_in: want.sms, phone, full_name: String(formData.get("full_name") ?? profile.full_name ?? "").slice(0, 120) }).eq("id", userId);
  const log: { consent_type: string; granted: boolean }[] = [];
  if (want.marketing !== profile.marketing_opt_in) log.push({ consent_type: "marketing", granted: want.marketing });
  if (want.sms !== profile.sms_opt_in) log.push({ consent_type: "sms", granted: want.sms });
  if (business) {
    await supabase.from("businesses").update({
      consent_matching: want.matching, consent_matching_at: want.matching ? (business.consent_matching ? undefined : now) : null,
      consent_sharing: want.share_with_partners, consent_sharing_at: want.share_with_partners ? (business.consent_sharing ? undefined : now) : null,
      ...(want.share_with_partners ? {} : { visibility: business.visibility === "partners" ? "private" : business.visibility }),
    }).eq("id", business.id);
    if (want.matching !== business.consent_matching) log.push({ consent_type: "matching", granted: want.matching });
    if (want.share_with_partners !== business.consent_sharing) log.push({ consent_type: "share_with_partners", granted: want.share_with_partners });
  }
  if (log.length) await supabase.from("consents").insert(log.map((l) => ({ ...l, user_id: userId, business_id: business?.id ?? null })));
  revalidatePath("/app/settings");
  redirect("/app/settings?saved=1");
}

/** Permanently deletes the account, business profile, documents and history (PIPEDA right to delete). */
export async function deleteAccount(formData: FormData) {
  const { userId, profile } = await requireUser("/app/settings");
  if (formData.get("confirm") !== "DELETE") redirect("/app/settings?error=Type%20DELETE%20to%20confirm.");
  if (profile.role === "admin") redirect("/app/settings?error=Admin%20accounts%20can%27t%20be%20self-deleted.");
  const admin = createAdminClient();
  const { data: businesses } = await admin.from("businesses").select("id").eq("owner_id", userId);
  for (const b of businesses ?? []) {
    const { data: docs } = await admin.from("documents").select("storage_path").eq("business_id", b.id);
    if (docs?.length) await admin.storage.from("documents").remove(docs.map((d) => d.storage_path));
  }
  // Partner rows are kept for deal records but detached and suspended.
  await admin.from("partners").update({ status: "suspended", user_id: null }).eq("user_id", userId);
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) redirect("/app/settings?error=We%20couldn%27t%20delete%20your%20account.%20Contact%20the%20Funding%20Lab%20Team.");
  await sendEmail({ to: teamInbox(), subject: "Account deleted", text: `A user deleted their account (${profile.role}).` });
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
