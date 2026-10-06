"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { sendEmail, teamInbox } from "@/lib/email";
import { env } from "@/lib/env";

export async function expressInterest(formData: FormData) {
  await requireUser("/partner/deal-flow");
  const supabase = await createClient();
  const { error } = await supabase.rpc("fl_partner_express_interest", { p_ref: String(formData.get("ref")) });
  if (error) throw new Error(error.message);
  await sendEmail({ to: teamInbox(), subject: "Partner interest in an opportunity", text: `A partner expressed interest. Review: ${env.siteUrl()}/admin/matching` });
  revalidatePath("/partner/deal-flow");
}

export async function passOpportunity(formData: FormData) {
  await requireUser("/partner/deal-flow");
  const supabase = await createClient();
  await supabase.rpc("fl_partner_pass", { p_ref: String(formData.get("ref")) });
  revalidatePath("/partner/deal-flow");
}
